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

    def __init__(self, websocket_manager):
        self.websocket_manager = websocket_manager
        self.loop = None
        self.connection = None
        self.cursor = None
        self.stop_event = threading.Event()

    def _connect(self):
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            raise RuntimeError("DATABASE_URL is not configured")

        parsed = urlparse(database_url)
        while not self.stop_event.is_set():
            try:
                self.connection = psycopg2.connect(
                    database_url,
                    application_name="restaurant-order-listener",
                )
                self.connection.set_isolation_level(
                    psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT
                )
                self.cursor = self.connection.cursor()
                for channel in self.CHANNELS:
                    self.cursor.execute(f"LISTEN {channel};")
                    print(f"LISTENING TO CHANNEL: {channel}")
                print("OrderListener connected and listening to order and delivery events")
                return
            except Exception:
                try:
                    # 2. Fallback: resolve IPv4 directly to bypass IPv6 NAT64 issues on Windows/AWS RDS
                    if parsed.hostname:
                        ipv4 = socket.gethostbyname(parsed.hostname)
                        self.connection = psycopg2.connect(
                            dbname=parsed.path.lstrip('/'),
                            user=parsed.username,
                            password=parsed.password,
                            host=parsed.hostname,
                            port=parsed.port or 5432,
                            hostaddr=ipv4,
                        )
                        self.connection.set_isolation_level(
                            psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT
                        )
                        self.cursor = self.connection.cursor()
                        for channel in self.CHANNELS:
                            self.cursor.execute(f"LISTEN {channel};")
                            print(f"LISTENING TO CHANNEL: {channel}")
                        print("OrderListener connected via IPv4 and listening to order and delivery events")
                        return
                except Exception as e:
                    print(f"OrderListener connection attempt failed: {e}. Retrying in 3s...")
                    time.sleep(3)

    def listen(self):
        self._connect()

        while not self.stop_event.is_set():
            if not self.connection:
                self._connect()
                continue

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
                    notification = self.connection.notifies.pop(0)
                    print(
                        f"NOTIFICATION RECEIVED: "
                        f"channel={notification.channel}, "
                        f"payload={notification.payload}"
                    )

                    payload = json.loads(notification.payload)

                    order_id = payload["order_id"]
                    restaurant_id = payload["restaurant_id"]

                    event_mapping = {
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

                    event_name = event_mapping.get(notification.channel)
                    print(f"EVENT MAPPED: {event_name}")

                    if not event_name:
                        continue

                    event_data = {
                        "event": event_name,
                        "order_id": order_id,
                    }

                    # Include delivery-specific information when available.
                    for key in (
                        "assignment_id",
                        "partner_id",
                        "status",
                        "eta_minutes",
                    ):
                        if key in payload:
                            event_data[key] = payload[key]

                    print(f"SENDING TO RESTAURANT: {event_data}")

                    asyncio.run_coroutine_threadsafe(
                        self.websocket_manager.send_to_restaurant(
                            restaurant_id,
                            event_data,
                        ),
                        self.loop,
                    )
            except Exception as e:
                print(f"OrderListener connection error: {e}. Reconnecting...")
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
                self.connection = None
                self.cursor = None
                time.sleep(2)

    def stop(self):
        self.stop_event.set()

        if self.cursor:
            self.cursor.close()

        if self.connection:
            self.connection.close()
