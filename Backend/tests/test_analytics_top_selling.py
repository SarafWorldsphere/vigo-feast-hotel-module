import unittest
from datetime import datetime, date, timedelta
from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.v1.routes.analytics import top_selling_items
from app.models.menu_category import MenuCategory
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.restaurant import Restaurant
from app.services.analytics import get_top_selling_items, resolve_analytics_period, REPORTING_TIMEZONE


class TopSellingItemsAnalyticsTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Restaurant.__table__.create(self.engine)
        MenuCategory.__table__.create(self.engine)
        MenuItem.__table__.create(self.engine)
        Order.__table__.create(self.engine)
        OrderItem.__table__.create(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        self.owner_id = uuid4()
        self.restaurant_id = uuid4()

        self.restaurant = Restaurant(
            id=self.restaurant_id,
            owner_id=self.owner_id,
            name="Biryani Palace",
            description="Fine dining biryani",
            phone="+919876543210",
            email="biryani@test.com",
            address_line1="123 Park Street",
            city="Kolkata",
            state="West Bengal",
            postal_code="700016",
            latitude=22.55,
            longitude=88.35,
            is_deleted=False,
            is_active=True,
        )
        self.db.add(self.restaurant)

        self.category = MenuCategory(
            id=uuid4(),
            restaurant_id=self.restaurant_id,
            name="Main Course",
            display_order=1,
            is_active=True,
            is_deleted=False,
        )
        self.db.add(self.category)

        self.item1 = MenuItem(
            id=uuid4(),
            restaurant_id=self.restaurant_id,
            category_id=self.category.id,
            name="Hyderabadi Chicken Biryani",
            base_price=Decimal("350.00"),
            food_type="NON_VEG",
            preparation_time_minutes=25,
            availability_status="AVAILABLE",
            is_active=True,
            is_deleted=False,
        )
        self.item2 = MenuItem(
            id=uuid4(),
            restaurant_id=self.restaurant_id,
            category_id=self.category.id,
            name="Mutton Galouti Kebab",
            base_price=Decimal("420.00"),
            food_type="NON_VEG",
            preparation_time_minutes=20,
            availability_status="AVAILABLE",
            is_active=True,
            is_deleted=False,
        )
        self.db.add_all([self.item1, self.item2])
        self.db.commit()

        self.owner_mock = MagicMock()
        self.owner_mock.owner_id = self.owner_id

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_top_selling_items_empty_period(self):
        period_data = resolve_analytics_period(period="today")
        result = get_top_selling_items(
            db=self.db,
            restaurant_id=self.restaurant_id,
            period_data=period_data,
        )

        self.assertEqual(result["period"], "today")
        self.assertEqual(len(result["items"]), 0)

    def test_top_selling_items_aggregations_and_sorting(self):
        now = datetime.now(REPORTING_TIMEZONE)
        period_data = resolve_analytics_period(period="today")

        # Create delivered finalized orders
        order1 = Order(
            order_id=101,
            restaurant_id=self.restaurant_id,
            customer_id=1,
            order_status="DELIVERED",
            subtotal=Decimal("700.00"),
            total_amount=Decimal("750.00"),
            financial_finalized_at=now,
            created_at=now,
            is_deleted=False,
        )
        order2 = Order(
            order_id=102,
            restaurant_id=self.restaurant_id,
            customer_id=2,
            order_status="DELIVERED",
            subtotal=Decimal("770.00"),
            total_amount=Decimal("800.00"),
            financial_finalized_at=now,
            created_at=now,
            is_deleted=False,
        )
        self.db.add_all([order1, order2])
        self.db.flush()

        # Order 1 has 2 units of item 1
        oi1 = OrderItem(
            order_item_id=1,
            order_id=order1.order_id,
            menu_item_id=self.item1.id,
            quantity=2,
            unit_price=Decimal("350.00"),
            line_total=Decimal("700.00"),
            is_active=True,
            is_deleted=False,
        )
        # Order 2 has 3 units of item 1 and 1 unit of item 2
        oi2 = OrderItem(
            order_item_id=2,
            order_id=order2.order_id,
            menu_item_id=self.item1.id,
            quantity=3,
            unit_price=Decimal("350.00"),
            line_total=Decimal("1050.00"),
            is_active=True,
            is_deleted=False,
        )
        oi3 = OrderItem(
            order_item_id=3,
            order_id=order2.order_id,
            menu_item_id=self.item2.id,
            quantity=1,
            unit_price=Decimal("420.00"),
            line_total=Decimal("420.00"),
            is_active=True,
            is_deleted=False,
        )
        self.db.add_all([oi1, oi2, oi3])
        self.db.commit()

        result = get_top_selling_items(
            db=self.db,
            restaurant_id=self.restaurant_id,
            period_data=period_data,
        )

        self.assertEqual(len(result["items"]), 2)
        top_item = result["items"][0]
        self.assertEqual(top_item["name"], "Hyderabadi Chicken Biryani")
        self.assertEqual(top_item["quantity_sold"], 5)
        self.assertEqual(top_item["order_count"], 2)
        self.assertEqual(top_item["gross_revenue"], Decimal("1750.00"))
        self.assertEqual(top_item["category_name"], "Main Course")

        second_item = result["items"][1]
        self.assertEqual(second_item["name"], "Mutton Galouti Kebab")
        self.assertEqual(second_item["quantity_sold"], 1)
        self.assertEqual(second_item["order_count"], 1)
        self.assertEqual(second_item["gross_revenue"], Decimal("420.00"))

    def test_top_selling_items_route(self):
        response = top_selling_items(
            period="today",
            start_date=None,
            end_date=None,
            db=self.db,
            owner=self.owner_mock,
        )
        self.assertEqual(response["period"], "today")
        self.assertIn("items", response)

    def test_highest_revenue_items_empty_period(self):
        from app.services.analytics import get_highest_revenue_items
        from app.api.v1.routes.analytics import highest_revenue_items

        period_data = resolve_analytics_period(period="today")
        result = get_highest_revenue_items(
            db=self.db,
            restaurant_id=self.restaurant_id,
            period_data=period_data,
        )
        self.assertEqual(result["period"], "today")
        self.assertEqual(len(result["items"]), 0)

        route_res = highest_revenue_items(
            period="today",
            start_date=None,
            end_date=None,
            db=self.db,
            owner=self.owner_mock,
        )
        self.assertEqual(route_res["period"], "today")
        self.assertEqual(len(route_res["items"]), 0)

    def test_menu_performance_empty_period(self):
        from app.services.analytics import get_menu_performance
        from app.api.v1.routes.analytics import menu_performance

        period_data = resolve_analytics_period(period="today")
        result = get_menu_performance(
            db=self.db,
            restaurant_id=self.restaurant_id,
            period_data=period_data,
        )
        self.assertEqual(result["period"], "today")
        self.assertEqual(result["total"], 2)  # item1 and item2 exist for this restaurant
        self.assertEqual(len(result["items"]), 2)
        self.assertEqual(result["items"][0]["performance_label"], "No Data")

        route_res = menu_performance(
            period="today",
            start_date=None,
            end_date=None,
            db=self.db,
            owner=self.owner_mock,
        )
        self.assertEqual(route_res["period"], "today")
        self.assertEqual(route_res["total"], 2)

    def test_menu_performance_with_orders_period_isolation(self):
        from app.services.analytics import get_menu_performance

        now = datetime.now(REPORTING_TIMEZONE)
        old_time = now - timedelta(days=10)
        period_data = resolve_analytics_period(period="today")

        # Order today (in period)
        order_today = Order(
            order_id=201,
            restaurant_id=self.restaurant_id,
            customer_id=1,
            order_status="DELIVERED",
            subtotal=Decimal("350.00"),
            total_amount=Decimal("350.00"),
            financial_finalized_at=now,
            created_at=now,
            is_deleted=False,
        )
        # Order 10 days ago (outside today's period)
        order_old = Order(
            order_id=202,
            restaurant_id=self.restaurant_id,
            customer_id=2,
            order_status="DELIVERED",
            subtotal=Decimal("420.00"),
            total_amount=Decimal("420.00"),
            financial_finalized_at=old_time,
            created_at=old_time,
            is_deleted=False,
        )
        self.db.add_all([order_today, order_old])
        self.db.flush()

        oi1 = OrderItem(
            order_item_id=2001,
            order_id=order_today.order_id,
            menu_item_id=self.item1.id,
            quantity=1,
            unit_price=Decimal("350.00"),
            line_total=Decimal("350.00"),
            is_active=True,
            is_deleted=False,
        )
        oi2 = OrderItem(
            order_item_id=2002,
            order_id=order_old.order_id,
            menu_item_id=self.item2.id,
            quantity=1,
            unit_price=Decimal("420.00"),
            line_total=Decimal("420.00"),
            is_active=True,
            is_deleted=False,
        )
        self.db.add_all([oi1, oi2])
        self.db.commit()

        result = get_menu_performance(
            db=self.db,
            restaurant_id=self.restaurant_id,
            period_data=period_data,
        )

        item1_res = next(i for i in result["items"] if i["menu_item_id"] == str(self.item1.id))
        item2_res = next(i for i in result["items"] if i["menu_item_id"] == str(self.item2.id))

        # Item 1 ordered today -> has sales
        self.assertEqual(item1_res["orders"], 1)
        self.assertEqual(item1_res["gross_revenue"], Decimal("350.00"))
        self.assertEqual(item1_res["performance_label"], "Top Performer")

        # Item 2 ordered 10 days ago -> 0 sales in today's period
        self.assertEqual(item2_res["orders"], 0)
        self.assertEqual(item2_res["gross_revenue"], Decimal("0"))
        self.assertEqual(item2_res["performance_label"], "Low Performer")

    def test_export_analytics_csv(self):
        from app.api.v1.routes.analytics import export_analytics

        response = export_analytics(
            period="today",
            start_date=None,
            end_date=None,
            db=self.db,
            owner=self.owner_mock,
        )
        self.assertEqual(response.media_type, "text/csv")
        self.assertIn("Content-Disposition", response.headers)
        self.assertIn("attachment; filename=", response.headers["Content-Disposition"])


if __name__ == "__main__":
    unittest.main()




