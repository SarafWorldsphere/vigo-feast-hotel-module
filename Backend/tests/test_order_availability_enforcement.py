import json
import unittest
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.menu_category import MenuCategory
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.restaurant import Restaurant
from app.models.restaurant_hour_slot import RestaurantHourSlot
from app.models.restaurant_hours import RestaurantHours
from app.models.restaurant_order_settings import RestaurantOrderSettings
from app.models.restaurant_owner import RestaurantOwner
from app.models.restaurant_special_hours import RestaurantSpecialHours
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services.order import create_customer_order
from app.services.order_listener import OrderListener
from app.services.restaurant_hours import TIMEZONE, pause_orders
from app.services.websocket_manager import WebSocketManager


class OrderAvailabilityEnforcementTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Seed Owner & Restaurant 1
        self.owner_id = uuid4()
        self.restaurant_id = uuid4()
        self.owner = RestaurantOwner(
            id=self.owner_id,
            name="Aparna Chef",
            email="chef@test.com",
            phone="+919876543210",
            password_hash="hashed_pw",
            is_active=True,
            is_verified=True,
        )
        self.restaurant = Restaurant(
            id=self.restaurant_id,
            owner_id=self.owner_id,
            name="Spice Garden",
            description="Fine dining",
            phone="+919876543210",
            email="spice@test.com",
            address_line1="Road 36, Jubilee Hills",
            city="Hyderabad",
            state="Telangana",
            postal_code="500033",
            is_active=True,
            is_deleted=False,
        )

        # Seed Restaurant 2 (for restaurant isolation tests)
        self.other_owner_id = uuid4()
        self.other_restaurant_id = uuid4()
        self.other_owner = RestaurantOwner(
            id=self.other_owner_id,
            name="Other Owner",
            email="other@test.com",
            phone="+919876543211",
            password_hash="hashed_pw",
            is_active=True,
            is_verified=True,
        )
        self.other_restaurant = Restaurant(
            id=self.other_restaurant_id,
            owner_id=self.other_owner_id,
            name="Other Bistro",
            description="Other Bistro Description",
            phone="+919876543211",
            email="bistro@test.com",
            address_line1="Road 10, Banjara Hills",
            city="Hyderabad",
            state="Telangana",
            postal_code="500034",
            is_active=True,
            is_deleted=False,
        )

        self.db.add_all([self.owner, self.restaurant, self.other_owner, self.other_restaurant])

        # Menu item
        self.category_id = uuid4()
        self.category = MenuCategory(
            id=self.category_id,
            restaurant_id=self.restaurant_id,
            name="Main Course",
        )
        self.menu_item_id = uuid4()
        self.menu_item = MenuItem(
            id=self.menu_item_id,
            restaurant_id=self.restaurant_id,
            category_id=self.category_id,
            name="Paneer Butter Masala",
            base_price=Decimal("250.00"),
            food_type="VEG",
            preparation_time_minutes=20,
            is_active=True,
            is_deleted=False,
        )
        self.db.add_all([self.category, self.menu_item])
        self.db.commit()

        # Monday: Operating 09:00 - 22:00, Online Ordering 11:00 - 21:00
        # Reference date: Monday, 2026-10-19
        self.monday_hours = RestaurantHours(
            restaurant_id=self.restaurant_id,
            day_of_week=1,
            is_closed=False,
        )
        self.db.add(self.monday_hours)
        self.db.flush()

        self.op_slot = RestaurantHourSlot(
            weekly_hours_id=self.monday_hours.id,
            slot_type="OPERATING",
            start_time=time(9, 0),
            end_time=time(22, 0),
        )
        self.or_slot = RestaurantHourSlot(
            weekly_hours_id=self.monday_hours.id,
            slot_type="ONLINE_ORDERING",
            start_time=time(11, 0),
            end_time=time(21, 0),
        )
        self.db.add_all([self.op_slot, self.or_slot])
        self.db.commit()

        self.ws_manager = WebSocketManager()
        self.listener = OrderListener(self.ws_manager)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    # 1. An order is accepted during valid online-ordering hours.
    def test_1_order_accepted_during_valid_online_ordering_hours(self):
        # Monday at 14:00 (within 11:00 - 21:00 online ordering window)
        as_of = datetime(2026, 10, 19, 14, 0, 0, tzinfo=TIMEZONE)
        payload = OrderCreate(
            customer_id=101,
            restaurant_id=self.restaurant_id,
            items=[
                OrderItemCreate(menu_item_id=self.menu_item_id, quantity=2, unit_price=Decimal("250.00")),
            ],
            subtotal=Decimal("500.00"),
            total_amount=Decimal("565.00"),
        )
        order = create_customer_order(self.db, payload, as_of=as_of)
        self.assertIsNotNone(order.order_id)
        self.assertEqual(order.order_status, "ORDERED")
        self.assertEqual(order.customer_id, 101)
        self.assertEqual(order.restaurant_id, self.restaurant_id)

    # 2. A new order is rejected outside online-ordering hours.
    def test_2_new_order_rejected_outside_online_ordering_hours(self):
        # Monday at 10:00 (inside operating 09:00 - 22:00, but outside ordering 11:00 - 21:00)
        as_of_early = datetime(2026, 10, 19, 10, 0, 0, tzinfo=TIMEZONE)
        payload = OrderCreate(
            customer_id=102,
            restaurant_id=self.restaurant_id,
            items=[OrderItemCreate(menu_item_id=self.menu_item_id, quantity=1)],
        )
        with self.assertRaises(HTTPException) as ctx:
            create_customer_order(self.db, payload, as_of=as_of_early)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("OUTSIDE_ORDERING_HOURS", ctx.exception.detail)

        # Monday at 21:30 (outside ordering hours ending at 21:00)
        as_of_late = datetime(2026, 10, 19, 21, 30, 0, tzinfo=TIMEZONE)
        with self.assertRaises(HTTPException) as ctx_late:
            create_customer_order(self.db, payload, as_of=as_of_late)
        self.assertEqual(ctx_late.exception.status_code, 409)

    # 3. A new order is rejected when the restaurant is paused.
    def test_3_new_order_rejected_when_restaurant_is_paused(self):
        # Pause restaurant until 16:00
        paused_until = datetime(2026, 10, 19, 16, 0, 0, tzinfo=TIMEZONE)
        settings = RestaurantOrderSettings(
            restaurant_id=self.restaurant_id,
            is_paused=True,
            pause_reason="Kitchen overwhelmed with rush",
            paused_until=paused_until,
        )
        self.db.add(settings)
        self.db.commit()

        # Place order at 14:00 (normally open, but paused)
        as_of = datetime(2026, 10, 19, 14, 0, 0, tzinfo=TIMEZONE)
        payload = OrderCreate(
            customer_id=103,
            restaurant_id=self.restaurant_id,
            items=[OrderItemCreate(menu_item_id=self.menu_item_id, quantity=1)],
        )
        with self.assertRaises(HTTPException) as ctx:
            create_customer_order(self.db, payload, as_of=as_of)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("TEMPORARILY_PAUSED", ctx.exception.detail)

    # 4. The restaurant receives order_placed only when eligible.
    def test_4_restaurant_receives_order_placed_only_when_eligible(self):
        open_time = datetime(2026, 10, 19, 14, 0, 0, tzinfo=TIMEZONE)
        closed_time = datetime(2026, 10, 19, 22, 30, 0, tzinfo=TIMEZONE)

        # Patch SessionLocal inside order_listener to use test SQLite db
        with unittest.mock.patch("app.services.order_listener.SessionLocal", side_effect=self.Session):
            can_forward_open = self.listener._should_forward_to_restaurant(
                channel="order_placed",
                restaurant_id=self.restaurant_id,
                as_of=open_time,
            )
            can_forward_closed = self.listener._should_forward_to_restaurant(
                channel="order_placed",
                restaurant_id=self.restaurant_id,
                as_of=closed_time,
            )

        self.assertTrue(can_forward_open)
        self.assertFalse(can_forward_closed)

    # 5. A restaurant closed during a shift does not receive new incoming-order notifications.
    def test_5_restaurant_closed_during_shift_does_not_receive_incoming_orders(self):
        # Suppose restaurant paused in middle of shift at 15:00 until 18:00
        settings = RestaurantOrderSettings(
            restaurant_id=self.restaurant_id,
            is_paused=True,
            pause_reason="Staff break",
            paused_until=datetime(2026, 10, 19, 18, 0, 0, tzinfo=TIMEZONE),
        )
        self.db.add(settings)
        self.db.commit()

        check_time = datetime(2026, 10, 19, 15, 30, 0, tzinfo=TIMEZONE)
        with unittest.mock.patch("app.services.order_listener.SessionLocal", side_effect=self.Session):
            forward_allowed = self.listener._should_forward_to_restaurant(
                channel="order_placed",
                restaurant_id=self.restaurant_id,
                as_of=check_time,
            )
        self.assertFalse(forward_allowed)

    # 6. An already accepted order can still progress through preparation and pickup.
    def test_6_accepted_order_progresses_through_preparation_and_pickup(self):
        # Order was placed and accepted before closing
        order = Order(
            customer_id=104,
            restaurant_id=self.restaurant_id,
            order_status="ACCEPTED",
            subtotal=Decimal("300.00"),
            total_amount=Decimal("350.00"),
        )
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)

        # Time is now 22:30 (restaurant closed)
        # Advance status to PREPARING
        order.order_status = "PREPARING"
        self.db.commit()
        self.assertEqual(order.order_status, "PREPARING")

        # Advance status to READY_FOR_PICKUP
        order.order_status = "READY_FOR_PICKUP"
        self.db.commit()
        self.assertEqual(order.order_status, "READY_FOR_PICKUP")

    # 7. Rider and customer delivery updates continue correctly after restaurant closing.
    def test_7_rider_delivery_updates_continue_after_restaurant_closing(self):
        # Order was accepted before closing
        order = Order(
            customer_id=105,
            restaurant_id=self.restaurant_id,
            order_status="READY_FOR_PICKUP",
            subtotal=Decimal("400.00"),
            total_amount=Decimal("450.00"),
        )
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)

        # Time is after restaurant closing (22:30)
        after_closing = datetime(2026, 10, 19, 22, 30, 0, tzinfo=TIMEZONE)

        with unittest.mock.patch("app.services.order_listener.SessionLocal", side_effect=self.Session):
            # Delivery partner arrived
            can_forward_arrived = self.listener._should_forward_to_restaurant(
                channel="delivery_partner_arrived",
                restaurant_id=self.restaurant_id,
                order_id=order.order_id,
                as_of=after_closing,
            )
            # Order delivered
            can_forward_delivered = self.listener._should_forward_to_restaurant(
                channel="order_delivered",
                restaurant_id=self.restaurant_id,
                order_id=order.order_id,
                as_of=after_closing,
            )

        self.assertTrue(can_forward_arrived)
        self.assertTrue(can_forward_delivered)

        # Verify financial finalization is not globally suppressed for delivered order
        order.order_status = "DELIVERED"
        self.db.commit()
        with unittest.mock.patch("app.services.order_listener.SessionLocal", side_effect=self.Session):
            self.listener._finalize_delivered_order(
                order_id=order.order_id,
                restaurant_id=self.restaurant_id,
            )
        fresh_order = self.Session().query(Order).filter(Order.order_id == order.order_id).first()
        self.assertIsNotNone(fresh_order.financial_finalized_at)

    # 8. Special-date closure and overnight slots are respected.
    def test_8_special_date_closure_and_overnight_slots_respected(self):
        # Special-date closure on 2026-10-19
        special_closed = RestaurantSpecialHours(
            restaurant_id=self.restaurant_id,
            special_date=date(2026, 10, 19),
            is_closed=True,
            note="National Holiday",
        )
        self.db.add(special_closed)
        self.db.commit()

        # At 14:00 (would normally be open on Monday, but special-date closed)
        as_of = datetime(2026, 10, 19, 14, 0, 0, tzinfo=TIMEZONE)
        payload = OrderCreate(
            customer_id=106,
            restaurant_id=self.restaurant_id,
            items=[OrderItemCreate(menu_item_id=self.menu_item_id, quantity=1)],
        )
        with self.assertRaises(HTTPException) as ctx:
            create_customer_order(self.db, payload, as_of=as_of)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("CLOSED_TODAY", ctx.exception.detail)

        # Now test overnight slots: Tuesday 18:00 to 02:00
        tuesday_hours = RestaurantHours(
            restaurant_id=self.restaurant_id,
            day_of_week=2,
            is_closed=False,
        )
        self.db.add(tuesday_hours)
        self.db.flush()

        op_slot_tue = RestaurantHourSlot(
            weekly_hours_id=tuesday_hours.id,
            slot_type="OPERATING",
            start_time=time(18, 0),
            end_time=time(2, 0),
        )
        or_slot_tue = RestaurantHourSlot(
            weekly_hours_id=tuesday_hours.id,
            slot_type="ONLINE_ORDERING",
            start_time=time(18, 0),
            end_time=time(2, 0),
        )
        self.db.add_all([op_slot_tue, or_slot_tue])
        self.db.commit()

        # Wednesday 01:30 (inside Tuesday's overnight slot) -> accepted
        as_of_overnight_active = datetime(2026, 10, 21, 1, 30, 0, tzinfo=TIMEZONE)
        order_overnight = create_customer_order(self.db, payload, as_of=as_of_overnight_active)
        self.assertIsNotNone(order_overnight.order_id)

        # Wednesday 02:30 (after Tuesday's overnight slot ended at 02:00) -> rejected
        as_of_overnight_ended = datetime(2026, 10, 21, 2, 30, 0, tzinfo=TIMEZONE)
        with self.assertRaises(HTTPException) as ctx_ended:
            create_customer_order(self.db, payload, as_of=as_of_overnight_ended)
        self.assertEqual(ctx_ended.exception.status_code, 409)

    # 9. Events for one restaurant are never sent to another restaurant.
    def test_9_events_isolated_between_restaurants(self):
        import asyncio

        # Create mock websockets for restaurant 1 and restaurant 2
        ws_r1 = AsyncMock()
        ws_r2 = AsyncMock()

        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(self.ws_manager.connect(str(self.restaurant_id), ws_r1))
            loop.run_until_complete(self.ws_manager.connect(str(self.other_restaurant_id), ws_r2))

            # Send event intended exclusively for restaurant 1
            event_for_r1 = {
                "event": "NEW_ORDER",
                "order_id": 9999,
            }
            loop.run_until_complete(
                self.ws_manager.send_to_restaurant(str(self.restaurant_id), event_for_r1)
            )

            # Assert ws_r1 received it and ws_r2 did NOT
            ws_r1.send_json.assert_awaited_once_with(event_for_r1)
            ws_r2.send_json.assert_not_awaited()
        finally:
            loop.close()


if __name__ == "__main__":
    unittest.main()
