import unittest
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock, patch
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.v1.routes.menu import (
    MenuItemImageUpdateRequest,
    build_menu_item_response,
    confirm_menu_image_upload,
    update_menu_item_image,
)
from app.api.v1.routes.restaurant import (
    RestaurantImageConfirmRequest,
    confirm_restaurant_image_upload,
)
from app.models.customer_feedback import CustomerFeedback
from app.models.media_upload import MediaUpload
from app.models.menu_category import MenuCategory
from app.models.menu_item import MenuItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.restaurant import Restaurant
from app.services import s3_service
from app.services.analytics import (
    REPORTING_TIMEZONE,
    get_highest_revenue_items,
    get_top_selling_items,
    resolve_analytics_period,
)
from app.services.restaurant import get_restaurant_profile


class S3PublicUrlServiceTests(unittest.TestCase):
    def test_extract_s3_key_formats(self):
        key = "restaurants/abc-123/menu/dish-1.jpg"
        self.assertEqual(s3_service.extract_s3_key(key), key)
        self.assertEqual(s3_service.extract_s3_key(f"/{key}"), key)
        self.assertEqual(s3_service.extract_s3_key(f"  {key}  "), key)
        self.assertEqual(
            s3_service.extract_s3_key(
                f"https://{s3_service.AWS_S3_BUCKET}.s3.{s3_service.AWS_REGION}.amazonaws.com/{key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=300"
            ),
            key,
        )
        self.assertEqual(
            s3_service.extract_s3_key(
                f"https://s3.{s3_service.AWS_REGION}.amazonaws.com/{s3_service.AWS_S3_BUCKET}/{key}"
            ),
            key,
        )
        self.assertEqual(
            s3_service.extract_s3_key(f"s3://{s3_service.AWS_S3_BUCKET}/{key}"),
            key,
        )

    def test_extract_s3_key_ignores_non_bucket_and_sample_values(self):
        self.assertIsNone(s3_service.extract_s3_key(None))
        self.assertIsNone(s3_service.extract_s3_key(""))
        self.assertIsNone(s3_service.extract_s3_key("paneer"))
        self.assertIsNone(
            s3_service.extract_s3_key(
                "https://images.pexels.com/photos/247466/pexels-photo-247466.jpeg"
            )
        )
        self.assertIsNone(
            s3_service.extract_s3_key(
                "https://cdn.example.com/restaurants/other-site/logo.png"
            )
        )
        self.assertIsNone(
            s3_service.extract_s3_key("s3://another-bucket/restaurants/1/a.jpg")
        )

    def test_generate_public_url_for_restaurant_media(self):
        key = "restaurants/rest-1/menu/biryani photo.jpg"
        url = s3_service.generate_public_url(key)
        self.assertEqual(
            url,
            f"https://{s3_service.AWS_S3_BUCKET}.s3.{s3_service.AWS_REGION}.amazonaws.com/restaurants/rest-1/menu/biryani%20photo.jpg",
        )
        self.assertNotIn("X-Amz-", url)

        # Strips legacy presigned query params cleanly back to the permanent public URL
        presigned_legacy = (
            f"https://{s3_service.AWS_S3_BUCKET}.s3.{s3_service.AWS_REGION}.amazonaws.com/"
            "restaurants/rest-1/menu/item.png?X-Amz-Expires=300&X-Amz-Signature=deadbeef"
        )
        self.assertEqual(
            s3_service.generate_public_url(presigned_legacy),
            f"https://{s3_service.AWS_S3_BUCKET}.s3.{s3_service.AWS_REGION}.amazonaws.com/restaurants/rest-1/menu/item.png",
        )

    def test_generate_public_url_blocks_private_registration_documents(self):
        with self.assertRaises(ValueError):
            s3_service.generate_public_url("registration-documents/owner-1/fssai.pdf")

        with self.assertRaises(ValueError):
            s3_service.generate_public_url("paneer")

    def test_resolve_media_url(self):
        # Public S3 key -> permanent public URL
        self.assertEqual(
            s3_service.resolve_media_url("restaurants/r1/profile/logo/l1.png"),
            f"https://{s3_service.AWS_S3_BUCKET}.s3.{s3_service.AWS_REGION}.amazonaws.com/restaurants/r1/profile/logo/l1.png",
        )
        # External CDN / Pexels URL -> preserved unchanged
        self.assertEqual(
            s3_service.resolve_media_url("https://cdn.example.com/logo.png"),
            "https://cdn.example.com/logo.png",
        )
        # Sample mock key -> preserved unchanged for FoodImage fallback map
        self.assertEqual(s3_service.resolve_media_url("paneer"), "paneer")
        # Private registration document -> never exposed as public URL
        self.assertIsNone(
            s3_service.resolve_media_url("registration-documents/owner-1/pan.jpg")
        )
        self.assertIsNone(s3_service.resolve_media_url("   "))
        self.assertIsNone(s3_service.resolve_media_url(None))

    def test_generate_public_url_respects_custom_base_url_override(self):
        with patch.object(
            s3_service, "AWS_S3_PUBLIC_BASE_URL", "https://cdn.vigofeast.com/"
        ):
            self.assertEqual(
                s3_service.generate_public_url("restaurants/r1/menu/img.webp"),
                "https://cdn.vigofeast.com/restaurants/r1/menu/img.webp",
            )

    def test_generate_view_url_public_vs_private_and_upload_url_stays_presigned(self):
        with patch.object(s3_service, "_s3") as mock_s3:
            mock_s3.generate_presigned_url.return_value = (
                "https://vigofeast-media.s3.ap-south-2.amazonaws.com/signed?X-Amz-Expires=300"
            )

            # Public restaurants/* -> direct public URL (no presigning call)
            public_url = s3_service.generate_view_url("restaurants/r1/menu/a.jpg")
            self.assertEqual(
                public_url,
                f"https://{s3_service.AWS_S3_BUCKET}.s3.{s3_service.AWS_REGION}.amazonaws.com/restaurants/r1/menu/a.jpg",
            )
            mock_s3.generate_presigned_url.assert_not_called()

            # Private registration-documents/* -> still presigned GET
            private_url = s3_service.generate_view_url(
                "registration-documents/owner-1/doc.pdf"
            )
            self.assertIn("X-Amz-Expires=300", private_url)
            mock_s3.generate_presigned_url.assert_called_once_with(
                ClientMethod="get_object",
                Params={
                    "Bucket": s3_service.AWS_S3_BUCKET,
                    "Key": "registration-documents/owner-1/doc.pdf",
                },
                ExpiresIn=s3_service.S3_PRESIGNED_URL_EXPIRE_SECONDS,
            )

            mock_s3.generate_presigned_url.reset_mock()

            # Uploads stay presigned PUT
            upload_url = s3_service.generate_upload_url(
                "restaurants/r1/menu/new.jpg",
                "image/jpeg",
            )
            self.assertIn("X-Amz-Expires=300", upload_url)
            mock_s3.generate_presigned_url.assert_called_once_with(
                ClientMethod="put_object",
                Params={
                    "Bucket": s3_service.AWS_S3_BUCKET,
                    "Key": "restaurants/r1/menu/new.jpg",
                    "ContentType": "image/jpeg",
                },
                ExpiresIn=s3_service.S3_PRESIGNED_URL_EXPIRE_SECONDS,
            )


class S3PublicUrlEndpointIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Restaurant.__table__.create(self.engine)
        CustomerFeedback.__table__.create(self.engine)
        MenuCategory.__table__.create(self.engine)
        MenuItem.__table__.create(self.engine)
        MediaUpload.__table__.create(self.engine)
        Order.__table__.create(self.engine)
        OrderItem.__table__.create(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        self.owner_id = uuid4()
        self.restaurant_id = uuid4()
        self.category_id = uuid4()
        self.logo_key = f"restaurants/{self.restaurant_id}/profile/logo/{uuid4()}.png"
        self.cover_key = f"restaurants/{self.restaurant_id}/profile/cover/{uuid4()}.jpg"
        self.menu_key = f"restaurants/{self.restaurant_id}/menu/{uuid4()}.jpg"

        self.restaurant = Restaurant(
            id=self.restaurant_id,
            owner_id=self.owner_id,
            name="Biryani House",
            description="Authentic dum biryani",
            phone="+919876543210",
            email="test@biryani.com",
            logo_url=self.logo_key,
            cover_image_url=self.cover_key,
            address_line1="101 Jubilee Hills",
            city="Hyderabad",
            state="Telangana",
            postal_code="500033",
            is_deleted=False,
            is_active=True,
        )
        self.db.add(self.restaurant)

        self.category = MenuCategory(
            id=self.category_id,
            restaurant_id=self.restaurant_id,
            name="Desserts",
            display_order=1,
            is_active=True,
            is_deleted=False,
        )
        self.db.add(self.category)

        self.item = MenuItem(
            id=uuid4(),
            restaurant_id=self.restaurant_id,
            category_id=self.category_id,
            name="Double Ka Meetha",
            base_price=Decimal("99.00"),
            food_type="VEG",
            preparation_time_minutes=10,
            image_key=self.menu_key,
            availability_status="AVAILABLE",
            is_active=True,
            is_deleted=False,
        )
        self.db.add(self.item)
        self.db.commit()

        self.owner_mock = MagicMock()
        self.owner_mock.id = self.owner_id
        self.owner_mock.owner_id = self.owner_id

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_build_menu_item_response_uses_permanent_public_url(self):
        res = build_menu_item_response(self.item)
        self.assertEqual(
            res["image_url"],
            f"https://{s3_service.AWS_S3_BUCKET}.s3.{s3_service.AWS_REGION}.amazonaws.com/{self.menu_key}",
        )
        self.assertNotIn("X-Amz-", res["image_url"])

    def test_confirm_and_update_menu_item_image_return_permanent_public_url(self):
        new_key = f"restaurants/{self.restaurant_id}/menu/{uuid4()}.webp"
        upload = MediaUpload(
            restaurant_id=self.restaurant_id,
            object_key=new_key,
            media_type="MENU_IMAGE",
            content_type="image/webp",
            file_size_bytes=2048,
            status="PENDING",
        )
        self.db.add(upload)
        self.db.commit()

        with patch(
            "app.api.v1.routes.menu.get_object_metadata",
            return_value={"ContentLength": 2048, "ContentType": "image/webp"},
        ):
            confirm_res = confirm_menu_image_upload(
                object_key=new_key,
                payload=None,
                owner=self.owner_mock,
                db=self.db,
            )

        expected_url = (
            f"https://{s3_service.AWS_S3_BUCKET}.s3.{s3_service.AWS_REGION}.amazonaws.com/{new_key}"
        )
        self.assertEqual(confirm_res["status"], "CONFIRMED")
        self.assertEqual(confirm_res["image_url"], expected_url)

        update_res = update_menu_item_image(
            item_id=self.item.id,
            request=MenuItemImageUpdateRequest(object_key=new_key),
            owner=self.owner_mock,
            db=self.db,
        )
        self.assertEqual(update_res["image_url"], expected_url)
        self.assertNotIn("X-Amz-", update_res["image_url"])

    def test_restaurant_profile_and_confirm_return_permanent_public_urls(self):
        profile = get_restaurant_profile(db=self.db, owner_id=self.owner_id)
        base = f"https://{s3_service.AWS_S3_BUCKET}.s3.{s3_service.AWS_REGION}.amazonaws.com"
        self.assertEqual(profile["images"]["logo_url"], f"{base}/{self.logo_key}")
        self.assertEqual(profile["images"]["cover_image_url"], f"{base}/{self.cover_key}")

        new_logo_key = f"restaurants/{self.restaurant_id}/profile/logo/{uuid4()}.png"
        self.db.add(
            MediaUpload(
                restaurant_id=self.restaurant_id,
                object_key=new_logo_key,
                media_type="RESTAURANT_LOGO",
                content_type="image/png",
                file_size_bytes=4096,
                status="PENDING",
            )
        )
        self.db.commit()

        with patch(
            "app.api.v1.routes.restaurant.get_object_metadata",
            return_value={"ContentLength": 4096, "ContentType": "image/png"},
        ):
            confirm_res = confirm_restaurant_image_upload(
                payload=RestaurantImageConfirmRequest(object_key=new_logo_key),
                db=self.db,
                owner=self.owner_mock,
            )

        self.assertEqual(confirm_res["image_url"], f"{base}/{new_logo_key}")
        self.assertEqual(confirm_res["view_url"], f"{base}/{new_logo_key}")

    def test_analytics_top_selling_and_highest_revenue_resolve_public_image_url(self):
        now = datetime.now(REPORTING_TIMEZONE)
        order = Order(
            order_id=501,
            restaurant_id=self.restaurant_id,
            customer_id=1,
            order_status="DELIVERED",
            subtotal=Decimal("99.00"),
            total_amount=Decimal("99.00"),
            financial_finalized_at=now,
            created_at=now,
            is_deleted=False,
        )
        self.db.add(order)
        self.db.flush()
        self.db.add(
            OrderItem(
                order_item_id=5001,
                order_id=order.order_id,
                menu_item_id=self.item.id,
                quantity=2,
                unit_price=Decimal("99.00"),
                line_total=Decimal("198.00"),
                is_active=True,
                is_deleted=False,
            )
        )
        self.db.commit()

        period_data = resolve_analytics_period(period="today")
        expected_url = (
            f"https://{s3_service.AWS_S3_BUCKET}.s3.{s3_service.AWS_REGION}.amazonaws.com/{self.menu_key}"
        )

        top = get_top_selling_items(
            db=self.db,
            restaurant_id=self.restaurant_id,
            period_data=period_data,
        )
        highest = get_highest_revenue_items(
            db=self.db,
            restaurant_id=self.restaurant_id,
            period_data=period_data,
        )
        self.assertEqual(top["items"][0]["image_url"], expected_url)
        self.assertEqual(highest["items"][0]["image_url"], expected_url)


if __name__ == "__main__":
    unittest.main()

