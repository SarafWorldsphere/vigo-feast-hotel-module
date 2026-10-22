import csv
import unittest
from datetime import datetime
from decimal import Decimal
from io import StringIO
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.order import Order
from app.models.refund import Refund
from app.models.restaurant import Restaurant
from app.services.financial_reporting import export_earnings_csv

REPORTING_TIMEZONE = ZoneInfo("Asia/Kolkata")


class EarningsExportCsvTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Restaurant.__table__.create(self.engine)
        Order.__table__.create(self.engine)
        Refund.__table__.create(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        self.restaurant_id = uuid4()
        self.owner_id = uuid4()
        self.restaurant = Restaurant(
            id=self.restaurant_id,
            owner_id=self.owner_id,
            name="Export Test Kitchen",
            phone="+919876543210",
            email="export@test.com",
            address_line1="123 Export Way",
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

    def test_export_earnings_csv_output(self):
        start = datetime(2026, 10, 1, 0, 0, tzinfo=REPORTING_TIMEZONE)
        end = datetime(2026, 10, 2, 0, 0, tzinfo=REPORTING_TIMEZONE)
        order_time = datetime(2026, 10, 1, 14, 0, tzinfo=REPORTING_TIMEZONE)

        order = Order(
            order_id=501,
            customer_id=1,
            restaurant_id=self.restaurant_id,
            order_status="DELIVERED",
            subtotal=Decimal("400.00"),
            restaurant_discount_amount=Decimal("40.00"),
            commission_amount=Decimal("40.00"),
            commission_tax_amount=Decimal("7.20"),
            other_fee_amount=Decimal("5.00"),
            financial_finalized_at=order_time,
            created_at=order_time,
            is_deleted=False,
        )
        self.db.add(order)
        self.db.commit()

        csv_str = export_earnings_csv(
            db=self.db,
            restaurant_id=self.restaurant_id,
            start=start,
            end=end,
        )

        reader = list(csv.reader(StringIO(csv_str)))
        self.assertEqual(len(reader), 2)  # header + 1 order

        header = reader[0]
        self.assertEqual(
            header,
            [
                "Order ID",
                "Order Date",
                "Gross Sales",
                "Restaurant Discounts",
                "Commission",
                "Commission Tax",
                "Other Fees",
                "Net Earnings Before Refunds",
                "Currency",
            ],
        )

        row = reader[1]
        self.assertEqual(row[0], "501")
        self.assertEqual(row[2], "400.00")
        self.assertEqual(row[3], "40.00")
        self.assertEqual(row[4], "40.00")
        self.assertEqual(row[5], "7.20")
        self.assertEqual(row[6], "5.00")
        # Net Before Refunds = 400 - 40 - 40 - 7.20 - 5 = 307.80
        self.assertEqual(row[7], "307.80")
        self.assertEqual(row[8], "INR")



if __name__ == "__main__":
    unittest.main()
