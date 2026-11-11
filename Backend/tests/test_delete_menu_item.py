import unittest
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock, patch
from uuid import uuid4

from botocore.exceptions import ClientError
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.v1.routes.menu import (
    delete_menu_item,
    list_menu_items,
    router as menu_router,
)
from app.main import app as fastapi_app
from app.models.customer_feedback import CustomerFeedback  # registers SQLite INET compile rule
from app.models.media_upload import MediaUpload
from app.models.menu_category import MenuCategory
from app.models.menu_item import MenuItem
from app.models.offer import Offer, OfferItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.restaurant import Restaurant
from app.services import s3_service


class DeleteMenuItemEndpointTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Restaurant.__table__.create(self.engine)
        MenuCategory.__table__.create(self.engine)
        MenuItem.__table__.create(self.engine)
        MediaUpload.__table__.create(self.engine)
        Offer.__table__.create(self.engine)
        OfferItem.__table__.create(self.engine)
        Order.__table__.create(self.engine)
        OrderItem.__table__.create(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        self.owner_id = uuid4()
        self.restaurant_id = uuid4()
        self.category_id = uuid4()
        self.image_key = f"restaurants/{self.restaurant_id}/menu/{uuid4()}.jpg"

        self.restaurant = Restaurant(
            id=self.restaurant_id,
            owner_id=self.owner_id,
            name="Vigo Feast Kitchen",
            description="Authentic cuisine",
            phone="+919876543210",
            email="kitchen@example.com",
            address_line1="Road 12, Banjara Hills",
            city="Hyderabad",
            state="Telangana",
            postal_code="500034",
            is_deleted=False,
            is_active=True,
        )
        self.db.add(self.restaurant)

        self.category = MenuCategory(
            id=self.category_id,
            restaurant_id=self.restaurant_id,
            name="Starters",
            display_order=1,
            is_active=True,
            is_deleted=False,
        )
        self.db.add(self.category)

        self.item = MenuItem(
            id=uuid4(),
            restaurant_id=self.restaurant_id,
            category_id=self.category_id,
            name="Paneer Tikka",
            description="Chargrilled cottage cheese",
            base_price=Decimal("240.00"),
            food_type="VEG",
            preparation_time_minutes=15,
            image_key=self.image_key,
            availability_status="AVAILABLE",
            is_active=True,
            is_deleted=False,
        )
        self.db.add(self.item)

        self.upload = MediaUpload(
            restaurant_id=self.restaurant_id,
            object_key=self.image_key,
            media_type="MENU_IMAGE",
            content_type="image/jpeg",
            file_size_bytes=12345,
            status="CONFIRMED",
            confirmed_at=datetime.now(timezone.utc),
        )
        self.db.add(self.upload)
        self.db.commit()

        self.owner_mock = MagicMock()
        self.owner_mock.id = self.owner_id
        self.owner_mock.owner_id = self.owner_id

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_delete_unordered_item_removes_db_row_offer_link_and_s3_image(self):
        now = datetime.now(timezone.utc)
        offer = Offer(
            offer_id=101,
            offer_code="SAVE20",
            offer_name="Save 20%",
            discount_type="PERCENTAGE",
            discount_value=Decimal("20.00"),
            min_order_amount=Decimal("100.00"),
            valid_from=now,
            valid_to=now,
            status="ACTIVE",
            restaurant_id=self.restaurant_id,
            is_active=True,
            is_deleted=False,
        )
        self.db.add(offer)
        self.db.flush()
        self.db.add(OfferItem(offer_id=101, menu_item_id=self.item.id))
        self.db.commit()

        mock_s3 = MagicMock()
        with patch.object(s3_service, "_s3", mock_s3):
            res = delete_menu_item(
                item_id=self.item.id,
                owner=self.owner_mock,
                db=self.db,
            )

        self.assertTrue(res["success"])
        self.assertEqual(res["item_id"], str(self.item.id))
        self.assertTrue(res["deleted_from_db"])
        self.assertTrue(res["image_deleted"])
        self.assertFalse(res["image_cleanup_pending"])

        # Hard-deleted from DB and gone from list_menu_items & OfferItem
        self.assertIsNone(
            self.db.query(MenuItem).filter(MenuItem.id == self.item.id).first()
        )
        self.assertEqual(
            self.db.query(OfferItem).filter(OfferItem.menu_item_id == self.item.id).count(),
            0,
        )
        self.assertEqual(list_menu_items(owner=self.owner_mock, db=self.db), [])

        # S3 head_object & delete_object called against configured bucket/key
        mock_s3.head_object.assert_called_once_with(
            Bucket=s3_service.AWS_S3_BUCKET,
            Key=self.image_key,
        )
        mock_s3.delete_object.assert_called_once_with(
            Bucket=s3_service.AWS_S3_BUCKET,
            Key=self.image_key,
        )

        # MediaUpload marked DELETED
        self.db.refresh(self.upload)
        self.assertEqual(self.upload.status, "DELETED")
        self.assertIsNotNone(self.upload.deleted_at)

    def test_delete_ordered_item_soft_deletes_db_row_and_deletes_s3_image(self):
        now = datetime.now(timezone.utc)
        order = Order(
            order_id=9001,
            customer_id=1,
            restaurant_id=self.restaurant_id,
            order_status="DELIVERED",
            subtotal=Decimal("240.00"),
            total_amount=Decimal("240.00"),
            created_at=now,
            is_deleted=False,
        )
        self.db.add(order)
        self.db.flush()
        self.db.add(
            OrderItem(
                order_item_id=90001,
                order_id=9001,
                menu_item_id=self.item.id,
                quantity=1,
                unit_price=Decimal("240.00"),
                line_total=Decimal("240.00"),
                is_active=True,
                is_deleted=False,
            )
        )
        self.db.commit()

        mock_s3 = MagicMock()
        with patch.object(s3_service, "_s3", mock_s3):
            res = delete_menu_item(
                item_id=self.item.id,
                owner=self.owner_mock,
                db=self.db,
            )

        self.assertTrue(res["success"])
        self.assertFalse(res["deleted_from_db"])
        self.assertTrue(res["image_deleted"])
        self.assertFalse(res["image_cleanup_pending"])

        # Preserved for historical order integrity, soft-deleted and key cleared
        db_item = self.db.query(MenuItem).filter(MenuItem.id == self.item.id).first()
        self.assertIsNotNone(db_item)
        self.assertTrue(db_item.is_deleted)
        self.assertFalse(db_item.is_active)
        self.assertIsNone(db_item.image_key)
        self.assertEqual(list_menu_items(owner=self.owner_mock, db=self.db), [])

        mock_s3.delete_object.assert_called_once_with(
            Bucket=s3_service.AWS_S3_BUCKET,
            Key=self.image_key,
        )
        self.db.refresh(self.upload)
        self.assertEqual(self.upload.status, "DELETED")

    def test_delete_item_handles_public_url_stored_as_image_key(self):
        self.item.image_key = s3_service.generate_public_url(self.image_key)
        self.db.commit()

        mock_s3 = MagicMock()
        with patch.object(s3_service, "_s3", mock_s3):
            res = delete_menu_item(
                item_id=self.item.id,
                owner=self.owner_mock,
                db=self.db,
            )

        self.assertTrue(res["image_deleted"])
        self.assertFalse(res["image_cleanup_pending"])
        mock_s3.delete_object.assert_called_once_with(
            Bucket=s3_service.AWS_S3_BUCKET,
            Key=self.image_key,
        )

    def test_delete_item_skips_s3_deletion_when_image_is_shared_by_active_item(self):
        sibling_item = MenuItem(
            id=uuid4(),
            restaurant_id=self.restaurant_id,
            category_id=self.category_id,
            name="Paneer Tikka Combo",
            base_price=Decimal("320.00"),
            food_type="VEG",
            preparation_time_minutes=15,
            image_key=self.image_key,
            availability_status="AVAILABLE",
            is_active=True,
            is_deleted=False,
        )
        self.db.add(sibling_item)
        self.db.commit()

        mock_s3 = MagicMock()
        with patch.object(s3_service, "_s3", mock_s3):
            res = delete_menu_item(
                item_id=self.item.id,
                owner=self.owner_mock,
                db=self.db,
            )

        self.assertTrue(res["deleted_from_db"])
        self.assertFalse(res["image_deleted"])
        self.assertFalse(res["image_cleanup_pending"])
        mock_s3.head_object.assert_not_called()
        mock_s3.delete_object.assert_not_called()
        self.db.refresh(self.upload)
        self.assertEqual(self.upload.status, "CONFIRMED")

    def test_delete_item_without_s3_image_or_missing_s3_object(self):
        # 1. Missing object in S3 (404 from head_object)
        mock_s3 = MagicMock()
        mock_s3.head_object.side_effect = ClientError(
            {"Error": {"Code": "404", "Message": "Not Found"}},
            "HeadObject",
        )
        with patch.object(s3_service, "_s3", mock_s3):
            res = delete_menu_item(
                item_id=self.item.id,
                owner=self.owner_mock,
                db=self.db,
            )

        self.assertTrue(res["deleted_from_db"])
        self.assertFalse(res["image_deleted"])
        self.assertFalse(res["image_cleanup_pending"])
        mock_s3.delete_object.assert_not_called()
        self.db.refresh(self.upload)
        self.assertEqual(self.upload.status, "DELETED")

        # 2. Item with no image at all
        no_img_item = MenuItem(
            id=uuid4(),
            restaurant_id=self.restaurant_id,
            category_id=self.category_id,
            name="Plain Dal",
            base_price=Decimal("120.00"),
            food_type="VEG",
            preparation_time_minutes=10,
            image_key=None,
            availability_status="AVAILABLE",
            is_active=True,
            is_deleted=False,
        )
        self.db.add(no_img_item)
        self.db.commit()

        mock_s3_2 = MagicMock()
        with patch.object(s3_service, "_s3", mock_s3_2):
            res2 = delete_menu_item(
                item_id=no_img_item.id,
                owner=self.owner_mock,
                db=self.db,
            )

        self.assertTrue(res2["deleted_from_db"])
        self.assertFalse(res2["image_deleted"])
        self.assertFalse(res2["image_cleanup_pending"])
        mock_s3_2.head_object.assert_not_called()
        mock_s3_2.delete_object.assert_not_called()

    def test_delete_item_marks_media_upload_pending_when_s3_fails(self):
        mock_s3 = MagicMock()
        mock_s3.delete_object.side_effect = ClientError(
            {"Error": {"Code": "AccessDenied", "Message": "Access Denied"}},
            "DeleteObject",
        )
        with patch.object(s3_service, "_s3", mock_s3):
            res = delete_menu_item(
                item_id=self.item.id,
                owner=self.owner_mock,
                db=self.db,
            )

        self.assertTrue(res["success"])
        self.assertTrue(res["deleted_from_db"])
        self.assertFalse(res["image_deleted"])
        self.assertTrue(res["image_cleanup_pending"])
        self.db.refresh(self.upload)
        self.assertEqual(self.upload.status, "DELETION_PENDING")

    def test_delete_item_rejects_nonexistent_or_other_owners_item(self):
        other_owner = MagicMock()
        other_owner.id = uuid4()
        mock_s3 = MagicMock()

        with patch.object(s3_service, "_s3", mock_s3):
            with self.assertRaises(HTTPException) as ctx1:
                delete_menu_item(
                    item_id=self.item.id,
                    owner=other_owner,
                    db=self.db,
                )
            self.assertEqual(ctx1.exception.status_code, 404)

            with self.assertRaises(HTTPException) as ctx2:
                delete_menu_item(
                    item_id=uuid4(),
                    owner=self.owner_mock,
                    db=self.db,
                )
            self.assertEqual(ctx2.exception.status_code, 404)

        mock_s3.delete_object.assert_not_called()
        self.assertIsNotNone(
            self.db.query(MenuItem).filter(MenuItem.id == self.item.id).first()
        )

    def test_delete_route_registered_and_repeat_delete_raises_404(self):
        openapi_paths = fastapi_app.openapi()["paths"]
        self.assertIn("/api/v1/menu/items/{item_id}", openapi_paths)
        self.assertIn("delete", openapi_paths["/api/v1/menu/items/{item_id}"])

        matching_routes = [
            route
            for route in menu_router.routes
            if getattr(route, "path", None) == "/menu/items/{item_id}"
            and "DELETE" in getattr(route, "methods", set())
        ]
        self.assertEqual(len(matching_routes), 1)
        self.assertIs(matching_routes[0].endpoint, delete_menu_item)

        mock_s3 = MagicMock()
        with patch.object(s3_service, "_s3", mock_s3):
            res = delete_menu_item(
                item_id=self.item.id,
                owner=self.owner_mock,
                db=self.db,
            )
            self.assertTrue(res["success"])
            self.assertTrue(res["deleted_from_db"])
            self.assertTrue(res["image_deleted"])
            self.assertFalse(res["image_cleanup_pending"])

            # Deleting the same item a second time returns 404
            with self.assertRaises(HTTPException) as ctx:
                delete_menu_item(
                    item_id=self.item.id,
                    owner=self.owner_mock,
                    db=self.db,
                )
            self.assertEqual(ctx.exception.status_code, 404)

        mock_s3.delete_object.assert_called_once_with(
            Bucket=s3_service.AWS_S3_BUCKET,
            Key=self.image_key,
        )
        self.assertEqual(list_menu_items(owner=self.owner_mock, db=self.db), [])


if __name__ == "__main__":
    unittest.main()
