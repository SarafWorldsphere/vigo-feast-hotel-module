import unittest
from datetime import date, time, datetime, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.restaurant import Restaurant
from app.models.restaurant_hours import RestaurantHours
from app.models.restaurant_special_hours import RestaurantSpecialHours
from app.models.restaurant_hour_slot import RestaurantHourSlot
from app.models.restaurant_order_settings import RestaurantOrderSettings
from app.services.restaurant_hours import (
    get_restaurant_availability,
    pause_orders,
    resume_orders,
    TIMEZONE,
)


class RestaurantAvailabilityTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Restaurant.__table__.create(self.engine)
        RestaurantHours.__table__.create(self.engine)
        RestaurantSpecialHours.__table__.create(self.engine)
        RestaurantHourSlot.__table__.create(self.engine)
        RestaurantOrderSettings.__table__.create(self.engine)
        self.db = sessionmaker(bind=self.engine)()

        self.owner_id = uuid4()
        self.restaurant_id = uuid4()
        self.restaurant = Restaurant(
            id=self.restaurant_id,
            owner_id=self.owner_id,
            name="Spice Route",
            description="Authentic Food",
            phone="+91 9999999999",
            email="spiceroute@example.com",
            address_line1="123 Food Street",
            city="Hyderabad",
            state="Telangana",
            postal_code="500081",
        )
        self.db.add(self.restaurant)
        self.db.commit()

        # Target date for testing: Monday, 2026-10-19
        self.monday_date = date(2026, 10, 19)
        self.tuesday_date = date(2026, 10, 20)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_monday_with_no_slots_is_offline(self):
        # 1. Monday with no slots configured -> Offline, reason: NO_SCHEDULE
        simulated_time = datetime(2026, 10, 19, 12, 0, 0, tzinfo=TIMEZONE)
        res = get_restaurant_availability(self.db, self.restaurant_id, as_of=simulated_time)
        self.assertFalse(res["is_operating_now"])
        self.assertFalse(res["is_ordering_now"])
        self.assertFalse(res["is_paused"])
        self.assertFalse(res["is_accepting_orders"])
        self.assertEqual(res["status"], "OFFLINE")
        self.assertEqual(res["reason"], "NO_SCHEDULE")

    def test_monday_operating_hours_but_no_online_ordering_hours_is_offline(self):
        # 2. Monday with operating hours (09:00 - 22:00) but NO online-ordering hours -> Offline
        mon_hours = RestaurantHours(
            restaurant_id=self.restaurant_id,
            day_of_week=1,
            is_closed=False,
        )
        self.db.add(mon_hours)
        self.db.flush()

        op_slot = RestaurantHourSlot(
            weekly_hours_id=mon_hours.id,
            slot_type="OPERATING",
            start_time=time(9, 0),
            end_time=time(22, 0),
        )
        self.db.add(op_slot)
        self.db.commit()

        # At 14:00 (inside operating window)
        simulated_time = datetime(2026, 10, 19, 14, 0, 0, tzinfo=TIMEZONE)
        res = get_restaurant_availability(self.db, self.restaurant_id, as_of=simulated_time)
        self.assertTrue(res["is_operating_now"])
        self.assertFalse(res["is_ordering_now"])
        self.assertFalse(res["is_accepting_orders"])
        self.assertEqual(res["status"], "OFFLINE")
        self.assertEqual(res["reason"], "OUTSIDE_ORDERING_HOURS")

        # At 23:00 (outside operating window)
        simulated_time_late = datetime(2026, 10, 19, 23, 0, 0, tzinfo=TIMEZONE)
        res_late = get_restaurant_availability(self.db, self.restaurant_id, as_of=simulated_time_late)
        self.assertFalse(res_late["is_operating_now"])
        self.assertFalse(res_late["is_ordering_now"])
        self.assertFalse(res_late["is_accepting_orders"])
        self.assertEqual(res_late["status"], "OFFLINE")
        self.assertEqual(res_late["reason"], "OUTSIDE_OPERATING_HOURS")

    def test_monday_with_both_active_slots_is_online(self):
        # 3. Monday with both active slots -> Online
        mon_hours = RestaurantHours(
            restaurant_id=self.restaurant_id,
            day_of_week=1,
            is_closed=False,
        )
        self.db.add(mon_hours)
        self.db.flush()

        op_slot = RestaurantHourSlot(
            weekly_hours_id=mon_hours.id,
            slot_type="OPERATING",
            start_time=time(9, 0),
            end_time=time(22, 0),
        )
        or_slot = RestaurantHourSlot(
            weekly_hours_id=mon_hours.id,
            slot_type="ONLINE_ORDERING",
            start_time=time(11, 0),
            end_time=time(21, 0),
        )
        self.db.add_all([op_slot, or_slot])
        self.db.commit()

        simulated_time = datetime(2026, 10, 19, 14, 0, 0, tzinfo=TIMEZONE)
        res = get_restaurant_availability(self.db, self.restaurant_id, as_of=simulated_time)
        self.assertTrue(res["is_operating_now"])
        self.assertTrue(res["is_ordering_now"])
        self.assertFalse(res["is_paused"])
        self.assertTrue(res["is_accepting_orders"])
        self.assertEqual(res["status"], "ONLINE")
        self.assertEqual(res["reason"], "ACCEPTING_ORDERS")

    def test_outside_online_ordering_hours_is_offline(self):
        # 4. Outside online-ordering hours -> Offline
        mon_hours = RestaurantHours(
            restaurant_id=self.restaurant_id,
            day_of_week=1,
            is_closed=False,
        )
        self.db.add(mon_hours)
        self.db.flush()

        # Operating 09:00 - 22:00, Ordering 12:00 - 15:00
        op_slot = RestaurantHourSlot(
            weekly_hours_id=mon_hours.id,
            slot_type="OPERATING",
            start_time=time(9, 0),
            end_time=time(22, 0),
        )
        or_slot = RestaurantHourSlot(
            weekly_hours_id=mon_hours.id,
            slot_type="ONLINE_ORDERING",
            start_time=time(12, 0),
            end_time=time(15, 0),
        )
        self.db.add_all([op_slot, or_slot])
        self.db.commit()

        # At 16:00 (inside operating, outside ordering)
        simulated_time = datetime(2026, 10, 19, 16, 0, 0, tzinfo=TIMEZONE)
        res = get_restaurant_availability(self.db, self.restaurant_id, as_of=simulated_time)
        self.assertTrue(res["is_operating_now"])
        self.assertFalse(res["is_ordering_now"])
        self.assertFalse(res["is_accepting_orders"])
        self.assertEqual(res["status"], "OFFLINE")
        self.assertEqual(res["reason"], "OUTSIDE_ORDERING_HOURS")

    def test_manually_paused_during_active_hours_is_paused(self):
        # 5. Manually paused during active hours -> Paused
        mon_hours = RestaurantHours(
            restaurant_id=self.restaurant_id,
            day_of_week=1,
            is_closed=False,
        )
        self.db.add(mon_hours)
        self.db.flush()

        op_slot = RestaurantHourSlot(
            weekly_hours_id=mon_hours.id,
            slot_type="OPERATING",
            start_time=time(9, 0),
            end_time=time(22, 0),
        )
        or_slot = RestaurantHourSlot(
            weekly_hours_id=mon_hours.id,
            slot_type="ONLINE_ORDERING",
            start_time=time(9, 0),
            end_time=time(22, 0),
        )
        self.db.add_all([op_slot, or_slot])
        self.db.commit()

        # Pause until 16:00
        settings = RestaurantOrderSettings(
            restaurant_id=self.restaurant_id,
            is_paused=True,
            pause_reason="Kitchen deep cleaning",
            paused_until=datetime(2026, 10, 19, 16, 0, 0, tzinfo=TIMEZONE),
        )
        self.db.add(settings)
        self.db.commit()

        simulated_time = datetime(2026, 10, 19, 14, 0, 0, tzinfo=TIMEZONE)
        res = get_restaurant_availability(self.db, self.restaurant_id, as_of=simulated_time)
        self.assertTrue(res["is_operating_now"])
        self.assertTrue(res["is_ordering_now"])
        self.assertTrue(res["is_paused"])
        self.assertFalse(res["is_accepting_orders"])
        self.assertEqual(res["status"], "PAUSED")
        self.assertEqual(res["reason"], "TEMPORARILY_PAUSED")

    def test_pause_expires_outside_opening_hours_is_offline(self):
        # 6. Pause expires outside opening hours -> Offline
        mon_hours = RestaurantHours(
            restaurant_id=self.restaurant_id,
            day_of_week=1,
            is_closed=False,
        )
        self.db.add(mon_hours)
        self.db.flush()

        # Operating and ordering until 21:00
        op_slot = RestaurantHourSlot(
            weekly_hours_id=mon_hours.id,
            slot_type="OPERATING",
            start_time=time(9, 0),
            end_time=time(21, 0),
        )
        or_slot = RestaurantHourSlot(
            weekly_hours_id=mon_hours.id,
            slot_type="ONLINE_ORDERING",
            start_time=time(9, 0),
            end_time=time(21, 0),
        )
        self.db.add_all([op_slot, or_slot])
        self.db.commit()

        # Paused until 22:00 (which is after operating hours end at 21:00)
        settings = RestaurantOrderSettings(
            restaurant_id=self.restaurant_id,
            is_paused=True,
            pause_reason="Rush hour overload",
            paused_until=datetime(2026, 10, 19, 22, 0, 0, tzinfo=TIMEZONE),
        )
        self.db.add(settings)
        self.db.commit()

        # Check at 22:30 (pause has expired, schedule is closed)
        simulated_time = datetime(2026, 10, 19, 22, 30, 0, tzinfo=TIMEZONE)
        res = get_restaurant_availability(self.db, self.restaurant_id, as_of=simulated_time)
        self.assertFalse(res["is_paused"])
        self.assertFalse(res["is_operating_now"])
        self.assertFalse(res["is_ordering_now"])
        self.assertFalse(res["is_accepting_orders"])
        self.assertEqual(res["status"], "OFFLINE")
        self.assertEqual(res["reason"], "OUTSIDE_OPERATING_HOURS")


    def test_special_date_closure_is_offline(self):
        # 7. Special-date closure -> Offline, reason: CLOSED_TODAY
        mon_hours = RestaurantHours(
            restaurant_id=self.restaurant_id,
            day_of_week=1,
            is_closed=False,
        )
        self.db.add(mon_hours)
        self.db.flush()

        op_slot = RestaurantHourSlot(
            weekly_hours_id=mon_hours.id,
            slot_type="OPERATING",
            start_time=time(9, 0),
            end_time=time(22, 0),
        )
        or_slot = RestaurantHourSlot(
            weekly_hours_id=mon_hours.id,
            slot_type="ONLINE_ORDERING",
            start_time=time(9, 0),
            end_time=time(22, 0),
        )
        self.db.add_all([op_slot, or_slot])

        # Add special date override marking Monday closed
        special = RestaurantSpecialHours(
            restaurant_id=self.restaurant_id,
            special_date=self.monday_date,
            is_closed=True,
            note="Festival Holiday",
        )
        self.db.add(special)
        self.db.commit()

        simulated_time = datetime(2026, 10, 19, 14, 0, 0, tzinfo=TIMEZONE)
        res = get_restaurant_availability(self.db, self.restaurant_id, as_of=simulated_time)
        self.assertFalse(res["is_operating_now"])
        self.assertFalse(res["is_ordering_now"])
        self.assertFalse(res["is_accepting_orders"])
        self.assertEqual(res["status"], "OFFLINE")
        self.assertEqual(res["reason"], "CLOSED_TODAY")

    def test_overnight_ordering_slot_before_and_after_midnight(self):
        # 8. Overnight ordering slot (Monday 18:00 to 02:00) -> correct status before and after midnight
        mon_hours = RestaurantHours(
            restaurant_id=self.restaurant_id,
            day_of_week=1,
            is_closed=False,
        )
        self.db.add(mon_hours)
        self.db.flush()

        op_slot = RestaurantHourSlot(
            weekly_hours_id=mon_hours.id,
            slot_type="OPERATING",
            start_time=time(18, 0),
            end_time=time(2, 0),
        )
        or_slot = RestaurantHourSlot(
            weekly_hours_id=mon_hours.id,
            slot_type="ONLINE_ORDERING",
            start_time=time(18, 0),
            end_time=time(2, 0),
        )
        self.db.add_all([op_slot, or_slot])
        self.db.commit()

        # Before midnight: Monday 23:30 -> Online
        before_midnight = datetime(2026, 10, 19, 23, 30, 0, tzinfo=TIMEZONE)
        res_before = get_restaurant_availability(self.db, self.restaurant_id, as_of=before_midnight)
        self.assertTrue(res_before["is_operating_now"])
        self.assertTrue(res_before["is_ordering_now"])
        self.assertTrue(res_before["is_accepting_orders"])
        self.assertEqual(res_before["status"], "ONLINE")
        self.assertEqual(res_before["reason"], "ACCEPTING_ORDERS")

        # After midnight: Tuesday 01:30 -> Online
        after_midnight = datetime(2026, 10, 20, 1, 30, 0, tzinfo=TIMEZONE)
        res_after = get_restaurant_availability(self.db, self.restaurant_id, as_of=after_midnight)
        self.assertTrue(res_after["is_operating_now"])
        self.assertTrue(res_after["is_ordering_now"])
        self.assertTrue(res_after["is_accepting_orders"])
        self.assertEqual(res_after["status"], "ONLINE")
        self.assertEqual(res_after["reason"], "ACCEPTING_ORDERS")

        # After slot end: Tuesday 02:30 -> Offline
        after_end = datetime(2026, 10, 20, 2, 30, 0, tzinfo=TIMEZONE)
        res_end = get_restaurant_availability(self.db, self.restaurant_id, as_of=after_end)
        self.assertFalse(res_end["is_operating_now"])
        self.assertFalse(res_end["is_ordering_now"])
        self.assertFalse(res_end["is_accepting_orders"])
        self.assertEqual(res_end["status"], "OFFLINE")


if __name__ == "__main__":
    unittest.main()
