import unittest
from datetime import datetime, date, timedelta
from decimal import Decimal
from unittest.mock import MagicMock
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.v1.routes.settlement import (
    get_current_settlement_period,
    REPORTING_TIMEZONE,
)
from app.models.restaurant import Restaurant
from app.models.settlement_batch import SettlementBatch
from app.schemas.settlement import CurrentSettlementPeriodResponse


class CurrentSettlementPeriodEndpointTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Restaurant.__table__.create(self.engine)
        SettlementBatch.__table__.create(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        self.owner_id = uuid4()
        self.restaurant_id = uuid4()

        self.restaurant = Restaurant(
            id=self.restaurant_id,
            owner_id=self.owner_id,
            name="Test Restaurant",
            description="Testing settlement periods",
            phone="+919876543210",
            email="test@restaurant.com",
            address_line1="123 Street",
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

        self.owner_mock = MagicMock()
        self.owner_mock.owner_id = self.owner_id

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_current_period_no_batch_returns_defaults(self):
        today = datetime.now(REPORTING_TIMEZONE).date()

        result = get_current_settlement_period(
            db=self.db,
            owner=self.owner_mock,
        )

        response = CurrentSettlementPeriodResponse.model_validate(result)
        self.assertIsNone(response.period_start)
        self.assertIsNone(response.period_end)
        self.assertEqual(response.settlement_date, today)
        self.assertEqual(response.net_amount, "0.00")
        self.assertIsNone(response.status)
        self.assertTrue(response.is_simulated)

    def test_current_period_with_existing_batch_returns_batch_data(self):
        today = datetime.now(REPORTING_TIMEZONE).date()
        start = today - timedelta(days=7)
        end = today - timedelta(days=1)

        batch = SettlementBatch(
            batch_id=1,
            restaurant_id=self.restaurant_id,
            period_start=start,
            period_end=end,
            settlement_date=today,
            total_orders=15,
            gross_sales=Decimal("5000.00"),
            restaurant_discounts=Decimal("200.00"),
            commission=Decimal("500.00"),
            commission_tax=Decimal("90.00"),
            other_fees=Decimal("50.00"),
            refunds=Decimal("0.00"),
            adjustments=Decimal("0.00"),
            net_amount=Decimal("4160.00"),
            status="PROCESSING",
            is_simulated=False,
        )
        self.db.add(batch)
        self.db.commit()

        result = get_current_settlement_period(
            db=self.db,
            owner=self.owner_mock,
        )

        response = CurrentSettlementPeriodResponse.model_validate(result)
        self.assertEqual(response.period_start, start)
        self.assertEqual(response.period_end, end)
        self.assertEqual(response.settlement_date, today)
        self.assertEqual(response.net_amount, "4160.00")
        self.assertEqual(response.status, "PROCESSING")
        self.assertFalse(response.is_simulated)

    def test_current_period_orders_descending_by_batch_id(self):
        today = datetime.now(REPORTING_TIMEZONE).date()
        start = today - timedelta(days=7)
        end = today - timedelta(days=1)

        batch1 = SettlementBatch(
            batch_id=1,
            restaurant_id=self.restaurant_id,
            period_start=today - timedelta(days=14),
            period_end=today - timedelta(days=8),
            settlement_date=today,
            total_orders=10,
            net_amount=Decimal("1000.00"),
            status="PENDING",
            is_simulated=True,
        )
        batch2 = SettlementBatch(
            batch_id=2,
            restaurant_id=self.restaurant_id,
            period_start=start,
            period_end=end,
            settlement_date=today,
            total_orders=20,
            net_amount=Decimal("2500.50"),
            status="PAID",
            is_simulated=False,
        )
        self.db.add_all([batch1, batch2])
        self.db.commit()

        result = get_current_settlement_period(
            db=self.db,
            owner=self.owner_mock,
        )

        response = CurrentSettlementPeriodResponse.model_validate(result)
        self.assertEqual(response.net_amount, "2500.50")
        self.assertEqual(response.status, "PAID")
        self.assertFalse(response.is_simulated)


if __name__ == "__main__":
    unittest.main()
