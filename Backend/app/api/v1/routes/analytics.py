
import csv
from datetime import date
from io import StringIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.security import get_current_owner
from app.db.database import get_db
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    CustomerBreakdownResponse,
    HighestRevenueItemsResponse,
    MenuPerformanceResponse,
    SalesTrendResponse,
    TopSellingItemsResponse,
)
from app.services.analytics import (
    get_analytics_overview,
    get_customer_breakdown,
    get_highest_revenue_items,
    get_menu_performance,
    get_sales_trend,
    get_top_selling_items,
    resolve_analytics_period,
)
from app.services.restaurant import get_owner_restaurant


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get(
    "/overview",
    response_model=AnalyticsOverviewResponse,
)
def analytics_overview(
    period: str = Query(
        default="today",
        pattern="^(today|week|month|custom)$",
    ),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    try:
        period_data = resolve_analytics_period(
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )

    return get_analytics_overview(
        db=db,
        restaurant_id=restaurant.id,
        period_data=period_data,
    )


@router.get(
    "/sales-trend",
    response_model=SalesTrendResponse,
)
def sales_trend(
    period: str = Query(
        default="today",
        pattern="^(today|week|month|custom)$",
    ),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    try:
        period_data = resolve_analytics_period(
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )

    return get_sales_trend(
        db=db,
        restaurant_id=restaurant.id,
        period_data=period_data,
    )


@router.get(
    "/customer-breakdown",
    response_model=CustomerBreakdownResponse,
)
def customer_breakdown(
    period: str = Query(
        default="today",
        pattern="^(today|week|month|custom)$",
    ),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    try:
        period_data = resolve_analytics_period(
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )

    return get_customer_breakdown(
        db=db,
        restaurant_id=restaurant.id,
        period_data=period_data,
    )


@router.get(
    "/top-selling-items",
    response_model=TopSellingItemsResponse,
)
def top_selling_items(
    period: str = Query(
        default="today",
        pattern="^(today|week|month|custom)$",
    ),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    try:
        period_data = resolve_analytics_period(
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )

    return get_top_selling_items(
        db=db,
        restaurant_id=restaurant.id,
        period_data=period_data,
    )


@router.get(
    "/highest-revenue-items",
    response_model=HighestRevenueItemsResponse,
)
def highest_revenue_items(
    period: str = Query(
        default="today",
        pattern="^(today|week|month|custom)$",
    ),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    try:
        period_data = resolve_analytics_period(
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )

    return get_highest_revenue_items(
        db=db,
        restaurant_id=restaurant.id,
        period_data=period_data,
    )


@router.get(
    "/menu-performance",
    response_model=MenuPerformanceResponse,
)
def menu_performance(
    period: str = Query(
        default="today",
        pattern="^(today|week|month|custom)$",
    ),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    try:
        period_data = resolve_analytics_period(
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )

    return get_menu_performance(
        db=db,
        restaurant_id=restaurant.id,
        period_data=period_data,
    )


@router.get("/export")
def export_analytics(
    period: str = Query(
        default="today",
        pattern="^(today|week|month|custom)$",
    ),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    owner=Depends(get_current_owner),
):
    try:
        period_data = resolve_analytics_period(
            period=period,
            start_date=start_date,
            end_date=end_date,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    restaurant = get_owner_restaurant(
        db=db,
        owner_id=owner.owner_id,
    )

    result = get_menu_performance(
        db=db,
        restaurant_id=restaurant.id,
        period_data=period_data,
    )

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Period",
        "Start Date",
        "End Date",
        "Menu Item ID",
        "Item Name",
        "Category",
        "Orders",
        "Gross Revenue (INR)",
        "Rating",
        "Preparation Time (Minutes)",
        "Performance",
    ])

    for item in result["items"]:
        writer.writerow([
            result["period"],
            result["start_date"],
            result["end_date"],
            item["menu_item_id"],
            item["name"],
            item["category_name"] or "",
            item["orders"],
            item["gross_revenue"],
            item["rating"] if item["rating"] is not None else "",
            (
                item["average_preparation_minutes"]
                if item["average_preparation_minutes"] is not None
                else ""
            ),
            item["performance_label"],
        ])

    output.seek(0)

    filename = (
        f"menu_performance_{period_data['start_date']}_"
        f"{period_data['end_date']}.csv"
    )

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )





