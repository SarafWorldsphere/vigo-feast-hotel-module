import asyncio
import json
import os
import select
import socket
import threading
import time
from urllib.parse import urlparse

import psycopg2
from dotenv import load_dotenv

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

    def _handle_notification(self, notification):

        print(
            f"NOTIFICATION RECEIVED: "
            f"channel={notification.channel}, "
            f"payload={notification.payload}"
        )

        try:
            payload = json.loads(notification.payload)

            order_id = payload["order_id"]
            restaurant_id = payload["restaurant_id"]

        except (json.JSONDecodeError, KeyError) as e:

            print(
                f"Invalid notification payload: {e}. "
                f"Payload={notification.payload}"
            )

            return

        event_name = self.EVENT_MAPPING.get(
            notification.channel
        )

        print(f"EVENT MAPPED: {event_name}")

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
                    restaurant_id,
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