from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.models.restaurant_owner import RestaurantOwner
from app.schemas.feedback import FeedbackListResponse, FeedbackResponse
from app.services.feedback import get_restaurant_feedback

router = APIRouter(
    prefix="/restaurants",
    tags=["Feedback"],
)


@router.get(
    "/me/feedback",
    response_model=FeedbackListResponse,
)
def get_my_restaurant_feedback(
    db: Session = Depends(get_db),
    current_owner: RestaurantOwner = Depends(get_current_owner),
):
    reviews, average_rating, total_reviews, rating_distribution = (
        get_restaurant_feedback(
            db=db,
            owner_id=current_owner.id,
        )
    )

    review_responses = [
        FeedbackResponse(
            feedback_id=review.feedback_id,
            order_id=review.order_id,
            rating=review.rating,
            comments=review.comments,
            created_at=review.created_at,
        )
        for review in reviews
    ]

    return FeedbackListResponse(
        average_rating=average_rating,
        total_reviews=total_reviews,
        rating_distribution=rating_distribution,
        reviews=review_responses,
    )
