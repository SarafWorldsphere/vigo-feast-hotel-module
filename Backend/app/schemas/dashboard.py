from typing import List, Optional
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    today_orders: int
    gross_revenue: float
    net_revenue: float
    average_order_value: float
    rating: float
    average_preparation_time: Optional[float]
    acceptance_rate: float
    cancellation_rate: float


class SalesTrendPoint(BaseModel):
    hour: str
    revenue: float


class SalesTrend(BaseModel):
    today_revenue: float
    yesterday_revenue: float
    change_percentage: Optional[float]
    hourly: List[SalesTrendPoint]


class OrderPipeline(BaseModel):
    new: int
    preparing: int
    ready: int
    completed: int
    rejected: int


class TopSellingItem(BaseModel):
    item_id: str
    item_name: str
    quantity_sold: int
    revenue: float


class DashboardResponse(BaseModel):
    summary: DashboardSummary
    sales_trend: SalesTrend
    order_pipeline: OrderPipeline
    top_selling_items: List[TopSellingItem]
