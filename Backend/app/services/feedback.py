from uuid import UUID

from sqlalchemy.orm import Session

from app.models.customer_feedback import CustomerFeedback
from app.services.offer import get_owner_restaurant


def get_restaurant_feedback(
    db: Session,
    owner_id: UUID,
):
    # Identify the authenticated owner's restaurant
    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner_id,
    )

    # Fetch only active, non-deleted feedback
    reviews = (
        db.query(CustomerFeedback)
        .filter(
            CustomerFeedback.restaurant_id == restaurant.id,
            CustomerFeedback.is_active.is_(True),
            CustomerFeedback.is_deleted.is_(False),
        )
        .order_by(
            CustomerFeedback.created_at.desc()
        )
        .all()
    )

    # Calculate summary
    total_reviews = len(reviews)

    average_rating = (
        round(
            sum(review.rating for review in reviews)
            / total_reviews,
            1,
        )
        if total_reviews
        else 0.0
    )

    # Calculate rating distribution
    rating_distribution = {
        str(star): 0
        for star in range(1, 6)
    }

    for review in reviews:
        rating_distribution[str(review.rating)] += 1

    return (
        reviews,
        average_rating,
        total_reviews,
        rating_distribution,
    )
