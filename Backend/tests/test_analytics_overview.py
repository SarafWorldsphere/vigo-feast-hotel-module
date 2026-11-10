import unittest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.v1.routes.analytics import analytics_overview
from app.models.customer_feedback import CustomerFeedback
from app.models.order import Order
from app.models.order_tracking import OrderTracking
from app.models.restaurant import Restaurant
from app.services.analytics import (
    REPORTING_TIMEZONE,
    get_analytics_overview,
    resolve_analytics_period,
)


class AnalyticsOverviewTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Restaurant.__table__.create(self.engine)
        Order.__table__.create(self.engine)
        OrderTracking.__table__.create(self.engine)
        CustomerFeedback.__table__.create(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        self.owner_id = uuid4()
        self.restaurant_id = uuid4()

        self.restaurant = Restaurant(
            id=self.restaurant_id,
            owner_id=self.owner_id,
            name="Analytics Bistro",
            description="Analytics test kitchen",
            phone="+919876543210",
            email="analytics@test.com",
            address_line1="123 Main St",
            city="Hyderabad",
            state="Telangana",
            postal_code="500081",
            latitude=17.44,
            longitude=78.37,
            is_deleted=False,
            is_active=True,
        )
        self.db.add(self.restaurant)
        self.db.commit()

        self.owner_mock = MagicMock()
        self.owner_mock.owner_id = self.owner_id

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_overview_empty_period_without_tracking_events(self):
        period_data = resolve_analytics_period(period="today")
        result = get_analytics_overview(
            db=self.db,
            restaurant_id=self.restaurant_id,
            period_data=period_data,
        )

        self.assertEqual(result["period"], "today")
        self.assertEqual(result["gross_revenue"]["value"], Decimal("0"))
        self.assertIsNone(result["average_preparation_time"]["value"])
        self.assertIsNone(result["acceptance_rate"]["value"])

        route_res = analytics_overview(
            period="today",
            start_date=None,
            end_date=None,
            db=self.db,
            owner=self.owner_mock,
        )
        self.assertEqual(route_res["period"], "today")
        self.assertIsNone(route_res["average_preparation_time"]["value"])

    def test_overview_calculates_preparation_time_via_order_string_id(self):
        now = datetime.now(REPORTING_TIMEZONE)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        order_created = today_start + timedelta(hours=1)
        prep_start = order_created + timedelta(minutes=2)
        prep_done = prep_start + timedelta(minutes=15)

        order = Order(
            order_id=101,
            customer_id=1,
            restaurant_id=self.restaurant_id,
            order_status="DELIVERED",
            subtotal=Decimal("500.00"),
            total_amount=Decimal("540.00"),
            financial_finalized_at=order_created + timedelta(minutes=30),
            created_at=order_created,
            is_deleted=False,
        )
        self.db.add(order)
        self.db.flush()

        self.db.add_all([
            OrderTracking(
                order_id=order.id,
                status_update="START_PREPARING",
                recorded_at=prep_start,
            ),
            OrderTracking(
                order_id=order.id,
                status_update="PREPARATION_COMPLETED",
                recorded_at=prep_done,
            ),
            OrderTracking(
                order_id=order.id,
                status_update="PICKED_UP",
                recorded_at=prep_done + timedelta(minutes=5),
            ),
        ])
        self.db.add(
            CustomerFeedback(
                feedback_id=1,
                order_id=order.order_id,
                customer_id=1,
                restaurant_id=self.restaurant_id,
                rating=5,
                created_at=order_created + timedelta(minutes=40),
                is_active=True,
                is_deleted=False,
            )
        )
        self.db.commit()

        self.assertEqual(len(order.tracking_events), 3)

        route_res = analytics_overview(
            period="today",
            start_date=None,
            end_date=None,
            db=self.db,
            owner=self.owner_mock,
        )

        self.assertEqual(route_res["acceptance_rate"]["value"], Decimal("100"))
        self.assertEqual(route_res["cancellation_rate"]["value"], Decimal("0"))
        self.assertEqual(route_res["average_order_value"]["value"], Decimal("500.00"))
        self.assertEqual(route_res["average_preparation_time"]["value"], Decimal("15"))
        self.assertEqual(route_res["customer_rating"]["value"], Decimal("5"))
        self.assertEqual(route_res["gross_revenue"]["value"], Decimal("500.00"))


if __name__ == "__main__":
    unittest.main()

