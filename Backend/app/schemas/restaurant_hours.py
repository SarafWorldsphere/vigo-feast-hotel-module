from datetime import date, time, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


SlotType = Literal["OPERATING", "ONLINE_ORDERING"]


class HourSlotInput(BaseModel):
    slot_type: SlotType
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def validate_times(self):
        if self.start_time == self.end_time:
            raise ValueError("Start time and end time cannot be equal")
        return self


class WeeklyDayInput(BaseModel):
    day_of_week: int = Field(ge=1, le=7)
    is_closed: bool = False
    slots: list[HourSlotInput] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_closed_day(self):
        if self.is_closed and self.slots:
            raise ValueError("A closed day cannot contain time slots")
        return self


class WeeklyScheduleInput(BaseModel):
    days: list[WeeklyDayInput]

    @model_validator(mode="after")
    def validate_days(self):
        weekdays = [day.day_of_week for day in self.days]
        if len(weekdays) != len(set(weekdays)):
            raise ValueError("Each weekday must appear only once")
        if set(weekdays) != set(range(1, 8)):
            raise ValueError("Provide all seven days, Monday through Sunday")
        return self


class HourSlotResponse(HourSlotInput):
    id: UUID


class WeeklyDayResponse(BaseModel):
    id: UUID
    day_of_week: int
    is_closed: bool
    slots: list[HourSlotResponse]


class WeeklyScheduleResponse(BaseModel):
    days: list[WeeklyDayResponse]


class SpecialHoursInput(BaseModel):
    special_date: date
    is_closed: bool = False
    note: str | None = None
    slots: list[HourSlotInput] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_special_day(self):
        if self.is_closed and self.slots:
            raise ValueError("A closed date cannot contain time slots")
        return self


class SpecialHoursResponse(BaseModel):
    id: UUID
    special_date: date
    is_closed: bool
    note: str | None
    slots: list[HourSlotResponse]


class OrderSettingsResponse(BaseModel):
    is_paused: bool
    pause_reason: str | None
    paused_until: datetime | None


class PauseOrdersInput(BaseModel):
    reason: str | None = None
    paused_until: datetime | None = None


class RestaurantAvailabilityResponse(BaseModel):
    is_operating_now: bool
    is_ordering_now: bool
    is_paused: bool
    is_accepting_orders: bool
    status: str
    reason: str
    paused_until: datetime | None = None
    next_change_at: datetime | None = None