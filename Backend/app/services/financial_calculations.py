from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from app.core.financial_config import (
    PLATFORM_COMMISSION_RATE,
    COMMISSION_TAX_RATE,
    RESTAURANT_DISCOUNT_SHARE,
    PLATFORM_DISCOUNT_SHARE,
    OTHER_RESTAURANT_FEE_PER_ORDER,
    DEMO_OFFER_DISCOUNT_RATE,
    DEMO_OFFER_MAX_DISCOUNT,
)

ZERO = Decimal("0.00")
ONE_HUNDRED = Decimal("100")
CENT = Decimal("0.01")


def to_decimal(value) -> Decimal:
    """Convert a numeric value to Decimal safely."""
    if value is None:
        return ZERO

    if isinstance(value, Decimal):
        return value

    return Decimal(str(value))


def round_money(value: Decimal) -> Decimal:
    """Round monetary amounts to two decimal places."""
    return to_decimal(value).quantize(
        CENT,
        rounding=ROUND_HALF_UP,
    )


def calculate_commission(gross_sales) -> Decimal:
    """Commission is calculated before discounts."""
    gross_sales = to_decimal(gross_sales)

    return round_money(
        gross_sales * PLATFORM_COMMISSION_RATE
    )


def calculate_commission_tax(commission) -> Decimal:
    """Demo tax applied to platform commission."""
    commission = to_decimal(commission)

    return round_money(
        commission * COMMISSION_TAX_RATE
    )


def calculate_discount_split(discount_amount) -> dict:
    """Split the recorded discount between restaurant and platform."""
    discount_amount = to_decimal(discount_amount)

    return {
        "restaurant_discount": round_money(
            discount_amount * RESTAURANT_DISCOUNT_SHARE
        ),
        "platform_discount": round_money(
            discount_amount * PLATFORM_DISCOUNT_SHARE
        ),
    }


def calculate_demo_offer_discount(food_subtotal) -> Decimal:
    """Calculate a demo promotional discount before order creation."""
    food_subtotal = max(to_decimal(food_subtotal), ZERO)

    discount = food_subtotal * DEMO_OFFER_DISCOUNT_RATE

    return round_money(
        min(discount, DEMO_OFFER_MAX_DISCOUNT)
    )


def calculate_order_financials(
    gross_sales,
    discount_amount=ZERO,
    refund_amount=ZERO,
    adjustment_amount=ZERO,
) -> dict:
    """
    Calculate demo restaurant earnings.

    Gross sales are before discounts.
    Commission is calculated before discounts.
    Refunds are assumed to be entirely restaurant-borne.
    """

    gross_sales = max(to_decimal(gross_sales), ZERO)
    discount_amount = max(to_decimal(discount_amount), ZERO)
    refund_amount = max(to_decimal(refund_amount), ZERO)
    adjustment_amount = to_decimal(adjustment_amount)

    discount_split = calculate_discount_split(discount_amount)

    restaurant_discount = discount_split["restaurant_discount"]
    platform_discount = discount_split["platform_discount"]

    commission = calculate_commission(gross_sales)
    commission_tax = calculate_commission_tax(commission)

    other_fees = round_money(
        OTHER_RESTAURANT_FEE_PER_ORDER
    )

    net_earnings = round_money(
        gross_sales
        - restaurant_discount
        - commission
        - commission_tax
        - other_fees
        - refund_amount
        + adjustment_amount
    )

    return {
        "gross_sales": round_money(gross_sales),
        "restaurant_discount": restaurant_discount,
        "platform_discount": platform_discount,
        "commission": commission,
        "commission_tax": commission_tax,
        "other_fees": other_fees,
        "refunds": round_money(refund_amount),
        "adjustments": round_money(adjustment_amount),
        "net_earnings": net_earnings,
    }


def finalize_order_financials(order) -> bool:
    """
    Save the financial snapshot for an order exactly once.

    The caller is responsible for committing the database transaction.
    Returns True when the snapshot is created, otherwise False.
    """
    if order.financial_finalized_at is not None:
        return False

    if order.order_status != "DELIVERED":
        return False

    gross_sales = max(to_decimal(order.subtotal), ZERO)
    discount_amount = max(
        to_decimal(order.discount_amount),
        ZERO,
    )

    discount_split = calculate_discount_split(discount_amount)

    commission = calculate_commission(gross_sales)
    commission_tax = calculate_commission_tax(commission)
    other_fees = round_money(OTHER_RESTAURANT_FEE_PER_ORDER)

    order.commission_rate = PLATFORM_COMMISSION_RATE
    order.commission_amount = commission

    order.commission_tax_rate = COMMISSION_TAX_RATE
    order.commission_tax_amount = commission_tax

    order.restaurant_discount_amount = (
        discount_split["restaurant_discount"]
    )
    order.platform_discount_amount = (
        discount_split["platform_discount"]
    )

    order.other_fee_amount = other_fees
    order.financial_finalized_at = datetime.now(timezone.utc)

    return True
