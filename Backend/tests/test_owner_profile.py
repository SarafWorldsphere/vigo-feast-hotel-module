import unittest
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.restaurant_owner import RestaurantOwner
from app.schemas.owner import OwnerProfileResponse, OwnerProfileUpdate
from app.services.owner import get_owner_profile, update_owner_profile


class OwnerProfileServiceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        RestaurantOwner.__table__.create(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        self.owner_id = uuid4()
        self.owner = RestaurantOwner(
            id=self.owner_id,
            name="Rahul Sharma",
            email="rahul.sharma@example.com",
            phone="+919876543210",
            password_hash="fakehash123",
            is_verified=True,
            is_active=True,
            is_deleted=False,
        )
        self.db.add(self.owner)

        self.other_owner_id = uuid4()
        self.other_owner = RestaurantOwner(
            id=self.other_owner_id,
            name="Priya Patel",
            email="priya@example.com",
            phone="+919123456789",
            password_hash="fakehash456",
            is_verified=False,
            is_active=True,
            is_deleted=False,
        )
        self.db.add(self.other_owner)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_get_owner_profile_success(self):
        owner = get_owner_profile(
            db=self.db,
            owner_id=self.owner_id,
        )
        self.assertEqual(owner.id, self.owner_id)
        self.assertEqual(owner.name, "Rahul Sharma")
        self.assertEqual(owner.email, "rahul.sharma@example.com")
        self.assertEqual(owner.phone, "+919876543210")
        self.assertTrue(owner.is_verified)
        self.assertTrue(owner.is_active)

        # Test response schema serialization
        response = OwnerProfileResponse.model_validate(owner)
        self.assertEqual(response.name, "Rahul Sharma")
        self.assertEqual(response.is_verified, True)

    def test_get_owner_profile_not_found(self):
        with self.assertRaises(HTTPException) as ctx:
            get_owner_profile(
                db=self.db,
                owner_id=uuid4(),
            )
        self.assertEqual(ctx.exception.status_code, 404)

    def test_get_owner_profile_deleted_returns_404(self):
        self.owner.is_deleted = True
        self.db.commit()

        with self.assertRaises(HTTPException) as ctx:
            get_owner_profile(
                db=self.db,
                owner_id=self.owner_id,
            )
        self.assertEqual(ctx.exception.status_code, 404)

    def test_update_owner_name_only(self):
        payload = OwnerProfileUpdate(name="Rahul S.")
        updated = update_owner_profile(
            db=self.db,
            owner_id=self.owner_id,
            payload=payload,
        )
        self.assertEqual(updated.name, "Rahul S.")
        self.assertEqual(updated.email, "rahul.sharma@example.com")
        self.assertEqual(updated.phone, "+919876543210")

    def test_update_owner_name_and_phone(self):
        payload = OwnerProfileUpdate(
            name="Rahul Sharma",
            phone="+91 98765 43210",
        )
        updated = update_owner_profile(
            db=self.db,
            owner_id=self.owner_id,
            payload=payload,
        )
        self.assertEqual(updated.name, "Rahul Sharma")
        self.assertEqual(updated.phone, "+91 98765 43210")

    def test_update_owner_email_only(self):
        payload = OwnerProfileUpdate(email="newemail@example.com")
        updated = update_owner_profile(
            db=self.db,
            owner_id=self.owner_id,
            payload=payload,
        )
        self.assertEqual(updated.email, "newemail@example.com")

    def test_update_duplicate_email_conflict(self):
        payload = OwnerProfileUpdate(email="priya@example.com")
        with self.assertRaises(HTTPException) as ctx:
            update_owner_profile(
                db=self.db,
                owner_id=self.owner_id,
                payload=payload,
            )
        self.assertEqual(ctx.exception.status_code, 409)

    def test_update_duplicate_phone_conflict(self):
        payload = OwnerProfileUpdate(phone="+919123456789")
        with self.assertRaises(HTTPException) as ctx:
            update_owner_profile(
                db=self.db,
                owner_id=self.owner_id,
                payload=payload,
            )
        self.assertEqual(ctx.exception.status_code, 409)

    def test_update_empty_payload_raises_400(self):
        payload = OwnerProfileUpdate()
        with self.assertRaises(HTTPException) as ctx:
            update_owner_profile(
                db=self.db,
                owner_id=self.owner_id,
                payload=payload,
            )
        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
