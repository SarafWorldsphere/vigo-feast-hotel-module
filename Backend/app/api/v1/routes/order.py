from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.restaurant import Restaurant
from app.schemas.order import OrderItemResponse, OrderListResponse, OrderResponse

router = APIRouter()


@router.get("/orders", response_model=OrderListResponse)
def get_restaurant_orders(
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant = (
        db.query(Restaurant)
        .filter(
            Restaurant.owner_id == owner.id,
            Restaurant.is_deleted.is_(False),
        )
        .first()
    )

    if not restaurant:
        return OrderListResponse(orders=[], total=0)

    orders = (
        db.query(Order)
        .filter(
            Order.restaurant_id == restaurant.id,
            Order.is_deleted.is_(False),
        )
        .order_by(Order.created_at.desc())
        .all()
    )

    response_orders = []

    for order in orders:
        items_with_name = (
            db.query(OrderItem, MenuItem.name.label("menu_item_name"))
            .outerjoin(MenuItem, OrderItem.menu_item_id == MenuItem.id)
            .filter(
                OrderItem.order_id == order.order_id,
                OrderItem.is_deleted.is_(False),
            )
            .all()
        )

        response_orders.append(
            OrderResponse(
                order_id=order.order_id,
                customer_id=order.customer_id,
                restaurant_id=order.restaurant_id,
                rider_id=order.rider_id,
                order_status=order.order_status,
                subtotal=order.subtotal,
                gst_amount=order.gst_amount,
                delivery_charge=order.delivery_charge,
                discount_amount=order.discount_amount,
                total_amount=order.total_amount,
                cancellation_status=order.cancellation_status,
                delivery_eta=order.delivery_eta,
                created_at=order.created_at,
                updated_at=order.updated_at,
                items=[
                    OrderItemResponse(
                        order_item_id=item.order_item_id,
                        menu_item_id=item.menu_item_id,
                        name=item_name or f"Item #{item.order_item_id}",
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                        line_total=item.line_total,
                    )
                    for item, item_name in items_with_name
                ],
            )
        )

    return OrderListResponse(
        orders=response_orders,
        total=len(response_orders),
    )


@router.get("/orders/{order_id}", response_model=OrderResponse)
def get_restaurant_order(
    order_id: int,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant = (
        db.query(Restaurant)
        .filter(
            Restaurant.owner_id == owner.id,
            Restaurant.is_deleted.is_(False),
        )
        .first()
    )

    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    order = (
        db.query(Order)
        .filter(
            Order.order_id == order_id,
            Order.restaurant_id == restaurant.id,
            Order.is_deleted.is_(False),
        )
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    items_with_name = (
        db.query(OrderItem, MenuItem.name.label("menu_item_name"))
        .outerjoin(MenuItem, OrderItem.menu_item_id == MenuItem.id)
        .filter(
            OrderItem.order_id == order.order_id,
            OrderItem.is_deleted.is_(False),
        )
        .all()
    )

    return OrderResponse(
        order_id=order.order_id,
        customer_id=order.customer_id,
        restaurant_id=order.restaurant_id,
        rider_id=order.rider_id,
        order_status=order.order_status,
        subtotal=order.subtotal,
        gst_amount=order.gst_amount,
        delivery_charge=order.delivery_charge,
        discount_amount=order.discount_amount,
        total_amount=order.total_amount,
        cancellation_status=order.cancellation_status,
        delivery_eta=order.delivery_eta,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=[
            OrderItemResponse(
                order_item_id=item.order_item_id,
                menu_item_id=item.menu_item_id,
                name=item_name or f"Item #{item.order_item_id}",
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
            )
            for item, item_name in items_with_name
        ],
    )



@router.patch("/orders/{order_id}/accept", response_model=OrderResponse)
def accept_order(
    order_id: int,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant = (
        db.query(Restaurant)
        .filter(
            Restaurant.owner_id == owner.id,
            Restaurant.is_deleted.is_(False),
        )
        .first()
    )

    if not restaurant:
        raise HTTPException(
            status_code=404,
            detail="Restaurant not found",
        )

    order = (
        db.query(Order)
        .filter(
            Order.order_id == order_id,
            Order.restaurant_id == restaurant.id,
            Order.is_deleted.is_(False),
        )
        .first()
    )

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    if order.order_status != "ORDERED":
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be accepted from status {order.order_status}",
        )

    order.order_status = "ACCEPTED"

    db.commit()
    db.refresh(order)

    return get_restaurant_order(
        order_id=order_id,
        db=db,
        owner=owner,
    )


@router.patch("/orders/{order_id}/reject", response_model=OrderResponse)
def reject_order(
    order_id: int,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant = (
        db.query(Restaurant)
        .filter(
            Restaurant.owner_id == owner.id,
            Restaurant.is_deleted.is_(False),
        )
        .first()
    )

    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    order = (
        db.query(Order)
        .filter(
            Order.order_id == order_id,
            Order.restaurant_id == restaurant.id,
            Order.is_deleted.is_(False),
        )
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.order_status != "ORDERED":
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be rejected from status {order.order_status}",
        )

    order.order_status = "REJECTED"

    db.commit()
    db.refresh(order)

    return get_restaurant_order(order_id, db, owner)


@router.patch("/orders/{order_id}/preparing", response_model=OrderResponse)
def mark_order_preparing(
    order_id: int,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant = (
        db.query(Restaurant)
        .filter(
            Restaurant.owner_id == owner.id,
            Restaurant.is_deleted.is_(False),
        )
        .first()
    )

    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    order = (
        db.query(Order)
        .filter(
            Order.order_id == order_id,
            Order.restaurant_id == restaurant.id,
            Order.is_deleted.is_(False),
        )
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.order_status != "ACCEPTED":
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be marked preparing from status {order.order_status}",
        )

    order.order_status = "PREPARING"

    db.commit()
    db.refresh(order)

    return get_restaurant_order(order_id, db, owner)

@router.patch("/orders/{order_id}/ready", response_model=OrderResponse)
def mark_order_ready(
    order_id: int,
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    restaurant = (
        db.query(Restaurant)
        .filter(
            Restaurant.owner_id == owner.id,
            Restaurant.is_deleted.is_(False),
        )
        .first()
    )

    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    order = (
        db.query(Order)
        .filter(
            Order.order_id == order_id,
            Order.restaurant_id == restaurant.id,
            Order.is_deleted.is_(False),
        )
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.order_status != "PREPARING":
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be marked ready from status {order.order_status}",
        )

    order.order_status = "READY_FOR_PICKUP"

    db.commit()
    db.refresh(order)

    return get_restaurant_order(order_id, db, owner)