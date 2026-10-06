import unittest
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.customer_feedback import CustomerFeedback
from app.models.restaurant import Restaurant
from app.schemas.restaurant import (
    RestaurantImagesResponse,
    RestaurantAddressResponse,
    RestaurantRatingResponse,
    RestaurantProfileResponse,
)
from app.services.restaurant import get_restaurant_profile


class RestaurantProfileServiceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Restaurant.__table__.create(self.engine)
        CustomerFeedback.__table__.create(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        self.owner_id = uuid4()
        self.restaurant_id = uuid4()
        self.restaurant = Restaurant(
            id=self.restaurant_id,
            owner_id=self.owner_id,
            name="Spice Garden",
            description="Fine dining authentic Indian flavours",
            phone="+91 9876543210",
            email="spice@garden.com",
            logo_url="https://cdn.example.com/logo.png",
            cover_image_url="https://cdn.example.com/cover.png",
            address_line1="100 Tech Park Blvd",
            address_line2="Phase 2, Floor 1",
            city="Hyderabad",
            state="Telangana",
            postal_code="500081",
            latitude=17.4485,
            longitude=78.3748,
            is_deleted=False,
            is_active=True,
        )
        self.db.add(self.restaurant)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_get_restaurant_profile_without_reviews(self):
        profile = get_restaurant_profile(
            db=self.db,
            owner_id=self.owner_id,
        )

        self.assertIsInstance(profile, dict)
        self.assertEqual(profile["id"], self.restaurant_id)
        self.assertEqual(profile["name"], "Spice Garden")
        self.assertEqual(profile["description"], "Fine dining authentic Indian flavours")
        self.assertEqual(profile["phone"], "+91 9876543210")
        self.assertEqual(profile["email"], "spice@garden.com")

        # Nested images
        self.assertEqual(profile["images"]["logo_url"], "https://cdn.example.com/logo.png")
        self.assertEqual(profile["images"]["cover_image_url"], "https://cdn.example.com/cover.png")

        # Nested address
        self.assertEqual(profile["address"]["address_line1"], "100 Tech Park Blvd")
        self.assertEqual(profile["address"]["address_line2"], "Phase 2, Floor 1")
        self.assertEqual(profile["address"]["city"], "Hyderabad")
        self.assertEqual(profile["address"]["state"], "Telangana")
        self.assertEqual(profile["address"]["postal_code"], "500081")

        # Nested rating defaults when no reviews
        self.assertEqual(profile["rating"]["average"], 0.0)
        self.assertEqual(profile["rating"]["total_reviews"], 0)

        # Validate with Pydantic response schema
        validated = RestaurantProfileResponse.model_validate(profile)
        self.assertEqual(validated.name, "Spice Garden")
        self.assertEqual(validated.rating.average, 0.0)
        self.assertEqual(validated.rating.total_reviews, 0)

    def test_get_restaurant_profile_with_customer_feedback(self):
        now = datetime.now(timezone.utc)
        feedbacks = [
            CustomerFeedback(
                feedback_id=1,
                order_id=101,
                customer_id=201,
                restaurant_id=self.restaurant_id,
                rating=5,
                comments="Outstanding food!",
                created_at=now,
                is_active=True,
                is_deleted=False,
            ),
            CustomerFeedback(
                feedback_id=2,
                order_id=102,
                customer_id=202,
                restaurant_id=self.restaurant_id,
                rating=4,
                comments="Very good biryani",
                created_at=now,
                is_active=True,
                is_deleted=False,
            ),
            # Inactive or deleted feedback should be excluded
            CustomerFeedback(
                feedback_id=3,
                order_id=103,
                customer_id=203,
                restaurant_id=self.restaurant_id,
                rating=1,
                comments="Spam",
                created_at=now,
                is_active=False,
                is_deleted=False,
            ),
            CustomerFeedback(
                feedback_id=4,
                order_id=104,
                customer_id=204,
                restaurant_id=self.restaurant_id,
                rating=1,
                comments="Deleted review",
                created_at=now,
                is_active=True,
                is_deleted=True,
            ),
        ]
        self.db.add_all(feedbacks)
        self.db.commit()

        profile = get_restaurant_profile(
            db=self.db,
            owner_id=self.owner_id,
        )

        # Active non-deleted ratings: 5 and 4 -> Average = (5 + 4) / 2 = 4.5
        self.assertEqual(profile["rating"]["average"], 4.5)
        self.assertEqual(profile["rating"]["total_reviews"], 2)

        # Validate with Pydantic response schema
        validated = RestaurantProfileResponse.model_validate(profile)
        self.assertEqual(validated.rating.average, 4.5)
        self.assertEqual(validated.rating.total_reviews, 2)


    def test_get_restaurant_profile_not_found(self):
        unknown_owner = uuid4()
        with self.assertRaises(HTTPException) as ctx:
            get_restaurant_profile(
                db=self.db,
                owner_id=unknown_owner,
            )
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertEqual(ctx.exception.detail, "Restaurant not found")

    def test_get_restaurant_profile_deleted_restaurant_not_found(self):
        self.restaurant.is_deleted = True
        self.db.commit()

        with self.assertRaises(HTTPException) as ctx:
            get_restaurant_profile(
                db=self.db,
                owner_id=self.owner_id,
            )
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
