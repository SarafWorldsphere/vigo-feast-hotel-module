from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from datetime import timezone, timedelta

try:
    from zoneinfo import ZoneInfo
    IST = ZoneInfo("Asia/Kolkata")
except Exception:
    # Fallback for environments without tzdata (e.g. bare Windows installs).
    # UTC+5:30 is equivalent to Asia/Kolkata.
    IST = timezone(timedelta(hours=5, minutes=30))

from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.menu_item import MenuItem
from app.services.financial_reporting import get_financial_summary

SUCCESS_STATUS = "DELIVERED"
REJECTED_STATUS = "REJECTED"


def _today_range():
    """
    Returns today's start and tomorrow's start in IST.
    PostgreSQL timestamptz will handle the timezone conversion correctly.
    """
    now = datetime.now(IST)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start, end


def _money(value) -> float:
    if value is None:
        return 0.0
    return float(value)


def get_dashboard(
    db: Session,
    restaurant_id: UUID,
):
    today_start, tomorrow_start = _today_range()
    yesterday_start = today_start - timedelta(days=1)

    # ============================================================
    # 1. TODAY'S ORDERS
    # ============================================================

    today_orders = (
        db.query(func.count(Order.order_id))
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.created_at >= today_start,
            Order.created_at < tomorrow_start,
        )
        .scalar()
        or 0
    )

    # ============================================================
    # 2. TODAY'S REVENUE
    # ============================================================

    # Today's reporting period (Asia/Kolkata boundaries)
    today_start, today_end = _today_range()
    today_financials = get_financial_summary(
        db=db,
        restaurant_id=restaurant_id,
        start=today_start,
        end=today_end,
    )
    gross_revenue = float(today_financials["gross_sales"])
    net_revenue = float(today_financials["net_earnings"])
    successful_orders = today_financials["delivered_orders"]
    average_order_value = (
        gross_revenue / successful_orders
        if successful_orders
        else 0.0
    )

    # ============================================================
    # 4. ACCEPTANCE & REJECTION COUNTS
    # ============================================================

    accepted_count = successful_orders  # already queried above

    rejected_count = (
        db.query(func.count(Order.order_id))
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.created_at >= today_start,
            Order.created_at < tomorrow_start,
            Order.order_status == REJECTED_STATUS,
        )
        .scalar()
        or 0
    )

    acceptance_denominator = accepted_count + rejected_count

    if acceptance_denominator > 0:
        acceptance_rate = (accepted_count / acceptance_denominator) * 100
    else:
        acceptance_rate = 0.0

    # ============================================================
    # 5. CANCELLATION RATE
    # ============================================================
    #
    # cancellation_status is currently NULL.
    # Returns 0 until cancellation_status is populated.
    # ============================================================

    cancellation_count = (
        db.query(func.count(Order.order_id))
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.created_at >= today_start,
            Order.created_at < tomorrow_start,
            Order.cancellation_status.isnot(None),
        )
        .scalar()
        or 0
    )

    if today_orders > 0:
        cancellation_rate = (cancellation_count / today_orders) * 100
    else:
        cancellation_rate = 0.0

    # ============================================================
    # 6. RATING
    # ============================================================
    #
    # Defaults to 0 until a Reviews table is connected.
    # ============================================================

    rating = 0.0

    # ============================================================
    # 7. AVERAGE PREPARATION TIME
    # ============================================================
    #
    # vgf_order_tracking has no event rows currently.
    # Returns None until tracking events are populated.
    # ============================================================

    average_preparation_time: Optional[float] = None

    # ============================================================
    # 8. YESTERDAY'S REVENUE
    # ============================================================

    yesterday_revenue = (
        db.query(
            func.coalesce(func.sum(Order.subtotal), 0)
        )
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.created_at >= yesterday_start,
            Order.created_at < today_start,
            Order.order_status == SUCCESS_STATUS,
        )
        .scalar()
        or 0
    )

    yesterday_revenue = _money(yesterday_revenue)

    # ============================================================
    # 9. SALES CHANGE PERCENTAGE
    # ============================================================

    if yesterday_revenue > 0:
        change_percentage = (
            (gross_revenue - yesterday_revenue) / yesterday_revenue
        ) * 100
    else:
        change_percentage = None

    # ============================================================
    # 10. HOURLY SALES TREND (9 AM – 9 PM)
    # ============================================================

    hourly_rows = (
        db.query(
            func.date_trunc("hour", Order.created_at).label("hour"),
            func.coalesce(func.sum(Order.subtotal), 0).label("revenue"),
        )
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.created_at >= today_start,
            Order.created_at < tomorrow_start,
            Order.order_status == SUCCESS_STATUS,
        )
        .group_by(func.date_trunc("hour", Order.created_at))
        .order_by(func.date_trunc("hour", Order.created_at))
        .all()
    )

    hourly_lookup = {
        row.hour.astimezone(IST).hour: _money(row.revenue)
        for row in hourly_rows
    }

    hourly_sales = []
    for hour in range(9, 22):
        revenue = hourly_lookup.get(hour, 0.0)
        if hour == 0:
            label = "12 AM"
        elif hour < 12:
            label = f"{hour} AM"
        elif hour == 12:
            label = "12 PM"
        else:
            label = f"{hour - 12} PM"
        hourly_sales.append({"hour": label, "revenue": revenue})

    # ============================================================
    # 11. ORDER PIPELINE
    # ============================================================

    pipeline_rows = (
        db.query(
            Order.order_status,
            func.count(Order.order_id).label("count"),
        )
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.created_at >= today_start,
            Order.created_at < tomorrow_start,
        )
        .group_by(Order.order_status)
        .all()
    )

    pipeline = {
        "new": 0,
        "preparing": 0,
        "ready": 0,
        "completed": 0,
        "rejected": 0,
    }

    for status, count in pipeline_rows:
        if status == "ORDERED":
            pipeline["new"] += count
        elif status in ("START_PREPARING", "PREPARING", "PREPARATION_COMPLETED"):
            pipeline["preparing"] += count
        elif status == "READY_FOR_PICKUP":
            pipeline["ready"] += count
        elif status == "DELIVERED":
            pipeline["completed"] += count
        elif status == "REJECTED":
            pipeline["rejected"] += count

    # ============================================================
    # 12. TOP SELLING ITEMS
    # Note: MenuItem PK is `id`, name field is `name`
    # ============================================================

    top_items = (
        db.query(
            MenuItem.id.label("item_id"),
            MenuItem.name.label("item_name"),
            func.coalesce(func.sum(OrderItem.quantity), 0).label("quantity_sold"),
            func.coalesce(func.sum(OrderItem.line_total), 0).label("revenue"),
        )
        .join(OrderItem, OrderItem.menu_item_id == MenuItem.id)
        .join(Order, Order.order_id == OrderItem.order_id)
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.created_at >= today_start,
            Order.created_at < tomorrow_start,
            Order.order_status == SUCCESS_STATUS,
        )
        .group_by(MenuItem.id, MenuItem.name)
        .order_by(func.sum(OrderItem.line_total).desc())
        .limit(5)
        .all()
    )

    top_selling_items = [
        {
            "item_id": str(row.item_id),
            "item_name": row.item_name,
            "quantity_sold": row.quantity_sold,
            "revenue": _money(row.revenue),
        }
        for row in top_items
    ]

    # ============================================================
    # FINAL RESPONSE
    # ============================================================

    return {
        "summary": {
            "today_orders": today_orders,
            "gross_revenue": round(gross_revenue, 2),
            "net_revenue": round(net_revenue, 2),
            "average_order_value": round(average_order_value, 2),
            "rating": rating,
            "average_preparation_time": average_preparation_time,
            "acceptance_rate": round(acceptance_rate, 2),
            "cancellation_rate": round(cancellation_rate, 2),
        },
        "sales_trend": {
            "today_revenue": round(gross_revenue, 2),
            "yesterday_revenue": round(yesterday_revenue, 2),
            "change_percentage": (
                round(change_percentage, 2)
                if change_percentage is not None
                else None
            ),
            "hourly": hourly_sales,
        },
        "order_pipeline": pipeline,
        "top_selling_items": top_selling_items,
    }
