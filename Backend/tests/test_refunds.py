import unittest
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.complaint import Complaint
from app.models.order import Order
from app.models.payment import Payment
from app.models.refund import Refund
from app.models.restaurant import Restaurant
from app.models.restaurant_owner import RestaurantOwner
from app.schemas.refunds import RefundCreate
from app.services.refunds import create_refund


class RefundServiceTests(unittest.TestCase):
    def setUp(self):
        # In-memory SQLite for testing refund business logic
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Seed test entities
        self.owner_id = uuid4()
        self.restaurant_id = uuid4()

        self.owner = RestaurantOwner(
            id=self.owner_id,
            name="Test Owner",
            email="owner@test.com",
            phone="+919876543210",
            password_hash="test_hashed_password",
            is_active=True,
            is_verified=True,
        )
        self.db.add(self.owner)

        self.restaurant = Restaurant(
            id=self.restaurant_id,
            owner_id=self.owner_id,
            name="Test Kitchen",
            description="Test Kitchen Description",
            phone="+919876543210",
            email="kitchen@test.com",
            address_line1="123 Food Street",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560001",
            is_active=True,
            is_deleted=False,
        )
        self.db.add(self.restaurant)

        self.order = Order(
            order_id=101,
            restaurant_id=self.restaurant_id,
            customer_id=1,
            order_status="DELIVERED",
            total_amount=Decimal("445.00"),
            subtotal=Decimal("400.00"),
            gst_amount=Decimal("20.00"),
            delivery_charge=Decimal("25.00"),
            discount_amount=Decimal("0.00"),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.db.add(self.order)

        self.demo_payment = Payment(
            payment_id=1,
            order_id=self.order.order_id,
            amount=Decimal("445.00"),
            method="demo",
            gateway_name="DEMO",
            payment_status="completed",
            is_active=True,
            is_deleted=False,
        )
        self.db.add(self.demo_payment)

        self.resolved_complaint = Complaint(
            complaint_id=201,
            restaurant_id=self.restaurant_id,
            order_id=self.order.order_id,
            customer_id=1,
            category="MISSING_ITEM",
            description="Item was missing from bag",
            status="RESOLVED",
            priority="NORMAL",
            resolution_note="Owner approved partial compensation",
            resolved_at=datetime.now(timezone.utc),
            is_active=True,
            is_deleted=False,
        )
        self.db.add(self.resolved_complaint)

        self.open_complaint = Complaint(
            complaint_id=202,
            restaurant_id=self.restaurant_id,
            order_id=self.order.order_id,
            customer_id=1,
            category="MISSING_ITEM",
            description="Item was missing",
            status="OPEN",
            priority="NORMAL",
            is_active=True,
            is_deleted=False,
        )
        self.db.add(self.open_complaint)

        self.rejected_complaint = Complaint(
            complaint_id=203,
            restaurant_id=self.restaurant_id,
            order_id=self.order.order_id,
            customer_id=1,
            category="FOOD_QUALITY",
            description="Customer complaint rejected",
            status="REJECTED",
            priority="NORMAL",
            rejection_reason="Package delivered intact and warm",
            is_active=True,
            is_deleted=False,
        )
        self.db.add(self.rejected_complaint)

        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_demo_mode_disabled_rejects_refund_creation(self):
        """When ALLOW_DEMO_REFUND_CREATION is False (default), demo payments must be rejected with 409."""
        payload = RefundCreate(
            amount=Decimal("150.00"),
            reason="Missing item compensation",
            destination_method="ORIGINAL_PAYMENT_METHOD",
            idempotency_key=uuid4(),
        )

        with patch("app.core.config.ALLOW_DEMO_REFUND_CREATION", False):
            with self.assertRaises(HTTPException) as ctx:
                create_refund(
                    db=self.db,
                    restaurant_id=self.restaurant_id,
                    owner_id=self.owner_id,
                    complaint_id=self.resolved_complaint.complaint_id,
                    payload=payload,
                )
            self.assertEqual(ctx.exception.status_code, 409)
            self.assertIn("Refund creation is disabled for demo payments", ctx.exception.detail)

        # Verify zero refunds created in database
        count = self.db.query(Refund).count()
        self.assertEqual(count, 0)

    def test_demo_mode_enabled_creates_pending_refund_without_payout(self):
        """When ALLOW_DEMO_REFUND_CREATION is True, a PENDING refund record is created without execution."""
        payload = RefundCreate(
            amount=Decimal("150.00"),
            reason="Missing item compensation",
            destination_method="ORIGINAL_PAYMENT_METHOD",
            idempotency_key=uuid4(),
        )

        with patch("app.core.config.ALLOW_DEMO_REFUND_CREATION", True):
            refund = create_refund(
                db=self.db,
                restaurant_id=self.restaurant_id,
                owner_id=self.owner_id,
                complaint_id=self.resolved_complaint.complaint_id,
                payload=payload,
            )

        self.assertIsNotNone(refund.refund_id)
        self.assertEqual(refund.status, "PENDING")
        self.assertEqual(refund.amount, Decimal("150.00"))
        self.assertEqual(refund.complaint_id, self.resolved_complaint.complaint_id)
        self.assertEqual(refund.order_id, self.order.order_id)
        self.assertIsNone(refund.completed_at)
        self.assertIsNone(refund.execution_reference)

    def test_unresolved_complaint_rejects_refund(self):
        """Refund cannot be created for complaints that are OPEN or REJECTED."""
        payload = RefundCreate(
            amount=Decimal("50.00"),
            reason="Item missing",
            destination_method="ORIGINAL_PAYMENT_METHOD",
            idempotency_key=uuid4(),
        )

        with patch("app.core.config.ALLOW_DEMO_REFUND_CREATION", True):
            # Test OPEN complaint
            with self.assertRaises(HTTPException) as ctx_open:
                create_refund(
                    db=self.db,
                    restaurant_id=self.restaurant_id,
                    owner_id=self.owner_id,
                    complaint_id=self.open_complaint.complaint_id,
                    payload=payload,
                )
            self.assertEqual(ctx_open.exception.status_code, 409)
            self.assertIn("Only resolved complaints can be refunded", ctx_open.exception.detail)

            # Test REJECTED complaint
            with self.assertRaises(HTTPException) as ctx_rej:
                create_refund(
                    db=self.db,
                    restaurant_id=self.restaurant_id,
                    owner_id=self.owner_id,
                    complaint_id=self.rejected_complaint.complaint_id,
                    payload=payload,
                )
            self.assertEqual(ctx_rej.exception.status_code, 409)
            self.assertIn("Only resolved complaints can be refunded", ctx_rej.exception.detail)

    def test_duplicate_refund_attempt_for_same_complaint_rejected(self):
        """Only one refund record can be created per complaint."""
        payload1 = RefundCreate(
            amount=Decimal("100.00"),
            reason="Initial partial refund",
            destination_method="ORIGINAL_PAYMENT_METHOD",
            idempotency_key=uuid4(),
        )

        with patch("app.core.config.ALLOW_DEMO_REFUND_CREATION", True):
            create_refund(
                db=self.db,
                restaurant_id=self.restaurant_id,
                owner_id=self.owner_id,
                complaint_id=self.resolved_complaint.complaint_id,
                payload=payload1,
            )

            # Second refund for the same complaint with different idempotency key
            payload2 = RefundCreate(
                amount=Decimal("50.00"),
                reason="Second refund attempt",
                destination_method="ORIGINAL_PAYMENT_METHOD",
                idempotency_key=uuid4(),
            )

            with self.assertRaises(HTTPException) as ctx:
                create_refund(
                    db=self.db,
                    restaurant_id=self.restaurant_id,
                    owner_id=self.owner_id,
                    complaint_id=self.resolved_complaint.complaint_id,
                    payload=payload2,
                )
            self.assertEqual(ctx.exception.status_code, 409)
            self.assertIn("A refund already exists for this complaint", ctx.exception.detail)

    def test_idempotency_key_behavior(self):
        """Retrying with the same idempotency key returns the original record if identical, or 409 if modified."""
        shared_key = uuid4()
        payload = RefundCreate(
            amount=Decimal("120.00"),
            reason="Idempotent refund",
            destination_method="ORIGINAL_PAYMENT_METHOD",
            idempotency_key=shared_key,
        )

        with patch("app.core.config.ALLOW_DEMO_REFUND_CREATION", True):
            r1 = create_refund(
                db=self.db,
                restaurant_id=self.restaurant_id,
                owner_id=self.owner_id,
                complaint_id=self.resolved_complaint.complaint_id,
                payload=payload,
            )

            # Same request and same key -> returns original refund
            r2 = create_refund(
                db=self.db,
                restaurant_id=self.restaurant_id,
                owner_id=self.owner_id,
                complaint_id=self.resolved_complaint.complaint_id,
                payload=payload,
            )
            self.assertEqual(r1.refund_id, r2.refund_id)

            # Different payload with previously used key -> raises 409
            diff_payload = RefundCreate(
                amount=Decimal("200.00"),
                reason="Modified request",
                destination_method="ORIGINAL_PAYMENT_METHOD",
                idempotency_key=shared_key,
            )
            with self.assertRaises(HTTPException) as ctx:
                create_refund(
                    db=self.db,
                    restaurant_id=self.restaurant_id,
                    owner_id=self.owner_id,
                    complaint_id=self.resolved_complaint.complaint_id,
                    payload=diff_payload,
                )
            self.assertEqual(ctx.exception.status_code, 409)
            self.assertIn("Idempotency key has already been used", ctx.exception.detail)

    def test_refund_amount_exceeding_balance_rejected(self):
        """Refund amount greater than the order's refundable balance must raise 422."""
        excessive_payload = RefundCreate(
            amount=Decimal("500.00"),  # Order total is 445.00
            reason="Exceeding total amount",
            destination_method="ORIGINAL_PAYMENT_METHOD",
            idempotency_key=uuid4(),
        )

        with patch("app.core.config.ALLOW_DEMO_REFUND_CREATION", True):
            with self.assertRaises(HTTPException) as ctx:
                create_refund(
                    db=self.db,
                    restaurant_id=self.restaurant_id,
                    owner_id=self.owner_id,
                    complaint_id=self.resolved_complaint.complaint_id,
                    payload=excessive_payload,
                )
            self.assertEqual(ctx.exception.status_code, 422)
            self.assertIn("Refund exceeds the remaining refundable balance", ctx.exception.detail)


if __name__ == "__main__":
    unittest.main()
