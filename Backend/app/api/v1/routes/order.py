from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.models.customer import Customer, CustomerAddress
from app.models.delivery_partner import DeliveryPartner
from app.models.delivery_partner_assignment import DeliveryPartnerAssignment
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.restaurant import Restaurant
from app.schemas.delivery import (
    AssignmentInfo,
    CustomerInfo,
    DeliveryListResponse,
    DeliveryPartnerInfo,
    DeliveryResponse,
)
from app.schemas.order import (
    OrderCreate,
    OrderItemResponse,
    OrderListResponse,
    OrderResponse,
)
from app.services.order import create_customer_order

router = APIRouter()



def _build_delivery_response(order: Order, db: Session) -> DeliveryResponse:
    # 1. Fetch latest assignment
    assignment = (
        db.query(DeliveryPartnerAssignment)
        .filter(DeliveryPartnerAssignment.order_id == order.order_id)
        .order_by(DeliveryPartnerAssignment.assignment_id.desc())
        .first()
    )

    # 2. Fetch partner if assigned
    partner = None
    if assignment and assignment.partner_id:
        partner = (
            db.query(DeliveryPartner)
            .filter(DeliveryPartner.partner_id == assignment.partner_id)
            .first()
        )

    # 3. Fetch customer
    customer = (
        db.query(Customer)
        .filter(Customer.customer_id == order.customer_id)
        .first()
    )

    # 4. Fetch address
    address_text = "Standard Delivery Address"
    if customer and customer.default_address_id:
        addr = (
            db.query(CustomerAddress)
            .filter(CustomerAddress.address_id == customer.default_address_id)
            .first()
        )
        if addr and addr.address_text:
            address_text = addr.address_text
    elif customer:
        addr = (
            db.query(CustomerAddress)
            .filter(CustomerAddress.customer_id == customer.customer_id)
            .first()
        )
        if addr and addr.address_text:
            address_text = addr.address_text

    # 5. Fetch items
    items_with_name = (
        db.query(OrderItem, MenuItem.name.label("menu_item_name"))
        .outerjoin(MenuItem, OrderItem.menu_item_id == MenuItem.id)
        .filter(
            OrderItem.order_id == order.order_id,
            OrderItem.is_deleted.is_(False),
        )
        .all()
    )

    order_res = OrderResponse(
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

    # Stage mapping
    stage = "WAITING_FOR_PARTNER"
    status_str = "WAITING"
    if assignment and assignment.assignment_status:
        status_str = assignment.assignment_status
        stage_map = {
            "ASSIGNED": "ASSIGNED",
            "ACCEPTED": "ASSIGNED",
            "ARRIVED_AT_RESTAURANT": "ARRIVED",
            "PICKED_UP": "PICKED_UP",
            "ARRIVED_AT_CUSTOMER": "IN_TRANSIT",
            "DELIVERED": "DELIVERED",
            "CANCELLED": "WAITING_FOR_PARTNER",
            "REASSIGNED": "ASSIGNED",
        }
        stage = stage_map.get(status_str, "WAITING_FOR_PARTNER")
    elif order.order_status == "PICKED_UP":
        stage = "PICKED_UP"
    elif order.order_status == "DELIVERED":
        stage = "DELIVERED"

    partner_info = None
    if partner:
        partner_info = DeliveryPartnerInfo(
            partner_id=partner.partner_id,
            name=partner.full_name or f"Partner #{partner.partner_id}",
            phone=partner.mobile_number,
            email=partner.email,
            vehicle_type=partner.vehicle_type or "Bike",
            vehicle_number=partner.vehicle_number or "",
            rating=4.8,
        )

    customer_info = CustomerInfo(
        customer_id=order.customer_id,
        name=customer.name if customer else f"Customer #{order.customer_id}",
        phone=customer.mobile if customer else None,
        address=address_text,
    )

    assignment_info = None
    if assignment:
        assignment_info = AssignmentInfo(
            assignment_id=assignment.assignment_id,
            partner_id=assignment.partner_id,
            order_id=assignment.order_id,
            assignment_status=assignment.assignment_status,
            assigned_at=assignment.assigned_at,
            accepted_at=assignment.accepted_at,
            arrived_at_restaurant=assignment.arrived_at_restaurant,
            picked_up_at=assignment.picked_up_at,
            arrived_at_customer=assignment.arrived_at_customer,
            delivered_at=assignment.delivered_at,
        )

    assignment_id_val = assignment.assignment_id if assignment else order.order_id
    return DeliveryResponse(
        id=f"del-{order.order_id}",
        short_id=f"DLV{assignment_id_val:04d}",
        order_id=order.order_id,
        order_short_id=f"ORD{order.order_id:04d}",
        stage=stage,
        order=order_res,
        customer=customer_info,
        delivery_partner=partner_info,
        assignment=assignment_info,
        delivery_status=status_str,
    )


@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
):
    order = create_customer_order(db=db, payload=payload)
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

    if order.order_status == "ACCEPTED":
        return get_restaurant_order(
            order_id=order_id,
            db=db,
            owner=owner,
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

    if order.order_status == "PREPARING":
        return get_restaurant_order(order_id, db, owner)

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

    if order.order_status == "READY_FOR_PICKUP":
        return get_restaurant_order(order_id, db, owner)

    if order.order_status != "PREPARING":
        raise HTTPException(
            status_code=400,
            detail=f"Order cannot be marked ready from status {order.order_status}",
        )

    order.order_status = "READY_FOR_PICKUP"

    db.commit()
    db.refresh(order)

    return get_restaurant_order(order_id, db, owner)


@router.get("/deliveries", response_model=DeliveryListResponse)
def get_restaurant_deliveries(
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
        return DeliveryListResponse(deliveries=[], total=0)

    orders = (
        db.query(Order)
        .filter(
            Order.restaurant_id == restaurant.id,
            Order.is_deleted.is_(False),
        )
        .order_by(Order.created_at.desc())
        .all()
    )

    deliveries = [_build_delivery_response(order, db) for order in orders]
    return DeliveryListResponse(deliveries=deliveries, total=len(deliveries))


@router.get("/deliveries/{order_id}", response_model=DeliveryResponse)
def get_restaurant_delivery(
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

    return _build_delivery_response(order, db)