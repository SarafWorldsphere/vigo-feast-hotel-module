import csv
from datetime import datetime
from decimal import Decimal
from io import StringIO

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.refund import Refund
from app.services.financial_calculations import to_decimal, round_money


ZERO = Decimal("0.00")


def get_financial_summary(
    db: Session,
    restaurant_id,
    start: datetime,
    end: datetime,
) -> dict:
    """
    Return financial totals for a restaurant and a half-open
    reporting period: start <= timestamp < end.

    Order sales are recognized using order.created_at.
    Refunds are recognized using refund.completed_at.

    Only delivered orders with finalized financial snapshots
    contribute to sales and earnings.
    """

    order_filters = [
        Order.restaurant_id == restaurant_id,
        Order.order_status == "DELIVERED",
        Order.is_deleted.is_(False),
        Order.created_at >= start,
        Order.created_at < end,
    ]

    finalized_filters = order_filters + [
        Order.financial_finalized_at.is_not(None),
    ]

    # Aggregate finalized order financials without joining refunds.
    totals = (
        db.query(
            func.count(Order.order_id).label("order_count"),
            func.coalesce(
                func.sum(Order.subtotal), 0
            ).label("gross_sales"),
            func.coalesce(
                func.sum(Order.restaurant_discount_amount), 0
            ).label("restaurant_discounts"),
            func.coalesce(
                func.sum(Order.commission_amount), 0
            ).label("commission"),
            func.coalesce(
                func.sum(Order.commission_tax_amount), 0
            ).label("commission_tax"),
            func.coalesce(
                func.sum(Order.other_fee_amount), 0
            ).label("other_fees"),
        )
        .filter(*finalized_filters)
        .one()
    )

    # Track delivered orders whose snapshots are still missing.
    unfinalized_orders = (
        db.query(func.count(Order.order_id))
        .filter(
            *order_filters,
            Order.financial_finalized_at.is_(None),
        )
        .scalar()
        or 0
    )

    # Aggregate completed refunds separately to avoid multiplying
    # order totals when an order has multiple refunds.
    refund_total = (
        db.query(
            func.coalesce(
                func.sum(Refund.amount), 0
            )
        )
        .join(Order, Refund.order_id == Order.order_id)
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.order_status == "DELIVERED",
            Order.is_deleted.is_(False),
            Order.financial_finalized_at.is_not(None),
            Refund.status == "COMPLETED",
            Refund.completed_at.is_not(None),
            Refund.completed_at >= start,
            Refund.completed_at < end,
        )
        .scalar()
    )

    gross_sales = round_money(to_decimal(totals.gross_sales))
    restaurant_discounts = round_money(
        to_decimal(totals.restaurant_discounts)
    )
    commission = round_money(to_decimal(totals.commission))
    commission_tax = round_money(
        to_decimal(totals.commission_tax)
    )
    other_fees = round_money(to_decimal(totals.other_fees))
    refunds = round_money(to_decimal(refund_total))

    # Adjustments are zero until an adjustment ledger is implemented.
    adjustments = ZERO

    net_earnings = round_money(
        gross_sales
        - restaurant_discounts
        - commission
        - commission_tax
        - other_fees
        - refunds
        + adjustments
    )

    return {
        "currency": "INR",
        "gross_sales": gross_sales,
        "restaurant_discounts": restaurant_discounts,
        "commission": commission,
        "commission_tax": commission_tax,
        "other_fees": other_fees,
        "refunds": refunds,
        "adjustments": adjustments,
        "net_earnings": net_earnings,
        "delivered_orders": totals.order_count,
        "unfinalized_delivered_orders": unfinalized_orders,
    }


def export_earnings_csv(
    db: Session,
    restaurant_id,
    start: datetime,
    end: datetime,
) -> str:
    output = StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Order ID",
        "Order Date",
        "Gross Sales",
        "Restaurant Discounts",
        "Commission",
        "Commission Tax",
        "Other Fees",
        "Net Earnings Before Refunds",
        "Currency",
    ])

    orders = (
        db.query(Order)
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.order_status == "DELIVERED",
            Order.is_deleted.is_(False),
            Order.financial_finalized_at.is_not(None),
            Order.created_at >= start,
            Order.created_at < end,
        )
        .order_by(Order.created_at.asc(), Order.order_id.asc())
        .all()
    )

    for order in orders:
        gross = round_money(to_decimal(order.subtotal))
        discounts = round_money(
            to_decimal(order.restaurant_discount_amount)
        )
        commission = round_money(to_decimal(order.commission_amount))
        commission_tax = round_money(
            to_decimal(order.commission_tax_amount)
        )
        other_fees = round_money(to_decimal(order.other_fee_amount))

        net = round_money(
            gross - discounts - commission - commission_tax - other_fees
        )

        writer.writerow([
            order.order_id,
            order.created_at.isoformat() if order.created_at else "",
            gross,
            discounts,
            commission,
            commission_tax,
            other_fees,
            net,
            "INR",
        ])

    return output.getvalue()


