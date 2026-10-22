from datetime import date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import case, func

from app.models.customer_feedback import CustomerFeedback
from app.models.menu_category import MenuCategory
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.order_tracking import OrderTracking

REPORTING_TIMEZONE = ZoneInfo("Asia/Kolkata")


def resolve_analytics_period(
    period: str = "today",
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Resolve an Analytics reporting period into local date boundaries."""

    today = datetime.now(REPORTING_TIMEZONE).date()

    if period == "custom":
        if start_date is None or end_date is None:
            raise ValueError(
                "Both start_date and end_date are required for custom period."
            )

        if end_date < start_date:
            raise ValueError(
                "end_date must be on or after start_date."
            )

        effective_start = start_date
        effective_end = end_date + timedelta(days=1)

    elif start_date is not None or end_date is not None:
        raise ValueError(
            "start_date and end_date can only be used with period=custom."
        )

    elif period == "today":
        effective_start = today
        effective_end = today + timedelta(days=1)

    elif period == "week":
        effective_start = today - timedelta(days=today.weekday())
        effective_end = effective_start + timedelta(days=7)

    elif period == "month":
        effective_start = today.replace(day=1)

        if today.month == 12:
            effective_end = date(today.year + 1, 1, 1)
        else:
            effective_end = date(today.year, today.month + 1, 1)

    else:
        raise ValueError(
            "period must be today, week, month, or custom."
        )

    start_datetime = datetime.combine(
        effective_start,
        time.min,
        tzinfo=REPORTING_TIMEZONE,
    )

    end_datetime = datetime.combine(
        effective_end,
        time.min,
        tzinfo=REPORTING_TIMEZONE,
    )

    return {
        "period": period,
        "start_date": effective_start,
        "end_date": effective_end - timedelta(days=1),
        "start_datetime": start_datetime,
        "end_datetime": end_datetime,
    }


def get_analytics_overview(
    db,
    restaurant_id,
    period_data: dict,
) -> dict:
    start = period_data["start_datetime"]
    end = period_data["end_datetime"]

    duration = end - start
    previous_start = start - duration
    previous_end = start

    accepted_statuses = (
        "ACCEPTED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "PICKED_UP",
        "DELIVERED",
    )
    final_decision_statuses = accepted_statuses + ("REJECTED",)

    def calculate_metrics(period_start, period_end):
        orders = db.query(Order).filter(
            Order.restaurant_id == restaurant_id,
            Order.is_deleted.is_(False),
            Order.created_at >= period_start,
            Order.created_at < period_end,
        )

        # Acceptance rate: accepted orders / orders with a decision.
        decided = orders.filter(
            Order.order_status.in_(final_decision_statuses)
        )
        decided_count = decided.count()

        accepted_count = orders.filter(
            Order.order_status.in_(accepted_statuses)
        ).count()

        acceptance_rate = (
            Decimal(accepted_count) * Decimal("100")
            / Decimal(decided_count)
            if decided_count else None
        )

        # Count explicit cancellation statuses only.
        cancelled_count = orders.filter(
            func.upper(Order.order_status).in_(
                ("CANCELLED", "CANCELED")
            )
        ).count()

        received_count = orders.count()

        cancellation_rate = (
            Decimal(cancelled_count) * Decimal("100")
            / Decimal(received_count)
            if received_count else None
        )

        # Match the Earnings page's eligible revenue rules.
        delivered = orders.filter(
            Order.order_status == "DELIVERED",
            Order.financial_finalized_at.is_not(None),
        )

        totals = delivered.with_entities(
            func.count(Order.order_id),
            func.coalesce(func.sum(Order.subtotal), 0),
        ).first()

        delivered_count = int(totals[0] or 0)
        gross_revenue = Decimal(str(totals[1] or 0))

        average_order_value = (
            gross_revenue / Decimal(delivered_count)
            if delivered_count else None
        )

        # Calculate elapsed preparation minutes from tracking events.
        event_rows = (
            db.query(
                OrderTracking.order_id,
                func.min(
                    case(
                        (
                            OrderTracking.event_type
                            == "START_PREPARING",
                            OrderTracking.event_time,
                        ),
                        else_=None,
                    )
                ).label("started_at"),
                func.min(
                    case(
                        (
                            OrderTracking.event_type
                            == "PREPARATION_COMPLETED",
                            OrderTracking.event_time,
                        ),
                        else_=None,
                    )
                ).label("completed_at"),
            )
            .join(
                Order,
                Order.order_id == OrderTracking.order_id,
            )
            .filter(
                Order.restaurant_id == restaurant_id,
                Order.is_deleted.is_(False),
                Order.created_at >= period_start,
                Order.created_at < period_end,
                OrderTracking.is_active.is_(True),
                OrderTracking.is_deleted.is_(False),
                OrderTracking.event_type.in_(
                    ("START_PREPARING", "PREPARATION_COMPLETED")
                ),
            )
            .group_by(OrderTracking.order_id)
            .all()
        )

        durations = []

        for row in event_rows:
            if row.started_at and row.completed_at:
                seconds = (
                    row.completed_at - row.started_at
                ).total_seconds()

                if seconds >= 0:
                    durations.append(
                        Decimal(str(seconds)) / Decimal("60")
                    )

        average_preparation_time = (
            sum(durations, Decimal("0")) / Decimal(len(durations))
            if durations else None
        )

        # Only restaurant feedback submitted during this period.
        rating = (
            db.query(func.avg(CustomerFeedback.rating))
            .filter(
                CustomerFeedback.restaurant_id == restaurant_id,
                CustomerFeedback.created_at >= period_start,
                CustomerFeedback.created_at < period_end,
                CustomerFeedback.is_active.is_(True),
                CustomerFeedback.is_deleted.is_(False),
            )
            .scalar()
        )

        return {
            "acceptance_rate": acceptance_rate,
            "cancellation_rate": cancellation_rate,
            "average_order_value": average_order_value,
            "average_preparation_time": average_preparation_time,
            # No confirmed expected-time target yet.
            "on_time_preparation_rate": None,
            # No reliable order-accuracy signal confirmed yet.
            "order_accuracy": None,
            "customer_rating": (
                Decimal(str(rating)) if rating is not None else None
            ),
            "gross_revenue": gross_revenue,
        }

    current = calculate_metrics(start, end)
    previous = calculate_metrics(previous_start, previous_end)

    def make_metric(value, previous_value):
        change_percent = None

        if value is not None and previous_value is not None:
            if previous_value != 0:
                change_percent = (
                    (value - previous_value)
                    / abs(previous_value)
                    * Decimal("100")
                )

        return {
            "value": value,
            "previous_value": previous_value,
            "change_percent": change_percent,
        }

    return {
        "period": period_data["period"],
        "start_date": period_data["start_date"],
        "end_date": period_data["end_date"],
        "currency": "INR",
        **{
            name: make_metric(current[name], previous[name])
            for name in current
        },
    }


def get_sales_trend(
    db,
    restaurant_id,
    period_data: dict,
) -> dict:
    start = period_data["start_datetime"]
    end = period_data["end_datetime"]
    period = period_data["period"]

    # Today and one-day custom periods use hourly buckets.
    hourly = (
        period == "today"
        or (
            period == "custom"
            and period_data["start_date"] == period_data["end_date"]
        )
    )

    if hourly:
        bucket_starts = []
        cursor = start

        while cursor < end:
            bucket_starts.append(cursor)
            cursor += timedelta(hours=1)
    else:
        bucket_starts = []
        cursor = start

        while cursor < end:
            bucket_starts.append(cursor)
            cursor += timedelta(days=1)

    points = []

    for bucket_start in bucket_starts:
        bucket_end = (
            bucket_start + timedelta(hours=1)
            if hourly
            else bucket_start + timedelta(days=1)
        )

        # Clamp the final bucket to the selected reporting period.
        bucket_end = min(bucket_end, end)

        order_filters = (
            Order.restaurant_id == restaurant_id,
            Order.is_deleted.is_(False),
            Order.created_at >= bucket_start,
            Order.created_at < bucket_end,
        )

        order_count = (
            db.query(func.count(Order.order_id))
            .filter(*order_filters)
            .scalar()
        ) or 0

        revenue = (
            db.query(func.coalesce(func.sum(Order.subtotal), 0))
            .filter(
                *order_filters,
                Order.order_status == "DELIVERED",
                Order.financial_finalized_at.is_not(None),
            )
            .scalar()
        )

        points.append({
            "bucket_start": bucket_start,
            "gross_revenue": Decimal(str(revenue or 0)),
            "orders": int(order_count),
        })

    return {
        "period": period,
        "start_date": period_data["start_date"],
        "end_date": period_data["end_date"],
        "currency": "INR",
        "points": points,
    }


def get_customer_breakdown(
    db,
    restaurant_id,
    period_data: dict,
) -> dict:
    start = period_data["start_datetime"]
    end = period_data["end_datetime"]

    # One row per customer who ordered from this restaurant
    # during the selected period.
    period_customers = (
        db.query(Order.customer_id)
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.is_deleted.is_(False),
            Order.created_at >= start,
            Order.created_at < end,
        )
        .distinct()
        .subquery()
    )

    total_customers = (
        db.query(func.count())
        .select_from(period_customers)
        .scalar()
        or 0
    )

    # A customer is new if their first non-deleted order from
    # this restaurant occurred during the selected period.
    first_order_dates = (
        db.query(
            Order.customer_id,
            func.min(Order.created_at).label("first_order_at"),
        )
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.is_deleted.is_(False),
        )
        .group_by(Order.customer_id)
        .subquery()
    )

    new_customers = (
        db.query(func.count())
        .select_from(first_order_dates)
        .filter(
            first_order_dates.c.first_order_at >= start,
            first_order_dates.c.first_order_at < end,
        )
        .scalar()
        or 0
    )

    returning_customers = max(
        total_customers - new_customers,
        0,
    )

    new_percent = (
        Decimal(new_customers) * Decimal("100")
        / Decimal(total_customers)
        if total_customers else Decimal("0")
    )

    returning_percent = (
        Decimal(returning_customers) * Decimal("100")
        / Decimal(total_customers)
        if total_customers else Decimal("0")
    )

    return {
        "period": period_data["period"],
        "start_date": period_data["start_date"],
        "end_date": period_data["end_date"],
        "total_customers": int(total_customers),
        "new_customers": int(new_customers),
        "returning_customers": int(returning_customers),
        "new_customer_percent": new_percent,
        "returning_customer_percent": returning_percent,
    }


def get_top_selling_items(
    db,
    restaurant_id,
    period_data: dict,
    limit: int = 5,
) -> dict:
    start = period_data["start_datetime"]
    end = period_data["end_datetime"]

    rows = (
        db.query(
            MenuItem.id.label("menu_item_id"),
            MenuItem.name.label("name"),
            MenuItem.image_url.label("image_url"),
            MenuCategory.name.label("category_name"),
            func.coalesce(func.sum(OrderItem.quantity), 0).label(
                "quantity_sold"
            ),
            func.count(func.distinct(Order.order_id)).label(
                "order_count"
            ),
            func.coalesce(func.sum(OrderItem.line_total), 0).label(
                "gross_revenue"
            ),
        )
        .join(OrderItem, OrderItem.menu_item_id == MenuItem.id)
        .join(Order, Order.order_id == OrderItem.order_id)
        .outerjoin(
            MenuCategory,
            MenuCategory.id == MenuItem.category_id,
        )
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.order_status == "DELIVERED",
            Order.financial_finalized_at.is_not(None),
            Order.is_deleted.is_(False),
            Order.created_at >= start,
            Order.created_at < end,
            OrderItem.is_active.is_(True),
            OrderItem.is_deleted.is_(False),
            MenuItem.restaurant_id == restaurant_id,
            MenuItem.is_active.is_(True),
            MenuItem.is_deleted.is_(False),
        )
        .group_by(
            MenuItem.id,
            MenuItem.name,
            MenuItem.image_url,
            MenuCategory.name,
        )
        .order_by(
            func.sum(OrderItem.quantity).desc(),
            func.sum(OrderItem.line_total).desc(),
        )
        .limit(limit)
        .all()
    )

    return {
        "period": period_data["period"],
        "start_date": period_data["start_date"],
        "end_date": period_data["end_date"],
        "items": [
            {
                "menu_item_id": str(row.menu_item_id),
                "name": row.name,
                "image_url": row.image_url,
                "category_name": row.category_name,
                "quantity_sold": int(row.quantity_sold),
                "order_count": int(row.order_count),
                "gross_revenue": Decimal(str(row.gross_revenue)),
            }
            for row in rows
        ],
    }


def get_highest_revenue_items(
    db,
    restaurant_id,
    period_data: dict,
    limit: int = 5,
) -> dict:
    start = period_data["start_datetime"]
    end = period_data["end_datetime"]

    rows = (
        db.query(
            MenuItem.id.label("menu_item_id"),
            MenuItem.name.label("name"),
            MenuItem.image_url.label("image_url"),
            MenuCategory.name.label("category_name"),
            func.coalesce(func.sum(OrderItem.quantity), 0).label(
                "quantity_sold"
            ),
            func.count(func.distinct(Order.order_id)).label(
                "order_count"
            ),
            func.coalesce(func.sum(OrderItem.line_total), 0).label(
                "gross_revenue"
            ),
        )
        .join(OrderItem, OrderItem.menu_item_id == MenuItem.id)
        .join(Order, Order.order_id == OrderItem.order_id)
        .outerjoin(
            MenuCategory,
            MenuCategory.id == MenuItem.category_id,
        )
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.order_status == "DELIVERED",
            Order.financial_finalized_at.is_not(None),
            Order.is_deleted.is_(False),
            Order.created_at >= start,
            Order.created_at < end,
            OrderItem.is_active.is_(True),
            OrderItem.is_deleted.is_(False),
            MenuItem.restaurant_id == restaurant_id,
            MenuItem.is_active.is_(True),
            MenuItem.is_deleted.is_(False),
        )
        .group_by(
            MenuItem.id,
            MenuItem.name,
            MenuItem.image_url,
            MenuCategory.name,
        )
        .order_by(
            func.sum(OrderItem.line_total).desc(),
            func.sum(OrderItem.quantity).desc(),
        )
        .limit(limit)
        .all()
    )

    return {
        "period": period_data["period"],
        "start_date": period_data["start_date"],
        "end_date": period_data["end_date"],
        "items": [
            {
                "menu_item_id": str(row.menu_item_id),
                "name": row.name,
                "image_url": row.image_url,
                "category_name": row.category_name,
                "quantity_sold": int(row.quantity_sold),
                "order_count": int(row.order_count),
                "gross_revenue": Decimal(str(row.gross_revenue)),
            }
            for row in rows
        ],
    }


def get_menu_performance(
    db,
    restaurant_id,
    period_data: dict,
) -> dict:
    start = period_data["start_datetime"]
    end = period_data["end_datetime"]

    # First select only eligible orders for this restaurant and period.
    eligible_orders = (
        db.query(
            Order.order_id.label("order_id"),
        )
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.order_status == "DELIVERED",
            Order.financial_finalized_at.is_not(None),
            Order.is_deleted.is_(False),
            Order.created_at >= start,
            Order.created_at < end,
        )
        .subquery()
    )

    # Aggregate order-item metrics only from eligible orders.
    item_sales = (
        db.query(
            OrderItem.menu_item_id.label("menu_item_id"),
            func.count(
                func.distinct(eligible_orders.c.order_id)
            ).label("orders"),
            func.coalesce(
                func.sum(OrderItem.line_total), 0
            ).label("gross_revenue"),
        )
        .join(
            eligible_orders,
            eligible_orders.c.order_id == OrderItem.order_id,
        )
        .filter(
            OrderItem.is_active.is_(True),
            OrderItem.is_deleted.is_(False),
        )
        .group_by(OrderItem.menu_item_id)
        .subquery()
    )

    rows = (
        db.query(
            MenuItem.id.label("menu_item_id"),
            MenuItem.name.label("name"),
            MenuCategory.name.label("category_name"),
            func.coalesce(item_sales.c.orders, 0).label("orders"),
            func.coalesce(
                item_sales.c.gross_revenue, 0
            ).label("gross_revenue"),
        )
        .outerjoin(
            MenuCategory,
            MenuCategory.id == MenuItem.category_id,
        )
        .outerjoin(
            item_sales,
            item_sales.c.menu_item_id == MenuItem.id,
        )
        .filter(
            MenuItem.restaurant_id == restaurant_id,
            MenuItem.is_active.is_(True),
            MenuItem.is_deleted.is_(False),
        )
        .order_by(
            func.coalesce(
                item_sales.c.gross_revenue, 0
            ).desc(),
            MenuItem.name.asc(),
        )
        .all()
    )

    total_revenue = sum(
        (Decimal(str(row.gross_revenue or 0)) for row in rows),
        Decimal("0"),
    )

    items = []

    for row in rows:
        revenue = Decimal(str(row.gross_revenue or 0))
        orders_count = int(row.orders or 0)

        if total_revenue == 0:
            label = "No Data"
        elif revenue / total_revenue >= Decimal("0.20"):
            label = "Top Performer"
        elif revenue > 0:
            label = "Average"
        else:
            label = "Low Performer"

        items.append({
            "menu_item_id": str(row.menu_item_id),
            "name": row.name,
            "category_name": row.category_name,
            "orders": orders_count,
            "gross_revenue": revenue,
            "rating": None,
            # No actual item-level preparation average is available.
            "average_preparation_minutes": None,
            "performance_label": label,
        })

    return {
        "period": period_data["period"],
        "start_date": period_data["start_date"],
        "end_date": period_data["end_date"],
        "items": items,
        "total": len(items),
    }






