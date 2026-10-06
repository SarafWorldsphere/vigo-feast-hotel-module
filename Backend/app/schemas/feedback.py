from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class FeedbackResponse(BaseModel):
    feedback_id: int
    order_id: int
    rating: int
    comments: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class FeedbackListResponse(BaseModel):
    average_rating: float
    total_reviews: int
    rating_distribution: dict[str, int]
    reviews: list[FeedbackResponse]
