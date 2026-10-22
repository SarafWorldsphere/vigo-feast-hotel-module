import asyncio
import json
import os
import select
import socket
import threading
import time
from urllib.parse import urlparse
from uuid import UUID

import psycopg2
from dotenv import load_dotenv

from app.db.database import SessionLocal
from app.models.order import Order
from app.services.financial_calculations import (
    finalize_order_financials,
)
from app.services.notifications import create_restaurant_notification
from app.services.restaurant_hours import is_accepting_orders

load_dotenv()



class OrderListener:

    CHANNELS = (
        "order_placed",
        "delivery_partner_assigned",
        "delivery_partner_accepted",
        "delivery_partner_arrived",
        "order_picked_up",
        "delivery_partner_arrived_customer",
        "order_delivered",
        "delivery_partner_cancelled",
        "delivery_partner_reassigned",
        "complaint_status_changed",
    )

    EVENT_MAPPING = {
        "order_placed": "NEW_ORDER",
        "delivery_partner_assigned": "DELIVERY_PARTNER_ASSIGNED",
        "delivery_partner_accepted": "DELIVERY_PARTNER_ACCEPTED",
        "delivery_partner_arrived": "DELIVERY_PARTNER_ARRIVED",
        "order_picked_up": "ORDER_PICKED_UP",
        "delivery_partner_arrived_customer": "DELIVERY_PARTNER_ARRIVED_CUSTOMER",
        "order_delivered": "ORDER_DELIVERED",
        "delivery_partner_cancelled": "DELIVERY_PARTNER_CANCELLED",
        "delivery_partner_reassigned": "DELIVERY_PARTNER_REASSIGNED",
        "complaint_status_changed": "COMPLAINT_STATUS_CHANGED",
    }

    def __init__(self, websocket_manager):
        self.websocket_manager = websocket_manager

        self.loop = None
        self.connection = None
        self.cursor = None

        self.stop_event = threading.Event()

    def _close_connection(self):
        """Safely close the current PostgreSQL listener connection."""

        if self.cursor:
            try:
                self.cursor.close()
            except Exception:
                pass

        if self.connection:
            try:
                self.connection.close()
            except Exception:
                pass

        self.cursor = None
        self.connection = None

    def _setup_listener(self, connection):
        """Configure PostgreSQL connection and subscribe to channels."""

        connection.set_isolation_level(
            psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT
        )

        cursor = connection.cursor()

        for channel in self.CHANNELS:
            cursor.execute(f"LISTEN {channel};")
            print(f"LISTENING TO CHANNEL: {channel}")

        self.connection = connection
        self.cursor = cursor

    def _connect(self):

        database_url = os.getenv("DATABASE_URL")

        if not database_url:
            raise RuntimeError("DATABASE_URL is not configured")

        parsed = urlparse(database_url)

        retry_delay = 1

        while not self.stop_event.is_set():

            try:
                # Normal connection
                connection = psycopg2.connect(
                    database_url,
                    application_name="restaurant-order-listener",
                )

                self._setup_listener(connection)

                print(
                    "OrderListener connected and listening "
                    "to order and delivery events"
                )

                return

            except Exception as primary_error:

                print(
                    f"OrderListener primary connection failed: "
                    f"{primary_error}"
                )

                # Make sure failed connection is closed
                self._close_connection()

                # IPv4 fallback
                try:

                    if not parsed.hostname:
                        raise RuntimeError(
                            "Database hostname is not available"
                        )

                    ipv4 = socket.gethostbyname(parsed.hostname)

                    connection = psycopg2.connect(
                        dbname=parsed.path.lstrip("/"),
                        user=parsed.username,
                        password=parsed.password,
                        host=parsed.hostname,
                        port=parsed.port or 5432,
                        hostaddr=ipv4,
                        application_name="restaurant-order-listener",
                    )

                    self._setup_listener(connection)

                    print(
                        "OrderListener connected via IPv4 and "
                        "listening to order and delivery events"
                    )

                    return

                except Exception as fallback_error:

                    self._close_connection()

                    print(
                        f"OrderListener connection attempt failed: "
                        f"{fallback_error}. "
                        f"Retrying in {retry_delay}s..."
                    )

                    self.stop_event.wait(retry_delay)

                    # Exponential backoff
                    retry_delay = min(retry_delay * 2, 30)

    def _finalize_delivered_order(
        self,
        order_id,
        restaurant_id,
    ):
        db = SessionLocal()

        try:
            order = (
                db.query(Order)
                .filter(
                    Order.order_id == order_id,
                    Order.is_deleted.is_(False),
                )
                .with_for_update()
                .first()
            )

            if order is None:
                print(
                    f"Financial finalization skipped: "
                    f"order {order_id} not found"
                )
                return

            if str(order.restaurant_id) != str(restaurant_id):
                print(
                    f"Financial finalization skipped: "
                    f"restaurant mismatch for order {order_id}"
                )
                return

            if order.order_status != "DELIVERED":
                print(
                    f"Financial finalization skipped: "
                    f"order {order_id} status is "
                    f"{order.order_status}"
                )
                return

            finalized = finalize_order_financials(order)

            if finalized:
                db.commit()
                print(
                    f"Financial snapshot saved for "
                    f"order {order_id}"
                )
            else:
                db.rollback()
                print(
                    f"Financial snapshot already exists "
                    f"for order {order_id}"
                )

        except Exception as exc:
            db.rollback()
            print(
                f"Failed to finalize order {order_id}: {exc}"
            )

        finally:
            db.close()

    def _should_forward_to_restaurant(
        self,
        channel: str,
        restaurant_id,
        order_id: int | None = None,
        as_of=None,
    ) -> bool:
        """
        Check whether this event should be forwarded to the restaurant WebSocket.
        - order_placed: forwarded ONLY when restaurant is currently accepting orders.
        - delivery/other events: forwarded if restaurant is accepting orders, OR if
          the event belongs to an already accepted/in-progress order (preserving lifecycle).
        """
        try:
            r_uuid = UUID(str(restaurant_id))
        except (ValueError, TypeError):
            return False

        db = SessionLocal()
        try:
            is_accepting = is_accepting_orders(db, r_uuid, as_of=as_of)

            # 1. New incoming order placed: strictly requires online ordering availability
            if channel == "order_placed":
                return is_accepting

            # 2. If the restaurant is currently accepting orders, allow all events
            if is_accepting:
                return True

            # 3. If closed/paused, preserve ongoing order workflows for accepted orders
            if order_id is not None:
                order = (
                    db.query(Order)
                    .filter(
                        Order.order_id == order_id,
                        Order.restaurant_id == r_uuid,
                        Order.is_deleted.is_(False),
                    )
                    .first()
                )
                if order and order.order_status in (
                    "ACCEPTED",
                    "PREPARING",
                    "READY_FOR_PICKUP",
                    "PICKED_UP",
                    "DELIVERED",
                ):
                    return True

            # Otherwise, unaccepted or new order events are suppressed from closed restaurant
            return False
        except Exception as e:
            print(f"Error checking availability in OrderListener: {e}")
            return False
        finally:
            db.close()

    def _handle_notification(self, notification, as_of=None):

        print(
            f"NOTIFICATION RECEIVED: "
            f"channel={notification.channel}, "
            f"payload={notification.payload}"
        )

        try:
            payload = json.loads(notification.payload)
            restaurant_id = payload["restaurant_id"]

            if notification.channel == "complaint_status_changed":
                event_data = {
                    "event": "COMPLAINT_STATUS_CHANGED",
                    "complaint_id": payload["complaint_id"],
                    "order_id": payload.get("order_id"),
                    "previous_status": payload.get("previous_status"),
                    "status": payload["status"],
                    "updated_at": payload.get("updated_at"),
                }
            else:
                order_id = payload["order_id"]

                event_name = self.EVENT_MAPPING.get(
                    notification.channel
                )

                if not event_name:
                    return

                event_data = {
                    "event": event_name,
                    "order_id": order_id,
                }

                for key in (
                    "assignment_id",
                    "partner_id",
                    "status",
                    "eta_minutes",
                ):
                    if key in payload:
                        event_data[key] = payload[key]

                # Internal order/financial finalization runs regardless of restaurant opening hours
                if notification.channel == "order_delivered":
                    self._finalize_delivered_order(
                        order_id=order_id,
                        restaurant_id=restaurant_id,
                    )

        except (json.JSONDecodeError, KeyError) as e:
            print(
                f"Invalid notification payload: {e}. "
                f"Payload={notification.payload}"
            )
            return

        # Persist eligible notifications independently of live delivery.
        try:
            restaurant_uuid = UUID(str(restaurant_id))

            db = SessionLocal()
            try:
                create_restaurant_notification(
                    db=db,
                    restaurant_id=restaurant_uuid,
                    event_data=event_data,
                )
            finally:
                db.close()

        except Exception as exc:
            # Notification persistence failure must not stop
            # existing order/delivery WebSocket processing.
            print(
                "Failed to persist restaurant notification: "
                f"{exc}"
            )

        # Enforce availability check when dispatching to restaurant WebSocket
        if not self._should_forward_to_restaurant(
            channel=notification.channel,
            restaurant_id=restaurant_id,
            order_id=payload.get("order_id"),
            as_of=as_of,
        ):
            print(
                f"NOTIFICATION SUPPRESSED FOR CLOSED/OFFLINE RESTAURANT: "
                f"channel={notification.channel}, "
                f"restaurant_id={restaurant_id}, "
                f"order_id={payload.get('order_id')}"
            )
            return

        print(
            f"SENDING TO RESTAURANT: {event_data}"
        )

        if not self.loop:

            print(
                "OrderListener event loop is not available"
            )

            return

        try:

            asyncio.run_coroutine_threadsafe(
                self.websocket_manager.send_to_restaurant(
                    str(restaurant_id),
                    event_data,
                ),
                self.loop,
            )

        except Exception as e:

            print(
                f"Failed to send event to restaurant: {e}"
            )


    def listen(self):

        retry_delay = 1

        while not self.stop_event.is_set():

            # Make sure we have a PostgreSQL connection
            if self.connection is None:

                self._connect()

                if self.connection is None:
                    continue

                retry_delay = 1

            try:

                ready = select.select(
                    [self.connection],
                    [],
                    [],
                    1.0,
                )

                if not ready[0]:
                    continue

                self.connection.poll()

                while self.connection.notifies:

                    notification = (
                        self.connection.notifies.pop(0)
                    )

                    # Process notification separately.
                    # Errors here should NOT kill the DB listener.
                    self._handle_notification(
                        notification
                    )

            except (
                psycopg2.InterfaceError,
                psycopg2.OperationalError,
                OSError,
                socket.error,
            ) as e:

                print(
                    f"OrderListener PostgreSQL connection lost: "
                    f"{e}"
                )

                self._close_connection()

                if self.stop_event.is_set():
                    break

                print(
                    f"Reconnecting OrderListener in "
                    f"{retry_delay}s..."
                )

                self.stop_event.wait(retry_delay)

                retry_delay = min(
                    retry_delay * 2,
                    30,
                )

            except Exception as e:

                # Unexpected listener-level error.
                # Do not immediately kill the application.
                print(
                    f"Unexpected OrderListener error: {e}"
                )

                self._close_connection()

                if self.stop_event.is_set():
                    break

                self.stop_event.wait(retry_delay)

                retry_delay = min(
                    retry_delay * 2,
                    30,
                )

    def stop(self):

        print("Stopping OrderListener...")

        self.stop_event.set()

        self._close_connection()

        print("OrderListener stopped")