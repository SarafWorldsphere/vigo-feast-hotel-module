
import json
import logging
import os

logger = logging.getLogger(__name__)

import httpx


NIMBUS_API_URL = os.getenv(
    "NIMBUS_API_URL",
    "http://nimbusit.biz/api/SmsApi/SendSingleApi",
)

# Nimbus requires a separate endpoint for messages that contain Unicode
# characters (Hindi, Telugu, etc.).  Derive it from the base URL so that
# a custom NIMBUS_API_URL override is respected automatically.
NIMBUS_UNICODE_API_URL = os.getenv(
    "NIMBUS_UNICODE_API_URL",
    NIMBUS_API_URL.replace("SendSingleApi", "SendSingleUnicodeApi"),
)

# Languages whose message templates contain non-ASCII (Unicode) characters.
_UNICODE_LANGUAGES = {"hi", "te"}

OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "10"))

TEMPLATE_IDS = {
    "en": os.getenv("NIMBUS_TEMPLATE_ID_EN"),
    "hi": os.getenv("NIMBUS_TEMPLATE_ID_HI"),
    "te": os.getenv("NIMBUS_TEMPLATE_ID_TE"),
}

MESSAGES = {
    "en": (
        "Your mobile verification OTP is {otp} for VIGOFEAST. "
        "It is valid for 10 minutes. Do not share this OTP with anyone. "
        "- SARAF WORLDSPHERE AI SERVICES"
    ),
    "hi": (
        "आपका मोबाइल सत्यापन OTP {otp} VIGOFEAST के लिए है। "
        "यह 10 मिनट तक मान्य है। इस OTP को किसी के साथ साझा न करें। "
        "- SARAF WORLDSPHERE AI SERVICES"
    ),
    "te": (
        "మీ మొబైల్ ధృవీకరణ OTP {otp} VIGOFEAST కోసం. "
        "ఇది 10 నిమిషాల వరకు చెల్లుబాటు అవుతుంది. "
        "ఈ OTP ని ఎవరితోనూ పంచుకోవద్దు. "
        "- SARAF WORLDSPHERE AI SERVICES"
    ),
}


def validate_nimbus_response(raw_text: str) -> str:
    """Accept only recognized successful Nimbus response formats."""
    raw_text = raw_text.strip()
    if not raw_text:
        raise RuntimeError("Nimbus returned an empty response")

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        data = None

    if isinstance(data, dict):
        status_value = str(
            data.get("Status", data.get("status", ""))
        ).strip().lower()

        if status_value in {"success", "1", "true", "ok"}:
            return raw_text

        if status_value == "warning":
            logger.warning("Nimbus returned status 'warning': %s", raw_text)
            return raw_text

        nested_response = data.get("Response")
        description = (
            data.get("Description")
            or data.get("description")
            or data.get("message")
        )

        if not description and isinstance(nested_response, dict):
            description = nested_response.get("Message")

        if status_value in {"error", "failed", "failure"}:
            raise RuntimeError(
                f"Nimbus returned status {status_value}: "
                f"{description or 'No additional details provided'}"
            )

        raise RuntimeError(
            f"Nimbus returned an unrecognized status: "
            f"{status_value or 'missing'}"
        )

    if isinstance(data, list) and data and isinstance(data[0], dict):
        return validate_nimbus_response(json.dumps(data[0]))

    lower_text = raw_text.lower()
    error_signals = (
        "fail",
        "error",
        "invalid",
        "insufficient",
        "mismatch",
        "denied",
        "reject",
        "not found",
    )
    if any(sig in lower_text for sig in error_signals):
        raise RuntimeError(f"Nimbus SMS rejected: {raw_text}")

    return raw_text


async def send_otp_sms(
    phone: str,
    otp: str,
    language: str = "en",
) -> str:
    language = language.strip().lower()

    if language not in MESSAGES:
        raise ValueError("Language must be en, hi, or te")

    user_id = os.getenv("NIMBUS_USER_ID")
    password = os.getenv("NIMBUS_PASSWORD")
    sender_id = os.getenv("NIMBUS_SENDER_ID")
    entity_id = os.getenv("NIMBUS_ENTITY_ID")
    template_id = TEMPLATE_IDS[language]

    required_values = {
        "NIMBUS_USER_ID": user_id,
        "NIMBUS_PASSWORD": password,
        "NIMBUS_SENDER_ID": sender_id,
        "NIMBUS_ENTITY_ID": entity_id,
        f"NIMBUS_TEMPLATE_ID_{language.upper()}": template_id,
    }

    missing = [
        name for name, value in required_values.items()
        if not value
    ]

    if missing:
        raise RuntimeError(
            f"Missing Nimbus configuration: {', '.join(missing)}"
        )

    message = MESSAGES[language].format(otp=otp)

    params = {
        "UserID": user_id,
        "Password": password,
        "SenderID": sender_id,
        "Phno": phone,
        "Msg": message,
        "EntityID": entity_id,
        "TemplateID": template_id,
    }

    api_url = NIMBUS_UNICODE_API_URL if language in _UNICODE_LANGUAGES else NIMBUS_API_URL
    logger.debug("Sending OTP SMS via %s (language=%s)", api_url, language)

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(
            api_url,
            params=params,
        )
        response.raise_for_status()

    return validate_nimbus_response(response.text)
