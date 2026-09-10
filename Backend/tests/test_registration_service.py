"""Regression tests for the final-only registration workflow.

These run against SQLite so no live PostgreSQL data is changed.
"""

import unittest
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.security import get_current_owner
from app.db.database import Base
from app.models.business_details import RestaurantBusinessDetails
from app.models.cuisine import CuisineType
from app.models.document import RestaurantDocument
from app.models.restaurant import Restaurant
from app.models.restaurant_owner import RestaurantOwner
from app.models.restaurant_registration_application import (
    RestaurantRegistrationApplication,
)
from app.schemas.document import RestaurantDocumentCreateRequest
from app.schemas.registration import RegistrationSubmitRequest
from app.services.registration import submit_registration


class RegistrationServiceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.owner = RestaurantOwner(
            name="Owner",
            email="owner@example.com",
            phone="9999999999",
            password_hash="hash",
        )
        self.cuisine = CuisineType(id=uuid4(), name="Indian")
        self.db.add_all([self.owner, self.cuisine])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def payload(self, **business_overrides):
        business = {
            "fssai_license_no": "FSSAI-001",
            "pan_number": "ABCDE1234F",
            "bank_name": "Bank",
            "account_number": "123456789",
            "ifsc_code": "BANK0001",
        }
        business.update(business_overrides)
        return RegistrationSubmitRequest.model_validate({
            "restaurant": {
                "name": "Test Kitchen",
                "address_line1": "1 Main Street",
                "city": "Pune",
                "postal_code": "411001",
            },
            "business_details": business,
            "cuisine_ids": [str(self.cuisine.id)],
            "documents": [],
        })

    def test_successful_submission_without_documents_is_atomic(self):
        submit_registration(self.db, owner_id=self.owner.id, payload=self.payload())

        self.assertEqual(self.db.query(Restaurant).count(), 1)
        self.assertEqual(self.db.query(RestaurantBusinessDetails).count(), 1)
        self.assertEqual(self.db.query(RestaurantDocument).count(), 0)
        application = self.db.query(RestaurantRegistrationApplication).one()
        self.assertEqual(application.status, "SUBMITTED")
        self.assertIsNotNone(application.submitted_at)

    def test_duplicate_fssai_pan_and_gst_return_conflict(self):
        cases = [
            ("FSSAI-001", "USEDPN001", None, {}),
            ("USED-FSSAI", "ABCDE1234F", None, {"fssai_license_no": "NEW-FSSAI"}),
            ("GST-FSSAI", "GSTPAN001", "GST-001", {
                "fssai_license_no": "GST-NEW-FSSAI",
                "pan_number": "GSTNEW001",
                "gst_number": "GST-001",
            }),
        ]
        for fssai, pan, gst, overrides in cases:
            with self.subTest(identifier=(fssai, pan, gst)):
                self.db.add(RestaurantBusinessDetails(
                    restaurant_id=uuid4(), fssai_license_no=fssai, pan_number=pan,
                    gst_number=gst, bank_name="Bank", account_number="1", ifsc_code="IFSC",
                ))
                self.db.commit()

                with self.assertRaises(HTTPException) as error:
                    submit_registration(
                        self.db, owner_id=self.owner.id, payload=self.payload(**overrides)
                    )
                self.assertEqual(error.exception.status_code, 409)
                self.assertEqual(self.db.query(Restaurant).count(), 0)

    def test_invalid_cuisine_does_not_create_any_records(self):
        request = self.payload()
        request.cuisine_ids = [uuid4()]

        with self.assertRaises(HTTPException) as error:
            submit_registration(self.db, owner_id=self.owner.id, payload=request)
        self.assertEqual(error.exception.status_code, 404)
        self.assertEqual(self.db.query(Restaurant).count(), 0)

    def test_invalid_document_type_does_not_create_any_records(self):
        request = self.payload()
        request.documents = [RestaurantDocumentCreateRequest(
            document_type="UNKNOWN", file_url="https://example.com/a"
        )]

        with self.assertRaises(HTTPException) as error:
            submit_registration(self.db, owner_id=self.owner.id, payload=request)
        self.assertEqual(error.exception.status_code, 400)
        self.assertEqual(self.db.query(Restaurant).count(), 0)

    def test_missing_access_cookie_is_unauthenticated(self):
        with self.assertRaises(HTTPException) as error:
            get_current_owner(access_token=None, db=None)
        self.assertEqual(error.exception.status_code, 401)

    def test_late_database_failure_rolls_back_restaurant_and_children(self):
        flush_count = 0

        def fail_second_flush(session, flush_context, instances):
            nonlocal flush_count
            flush_count += 1
            if flush_count == 2:
                raise RuntimeError("simulated database failure")

        event.listen(self.db, "before_flush", fail_second_flush)
        try:
            with self.assertRaisesRegex(RuntimeError, "simulated database failure"):
                submit_registration(self.db, owner_id=self.owner.id, payload=self.payload())
        finally:
            event.remove(self.db, "before_flush", fail_second_flush)

        self.assertEqual(self.db.query(Restaurant).count(), 0)
        self.assertEqual(self.db.query(RestaurantBusinessDetails).count(), 0)
        self.assertEqual(self.db.query(RestaurantRegistrationApplication).count(), 0)


if __name__ == "__main__":
    unittest.main()
