import unittest
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.v1.routes.notifications import (
    get_notifications,
    get_unread_count,
    read_all_notifications,
    read_notification,
)
from app.db.database import Base
from app.main import app
from app.models.restaurant import Restaurant
from app.models.restaurant_notifications import RestaurantNotification
from app.models.restaurant_owner import RestaurantOwner


class NotificationRouterRegistrationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        self.owner_id = uuid4()
        self.restaurant_id = uuid4()

        self.owner = RestaurantOwner(
            id=self.owner_id,
            name="Test Owner",
            email="owner@example.com",
            phone="+919876543210",
            password_hash="hashed_pw",
            is_active=True,
            is_verified=True,
        )
        self.db.add(self.owner)

        self.restaurant = Restaurant(
            id=self.restaurant_id,
            owner_id=self.owner_id,
            name="Tasty Bytes",
            description="Best food in town",
            phone="+919876543210",
            email="kitchen@example.com",
            address_line1="123 Food Street",
            city="Bengaluru",
            state="Karnataka",
            postal_code="560001",
            is_active=True,
            is_deleted=False,
        )
        self.db.add(self.restaurant)

        self.n1 = RestaurantNotification(
            restaurant_id=self.restaurant_id,
            notification_type="ORDER_RECEIVED",
            title="New Order #101",
            message="You have received a new order.",
            entity_type="ORDER",
            entity_id=101,
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        self.n2 = RestaurantNotification(
            restaurant_id=self.restaurant_id,
            notification_type="COMPLAINT_FILED",
            title="Complaint #201",
            message="A customer raised a complaint.",
            entity_type="COMPLAINT",
            entity_id=201,
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add_all([self.n1, self.n2])
        self.db.commit()
        self.db.refresh(self.n1)
        self.db.refresh(self.n2)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_routes_mounted_in_app(self):
        """Verify endpoints and methods are registered in app under /api/v1."""
        openapi_paths = app.openapi()["paths"]

        self.assertIn("/api/v1/notifications", openapi_paths)
        self.assertIn("get", openapi_paths["/api/v1/notifications"])

        self.assertIn("/api/v1/notifications/unread-count", openapi_paths)
        self.assertIn("get", openapi_paths["/api/v1/notifications/unread-count"])

        self.assertIn("/api/v1/notifications/{notification_id}/read", openapi_paths)
        self.assertIn("patch", openapi_paths["/api/v1/notifications/{notification_id}/read"])

        self.assertIn("/api/v1/notifications/read-all", openapi_paths)
        self.assertIn("patch", openapi_paths["/api/v1/notifications/read-all"])

    def test_get_notifications_handler(self):
        res = get_notifications(
            limit=20,
            offset=0,
            current_owner=self.owner,
            db=self.db,
        )
        self.assertEqual(res["total"], 2)
        self.assertEqual(res["unread_count"], 2)
        self.assertEqual(len(res["items"]), 2)

    def test_get_unread_count_handler(self):
        res = get_unread_count(
            current_owner=self.owner,
            db=self.db,
        )
        self.assertEqual(res["unread_count"], 2)

    def test_read_single_notification_handler(self):
        res = read_notification(
            notification_id=self.n1.notification_id,
            current_owner=self.owner,
            db=self.db,
        )
        self.assertEqual(res["message"], "Notification marked as read")
        self.assertEqual(res["notification_id"], self.n1.notification_id)
        self.assertTrue(res["is_read"])

        count_res = get_unread_count(current_owner=self.owner, db=self.db)
        self.assertEqual(count_res["unread_count"], 1)

    def test_read_all_notifications_handler(self):
        res = read_all_notifications(
            current_owner=self.owner,
            db=self.db,
        )
        self.assertEqual(res["message"], "All notifications marked as read")
        self.assertEqual(res["updated_count"], 2)

        count_res = get_unread_count(current_owner=self.owner, db=self.db)
        self.assertEqual(count_res["unread_count"], 0)

    def test_create_restaurant_notification_order_event(self):
        from app.services.notifications import create_restaurant_notification

        event_data = {
            "event": "NEW_ORDER",
            "order_id": 999,
        }
        notif = create_restaurant_notification(
            db=self.db,
            restaurant_id=self.restaurant_id,
            event_data=event_data,
        )
        self.assertIsNotNone(notif)
        self.assertEqual(notif.notification_type, "NEW_ORDER")
        self.assertEqual(notif.title, "New order received")
        self.assertEqual(notif.message, "A new order needs your attention. Order #999.")
        self.assertEqual(notif.entity_type, "ORDER")
        self.assertEqual(notif.entity_id, 999)
        self.assertFalse(notif.is_read)

    def test_create_restaurant_notification_complaint_event(self):
        from app.services.notifications import create_restaurant_notification

        event_data = {
            "event": "COMPLAINT_STATUS_CHANGED",
            "complaint_id": 888,
            "status": "RESOLVED",
        }
        notif = create_restaurant_notification(
            db=self.db,
            restaurant_id=self.restaurant_id,
            event_data=event_data,
        )
        self.assertIsNotNone(notif)
        self.assertEqual(notif.notification_type, "COMPLAINT_STATUS_CHANGED")
        self.assertEqual(notif.title, "Complaint status updated")
        self.assertEqual(notif.message, "Complaint #888 status changed to RESOLVED.")
        self.assertEqual(notif.entity_type, "COMPLAINT")
        self.assertEqual(notif.entity_id, 888)

    def test_create_restaurant_notification_unknown_event(self):
        from app.services.notifications import create_restaurant_notification

        event_data = {
            "event": "UNKNOWN_RANDOM_EVENT",
            "order_id": 123,
        }
        notif = create_restaurant_notification(
            db=self.db,
            restaurant_id=self.restaurant_id,
            event_data=event_data,
        )
        self.assertIsNone(notif)

    def test_order_listener_persists_notification(self):
        import json
        from unittest.mock import MagicMock, patch
        from app.services.order_listener import OrderListener

        mock_ws_manager = MagicMock()
        listener = OrderListener(websocket_manager=mock_ws_manager)

        notification = MagicMock()
        notification.channel = "delivery_partner_assigned"
        notification.payload = json.dumps({
            "restaurant_id": str(self.restaurant_id),
            "order_id": 555,
            "partner_id": 12,
        })

        with patch("app.services.order_listener.SessionLocal", return_value=self.db):
            with patch.object(listener, "_should_forward_to_restaurant", return_value=False):
                listener._handle_notification(notification)

        saved = (
            self.db.query(RestaurantNotification)
            .filter(
                RestaurantNotification.restaurant_id == self.restaurant_id,
                RestaurantNotification.notification_type == "DELIVERY_PARTNER_ASSIGNED",
                RestaurantNotification.entity_id == 555,
            )
            .first()
        )
        self.assertIsNotNone(saved)
        self.assertEqual(saved.title, "Delivery partner assigned")
        self.assertEqual(saved.entity_type, "DELIVERY")


if __name__ == "__main__":
    unittest.main()
