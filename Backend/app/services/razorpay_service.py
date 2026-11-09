"""Small, synchronous Razorpay gateway adapter.

Keeping HTTP and response mapping here makes the service layer testable and
prevents gateway credentials from ever reaching an API response.
"""
import logging
import os
from decimal import Decimal, ROUND_HALF_UP

try:  # Keep non-gateway unit tests importable before optional deps are installed.
    import requests
except ImportError:  # pragma: no cover - production installs requirements.txt
    requests = None

RAZORPAY_BASE_URL = "https://api.razorpay.com/v1"
REQUEST_TIMEOUT_SECONDS = 20
logger = logging.getLogger(__name__)


class RazorpayAmbiguousError(RuntimeError):
    """The request may have reached Razorpay; reconcile before retrying."""


class RazorpayGatewayError(RuntimeError):
    """A confirmed gateway rejection which is safe to mark failed."""


def rupees_to_paise(amount: Decimal) -> int:
    value = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    paise = int((value * 100).to_integral_exact())
    if paise < 100:
        raise ValueError("Minimum Razorpay refund amount is Rs. 1")
    return paise


def _auth() -> tuple[str, str]:
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        raise RuntimeError("Razorpay credentials are missing")
    return key_id, key_secret


def create_refund(payment_id: str, amount: Decimal, idempotency_key: str, receipt: str) -> dict:
    """Create a normal refund, retaining a stable receipt and idempotency key."""
    if requests is None:
        raise RuntimeError("requests dependency is not installed")
    try:
        response = requests.post(
            f"{RAZORPAY_BASE_URL}/payments/{payment_id}/refund",
            auth=_auth(),
            headers={"Content-Type": "application/json", "X-Refund-Idempotency": idempotency_key},
            json={
                "amount": rupees_to_paise(amount),
                "speed": "normal",
                "receipt": receipt,
                "notes": {"vigo_refund_key": idempotency_key, "vigo_refund_receipt": receipt},
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except (requests.Timeout, requests.ConnectionError) as exc:
        raise RazorpayAmbiguousError("Razorpay request outcome is unknown") from exc

    if response.status_code >= 500:
        raise RazorpayAmbiguousError("Razorpay returned a transient server error")
    if response.status_code >= 400:
        try:
            detail = response.json().get("error", {}).get("description")
        except ValueError:
            detail = response.text
        raise RazorpayGatewayError(detail or "Razorpay rejected the refund")
    try:
        return response.json()
    except ValueError as exc:
        raise RazorpayAmbiguousError("Razorpay returned an invalid response") from exc


def find_refund(payment_id: str, idempotency_key: str, receipt: str) -> dict | None:
    """Reconcile an ambiguous request without issuing a second refund."""
    if requests is None:
        return None
    try:
        response = requests.get(
            f"{RAZORPAY_BASE_URL}/payments/{payment_id}/refunds",
            auth=_auth(),
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.warning("Unable to reconcile Razorpay refund for payment %s", payment_id, exc_info=exc)
        return None

    for item in payload.get("items", payload.get("data", [])):
        notes = item.get("notes") or {}
        if item.get("receipt") == receipt or notes.get("vigo_refund_key") == idempotency_key:
            return item
    return None


def map_refund_status(status: str | None) -> str:
    value = (status or "").lower()
    if value in {"processed", "completed"}:
        return "COMPLETED"
    if value in {"failed", "rejected"}:
        return "FAILED"
    return "PROCESSING"
