
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AnalyticsPeriodResponse(BaseModel):
    period: str
    start_date: date
    end_date: date


class AnalyticsMetric(BaseModel):
    value: Optional[Decimal] = None
    previous_value: Optional[Decimal] = None
    change_percent: Optional[Decimal] = None


class AnalyticsOverviewResponse(AnalyticsPeriodResponse):
    currency: str = "INR"
    acceptance_rate: AnalyticsMetric
    cancellation_rate: AnalyticsMetric
    average_order_value: AnalyticsMetric
    average_preparation_time: AnalyticsMetric
    on_time_preparation_rate: AnalyticsMetric
    order_accuracy: AnalyticsMetric
    customer_rating: AnalyticsMetric
    gross_revenue: AnalyticsMetric


class SalesTrendPoint(BaseModel):
    bucket_start: datetime
    gross_revenue: Decimal
    orders: int


class SalesTrendResponse(AnalyticsPeriodResponse):
    currency: str = "INR"
    points: list[SalesTrendPoint]


class CustomerBreakdownResponse(AnalyticsPeriodResponse):
    total_customers: int
    new_customers: int
    returning_customers: int
    new_customer_percent: Decimal
    returning_customer_percent: Decimal


class TopSellingItem(BaseModel):
    menu_item_id: str
    name: str
    image_url: Optional[str] = None
    category_name: Optional[str] = None
    quantity_sold: int
    order_count: int
    gross_revenue: Decimal


class TopSellingItemsResponse(AnalyticsPeriodResponse):
    items: list[TopSellingItem]


class HighestRevenueItemsResponse(AnalyticsPeriodResponse):
    items: list[TopSellingItem]


class MenuPerformanceItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    menu_item_id: str
    name: str
    category_name: Optional[str] = None
    orders: int
    gross_revenue: Decimal
    rating: Optional[Decimal] = None
    average_preparation_minutes: Optional[Decimal] = None
    performance_label: Optional[str] = None


class MenuPerformanceResponse(AnalyticsPeriodResponse):
    items: list[MenuPerformanceItem]
    total: int
