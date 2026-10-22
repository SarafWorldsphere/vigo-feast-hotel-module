from datetime import date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.hotel_settlement import HotelSettlement
from app.models.order import Order
from app.models.refund import Refund
from app.models.settlement_batch import SettlementBatch
from app.models.settlement_batch_item import SettlementBatchItem
from app.services.financial_calculations import (
    ZERO,
    PLATFORM_COMMISSION_RATE,
    calculate_commission,
    calculate_commission_tax,
    round_money,
    to_decimal,
)

REPORTING_TIMEZONE = ZoneInfo("Asia/Kolkata")


def generate_settlement_batch(
    db: Session,
    restaurant_id,
    period_start: date,
    period_end: date,
    is_simulated: bool = False,
    status: str = "PENDING",
) -> SettlementBatch | None:
    """
    Generate a daily T+1 settlement batch for a restaurant and period.

    1. Find eligible, financially finalized DELIVERED orders for the restaurant
       and settlement period.
    2. Reuse or create their individual settlement records in vgf_hotel_settlements.
    3. Calculate the daily batch totals from those records.
    4. Create a SettlementBatch for that restaurant and period.
    5. Link the records using vgf_settlement_batch_items.
    6. Set settlement_date to the next day for daily T+1 cycle.
    """
    if period_end < period_start:
        raise ValueError("period_end must be on or after period_start.")

    # Check if a batch already exists for this restaurant and period
    existing_batch = (
        db.query(SettlementBatch)
        .filter(
            SettlementBatch.restaurant_id == restaurant_id,
            SettlementBatch.period_start == period_start,
            SettlementBatch.period_end == period_end,
        )
        .first()
    )
    if existing_batch:
        return existing_batch

    start_datetime = datetime.combine(
        period_start,
        time.min,
        tzinfo=REPORTING_TIMEZONE,
    )
    end_datetime = datetime.combine(
        period_end + timedelta(days=1),
        time.min,
        tzinfo=REPORTING_TIMEZONE,
    )

    # Subquery: order IDs already linked to any batch
    already_settled_order_ids = (
        db.query(HotelSettlement.order_id)
        .join(
            SettlementBatchItem,
            SettlementBatchItem.settlement_id == HotelSettlement.settlement_id,
        )
        .filter(HotelSettlement.restaurant_id == restaurant_id)
    )

    # 1. Find eligible, financially finalized DELIVERED orders
    eligible_orders = (
        db.query(Order)
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.order_status == "DELIVERED",
            Order.is_deleted.is_(False),
            Order.financial_finalized_at.is_not(None),
            Order.created_at >= start_datetime,
            Order.created_at < end_datetime,
            ~Order.order_id.in_(already_settled_order_ids),
        )
        .order_by(Order.order_id.asc())
        .all()
    )

    now = datetime.now(REPORTING_TIMEZONE)
    today = now.date()
    current_time = now.time()

    settlement_records: list[HotelSettlement] = []

    # 2. Reuse or create individual settlement records in vgf_hotel_settlements
    for order in eligible_orders:
        settlement = (
            db.query(HotelSettlement)
            .filter(
                HotelSettlement.order_id == order.order_id,
                HotelSettlement.is_deleted.is_(False),
            )
            .first()
        )

        if not settlement:
            gross = round_money(to_decimal(order.subtotal))
            gst = round_money(to_decimal(order.gst_amount))
            comm_rate = (
                to_decimal(order.commission_rate)
                if order.commission_rate is not None
                else PLATFORM_COMMISSION_RATE
            )
            comm_amt = (
                round_money(to_decimal(order.commission_amount))
                if order.commission_amount is not None
                else calculate_commission(gross)
            )
            comm_tax = (
                round_money(to_decimal(order.commission_tax_amount))
                if order.commission_tax_amount is not None
                else calculate_commission_tax(comm_amt)
            )
            rest_discount = round_money(
                to_decimal(order.restaurant_discount_amount)
            )
            other_fee = round_money(to_decimal(order.other_fee_amount))

            order_net = round_money(
                gross - rest_discount - comm_amt - comm_tax - other_fee
            )

            settlement = HotelSettlement(
                order_id=order.order_id,
                restaurant_id=order.restaurant_id,
                franchisee_id=order.franchisee_id,
                menu_value=gross,
                gst_amount=gst,
                commission_rate=comm_rate,
                commission_amount=comm_amt,
                net_amount=order_net,
                net_balance=order_net,
                hotel_amount=ZERO,
                rider_amount=ZERO,
                narayani_commission=ZERO,
                software_charge=ZERO,
                added_date=today,
                added_time=current_time,
                is_active=True,
                is_deleted=False,
            )
            db.add(settlement)
            db.flush()

        settlement_records.append(settlement)

    # Query completed refunds for the restaurant within the period
    refunds_total = (
        db.query(func.coalesce(func.sum(Refund.amount), 0))
        .join(Order, Refund.order_id == Order.order_id)
        .filter(
            Order.restaurant_id == restaurant_id,
            Order.order_status == "DELIVERED",
            Order.is_deleted.is_(False),
            Order.financial_finalized_at.is_not(None),
            Refund.status == "COMPLETED",
            Refund.completed_at.is_not(None),
            Refund.completed_at >= start_datetime,
            Refund.completed_at < end_datetime,
        )
        .scalar()
    )
    total_refunds = round_money(to_decimal(refunds_total))

    # 3. Calculate daily batch totals from those records
    total_gross_sales = round_money(
        sum((to_decimal(o.subtotal) for o in eligible_orders), ZERO)
    )
    total_restaurant_discounts = round_money(
        sum(
            (to_decimal(o.restaurant_discount_amount) for o in eligible_orders),
            ZERO,
        )
    )
    total_commission = round_money(
        sum((to_decimal(s.commission_amount) for s in settlement_records), ZERO)
    )
    total_commission_tax = round_money(
        sum(
            (
                to_decimal(o.commission_tax_amount)
                for o in eligible_orders
                if o.commission_tax_amount is not None
            ),
            ZERO,
        )
    )
    total_other_fees = round_money(
        sum(
            (
                to_decimal(o.other_fee_amount)
                for o in eligible_orders
                if o.other_fee_amount is not None
            ),
            ZERO,
        )
    )
    adjustments = ZERO

    batch_net = round_money(
        total_gross_sales
        - total_restaurant_discounts
        - total_commission
        - total_commission_tax
        - total_other_fees
        - total_refunds
        + adjustments
    )

    # 6. Set settlement_date to the next day for daily T+1 cycle
    settlement_date = period_end + timedelta(days=1)

    # 4. Create a SettlementBatch for that restaurant and period
    batch = SettlementBatch(
        restaurant_id=restaurant_id,
        period_start=period_start,
        period_end=period_end,
        settlement_date=settlement_date,
        total_orders=len(eligible_orders),
        gross_sales=total_gross_sales,
        restaurant_discounts=total_restaurant_discounts,
        commission=total_commission,
        commission_tax=total_commission_tax,
        other_fees=total_other_fees,
        refunds=total_refunds,
        adjustments=adjustments,
        net_amount=batch_net,
        status=status,
        is_simulated=is_simulated,
    )
    db.add(batch)
    db.flush()

    # 5. Link the records using vgf_settlement_batch_items
    for settlement in settlement_records:
        batch_item = SettlementBatchItem(
            batch_id=batch.batch_id,
            settlement_id=settlement.settlement_id,
        )
        db.add(batch_item)

    db.commit()
    db.refresh(batch)
    return batch


def get_settlement_history(
    db: Session,
    restaurant_id,
    limit: int = 20,
    offset: int = 0,
) -> dict:
    base_query = db.query(SettlementBatch).filter(
        SettlementBatch.restaurant_id == restaurant_id
    )

    total = base_query.count()

    settlements = (
        base_query
        .order_by(
            SettlementBatch.settlement_date.desc(),
            SettlementBatch.batch_id.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "settlements": [
            {
                "batch_id": batch.batch_id,
                "period_start": batch.period_start,
                "period_end": batch.period_end,
                "settlement_date": batch.settlement_date,
                "orders": batch.total_orders,
                "amount": batch.net_amount,
                "status": batch.status,
                "is_simulated": batch.is_simulated,
                "payout_reference": batch.payout_reference,
                "paid_at": batch.paid_at,
            }
            for batch in settlements
        ],
        "total": total,
    }

