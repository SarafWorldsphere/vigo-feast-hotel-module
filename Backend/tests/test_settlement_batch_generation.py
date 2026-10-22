import unittest
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.hotel_settlement import HotelSettlement
from app.models.order import Order
from app.models.refund import Refund
from app.models.restaurant import Restaurant
from app.models.settlement_batch import SettlementBatch
from app.models.settlement_batch_item import SettlementBatchItem
from app.services.settlements import (
    generate_settlement_batch,
    REPORTING_TIMEZONE,
)


class SettlementBatchGenerationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Restaurant.__table__.create(self.engine)
        Order.__table__.create(self.engine)
        Refund.__table__.create(self.engine)
        HotelSettlement.__table__.create(self.engine)
        SettlementBatch.__table__.create(self.engine)
        SettlementBatchItem.__table__.create(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        self.restaurant_id = uuid4()
        self.owner_id = uuid4()
        self.restaurant = Restaurant(
            id=self.restaurant_id,
            owner_id=self.owner_id,
            name="Test Kitchen",
            phone="+919876543210",
            email="test@kitchen.com",
            address_line1="456 Food Street",
            city="Kolkata",
            state="West Bengal",
            postal_code="700001",
            latitude=22.5726,
            longitude=88.3639,
            is_deleted=False,
            is_active=True,
        )
        self.db.add(self.restaurant)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_generate_settlement_batch_flow(self):
        period_start = date(2026, 10, 10)
        period_end = date(2026, 10, 10)

        order_time = datetime(2026, 10, 10, 14, 30, tzinfo=REPORTING_TIMEZONE)

        # 1. Eligible delivered & finalized order
        order1 = Order(
            order_id=101,
            customer_id=1,
            restaurant_id=self.restaurant_id,
            order_status="DELIVERED",
            subtotal=Decimal("500.00"),
            gst_amount=Decimal("25.00"),
            delivery_charge=Decimal("40.00"),
            discount_amount=Decimal("50.00"),
            total_amount=Decimal("515.00"),
            commission_rate=Decimal("0.1000"),
            commission_amount=Decimal("50.00"),
            commission_tax_rate=Decimal("0.1800"),
            commission_tax_amount=Decimal("9.00"),
            restaurant_discount_amount=Decimal("50.00"),
            other_fee_amount=Decimal("5.00"),
            financial_finalized_at=order_time,
            created_at=order_time,
            is_deleted=False,
        )

        # 2. Ineligible: Not finalized order
        order2 = Order(
            order_id=102,
            customer_id=2,
            restaurant_id=self.restaurant_id,
            order_status="DELIVERED",
            subtotal=Decimal("300.00"),
            financial_finalized_at=None,
            created_at=order_time,
            is_deleted=False,
        )

        # 3. Ineligible: Not delivered order
        order3 = Order(
            order_id=103,
            customer_id=3,
            restaurant_id=self.restaurant_id,
            order_status="CANCELLED",
            subtotal=Decimal("200.00"),
            financial_finalized_at=order_time,
            created_at=order_time,
            is_deleted=False,
        )

        self.db.add_all([order1, order2, order3])
        self.db.commit()

        # Run settlement generation flow
        batch = generate_settlement_batch(
            db=self.db,
            restaurant_id=self.restaurant_id,
            period_start=period_start,
            period_end=period_end,
            is_simulated=True,
        )

        self.assertIsNotNone(batch)
        self.assertEqual(batch.total_orders, 1)
        self.assertEqual(batch.gross_sales, Decimal("500.00"))
        self.assertEqual(batch.restaurant_discounts, Decimal("50.00"))
        self.assertEqual(batch.commission, Decimal("50.00"))
        self.assertEqual(batch.commission_tax, Decimal("9.00"))
        self.assertEqual(batch.other_fees, Decimal("5.00"))
        # Net = 500 - 50 - 50 - 9 - 5 = 386.00
        self.assertEqual(batch.net_amount, Decimal("386.00"))

        # Step 6: T+1 next day settlement date
        self.assertEqual(batch.settlement_date, date(2026, 10, 11))

        # Step 2: Hotel settlement record created
        hs = (
            self.db.query(HotelSettlement)
            .filter(HotelSettlement.order_id == 101)
            .first()
        )
        self.assertIsNotNone(hs)
        self.assertEqual(hs.menu_value, Decimal("500.00"))
        self.assertEqual(hs.net_amount, Decimal("386.00"))

        # Step 5: Link records via batch items
        items = (
            self.db.query(SettlementBatchItem)
            .filter(SettlementBatchItem.batch_id == batch.batch_id)
            .all()
        )
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0].settlement_id, hs.settlement_id)

    def test_reuse_existing_hotel_settlement_record(self):
        period_start = date(2026, 10, 10)
        period_end = date(2026, 10, 10)
        order_time = datetime(2026, 10, 10, 12, 0, tzinfo=REPORTING_TIMEZONE)

        order = Order(
            order_id=201,
            customer_id=1,
            restaurant_id=self.restaurant_id,
            order_status="DELIVERED",
            subtotal=Decimal("200.00"),
            financial_finalized_at=order_time,
            created_at=order_time,
            is_deleted=False,
        )
        self.db.add(order)

        # Pre-existing hotel settlement record
        existing_hs = HotelSettlement(
            order_id=201,
            restaurant_id=self.restaurant_id,
            menu_value=Decimal("200.00"),
            commission_amount=Decimal("20.00"),
            net_amount=Decimal("176.40"),
            is_active=True,
            is_deleted=False,
        )
        self.db.add(existing_hs)
        self.db.commit()

        batch = generate_settlement_batch(
            db=self.db,
            restaurant_id=self.restaurant_id,
            period_start=period_start,
            period_end=period_end,
        )

        self.assertIsNotNone(batch)
        # Should reuse existing_hs rather than creating a duplicate
        hs_count = (
            self.db.query(HotelSettlement)
            .filter(HotelSettlement.order_id == 201)
            .count()
        )
        self.assertEqual(hs_count, 1)

        batch_item = (
            self.db.query(SettlementBatchItem)
            .filter(SettlementBatchItem.batch_id == batch.batch_id)
            .first()
        )
        self.assertEqual(batch_item.settlement_id, existing_hs.settlement_id)


if __name__ == "__main__":
    unittest.main()
