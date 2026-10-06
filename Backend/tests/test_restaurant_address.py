import unittest
from uuid import uuid4

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.restaurant import Restaurant
from app.schemas.restaurant import (
    RestaurantAddressResponse,
    RestaurantAddressUpdate,
)
from app.services.restaurant import update_restaurant_address


class RestaurantAddressSchemaAndServiceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Restaurant.__table__.create(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        self.owner_id = uuid4()
        self.restaurant = Restaurant(
            id=uuid4(),
            owner_id=self.owner_id,
            name="Test Bistro",
            address_line1="123 Old Street",
            address_line2="Suite 4B",
            city="Old City",
            state="Old State",
            postal_code="12345",
        )
        self.db.add(self.restaurant)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_schema_valid_partial_update(self):
        payload = RestaurantAddressUpdate(
            address_line1="456 New Ave",
            city="New City",
        )
        self.assertEqual(payload.address_line1, "456 New Ave")
        self.assertEqual(payload.city, "New City")
        self.assertIsNone(payload.address_line2)
        self.assertIsNone(payload.state)
        self.assertIsNone(payload.postal_code)

    def test_schema_max_length_validation(self):
        with self.assertRaises(ValidationError):
            RestaurantAddressUpdate(postal_code="A" * 21)

        with self.assertRaises(ValidationError):
            RestaurantAddressUpdate(city="B" * 101)

        with self.assertRaises(ValidationError):
            RestaurantAddressUpdate(state="C" * 101)

        with self.assertRaises(ValidationError):
            RestaurantAddressUpdate(address_line1="D" * 256)

        with self.assertRaises(ValidationError):
            RestaurantAddressUpdate(address_line2="E" * 256)

    def test_response_schema_from_attributes(self):
        response = RestaurantAddressResponse.model_validate(self.restaurant)
        self.assertEqual(response.address_line1, "123 Old Street")
        self.assertEqual(response.address_line2, "Suite 4B")
        self.assertEqual(response.city, "Old City")
        self.assertEqual(response.state, "Old State")
        self.assertEqual(response.postal_code, "12345")

    def test_update_restaurant_address_success(self):
        update_data = RestaurantAddressUpdate(
            address_line1="789 Boulevard Rd",
            postal_code="67890",
        )
        updated = update_restaurant_address(
            db=self.db,
            owner_id=self.owner_id,
            payload=update_data,
        )
        self.assertEqual(updated.address_line1, "789 Boulevard Rd")
        self.assertEqual(updated.postal_code, "67890")
        # Unchanged fields remain intact
        self.assertEqual(updated.address_line2, "Suite 4B")
        self.assertEqual(updated.city, "Old City")
        self.assertEqual(updated.state, "Old State")

    def test_update_restaurant_address_empty_raises_400(self):
        empty_payload = RestaurantAddressUpdate()
        with self.assertRaises(HTTPException) as ctx:
            update_restaurant_address(
                db=self.db,
                owner_id=self.owner_id,
                payload=empty_payload,
            )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("No fields provided for update", ctx.exception.detail)


if __name__ == "__main__":
    unittest.main()
