from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.restaurant import Restaurant
from app.schemas.order import OrderCreate
from app.services.restaurant_hours import get_restaurant_availability


def create_customer_order(
    db: Session,
    payload: OrderCreate,
    as_of: datetime | None = None,
) -> Order:
    """
    Authoritative order creation service.
    Enforces restaurant online-ordering availability before creating a new order.
    Rejects with HTTP 409 if the restaurant is outside operating or online-ordering
    hours, paused, or closed by special-date override.
    """
    restaurant = (
        db.query(Restaurant)
        .filter(
            Restaurant.id == payload.restaurant_id,
            Restaurant.is_deleted.is_(False),
        )
        .first()
    )
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    # Authoritative availability check
    availability = get_restaurant_availability(
        db, payload.restaurant_id, as_of=as_of
    )
    if not availability["is_accepting_orders"]:
        reason = availability.get("reason", "OUTSIDE_ORDERING_HOURS")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Restaurant is currently not accepting orders: {reason}",
        )

    # Compute items and financial amounts
    subtotal = Decimal("0")
    order_items_to_create = []

    for item_in in payload.items:
        menu_item = (
            db.query(MenuItem)
            .filter(
                MenuItem.id == item_in.menu_item_id,
                MenuItem.restaurant_id == payload.restaurant_id,
                MenuItem.is_deleted.is_(False),
            )
            .first()
        )
        unit_price = item_in.unit_price or (menu_item.base_price if menu_item else Decimal("0"))
        line_total = Decimal(str(unit_price)) * Decimal(str(item_in.quantity))
        subtotal += line_total
        order_items_to_create.append({
            "menu_item_id": item_in.menu_item_id,
            "quantity": item_in.quantity,
            "unit_price": unit_price,
            "line_total": line_total,
        })

    subtotal_val = payload.subtotal if payload.subtotal is not None else subtotal
    gst_amount_val = payload.gst_amount if payload.gst_amount is not None else (subtotal_val * Decimal("0.05"))
    delivery_charge_val = payload.delivery_charge if payload.delivery_charge is not None else Decimal("40.00")
    discount_amount_val = payload.discount_amount if payload.discount_amount is not None else Decimal("0")
    total_amount_val = payload.total_amount if payload.total_amount is not None else (
        subtotal_val + gst_amount_val + delivery_charge_val - discount_amount_val
    )

    new_order = Order(
        customer_id=payload.customer_id,
        restaurant_id=payload.restaurant_id,
        order_status="ORDERED",
        subtotal=subtotal_val,
        gst_amount=gst_amount_val,
        delivery_charge=delivery_charge_val,
        discount_amount=discount_amount_val,
        total_amount=total_amount_val,
        delivery_eta=payload.delivery_eta,
    )
    db.add(new_order)
    db.flush()

    for item_data in order_items_to_create:
        order_item = OrderItem(
            order_id=new_order.order_id,
            menu_item_id=item_data["menu_item_id"],
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            line_total=item_data["line_total"],
        )
        db.add(order_item)

    db.commit()
    db.refresh(new_order)
    return new_order
