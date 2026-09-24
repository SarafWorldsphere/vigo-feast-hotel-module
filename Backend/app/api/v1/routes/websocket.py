from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import SessionLocal
from app.models.restaurant import Restaurant
from app.services.websocket_manager import websocket_manager


router = APIRouter()


@router.websocket("/ws/orders")
async def restaurant_orders_websocket(websocket: WebSocket):
    db: Session = SessionLocal()

    try:
        access_token = websocket.cookies.get("access_token") or websocket.query_params.get("token")

        if not access_token:
            await websocket.close(code=1008)
            return

        try:
            owner_id = decode_access_token(access_token)
        except ValueError:
            await websocket.close(code=1008)
            return

        restaurant = (
            db.query(Restaurant)
            .filter(
                Restaurant.owner_id == owner_id,
                Restaurant.is_deleted.is_(False),
            )
            .first()
        )

        if not restaurant:
            await websocket.close(code=1008)
            return

        restaurant_id = str(restaurant.id)

        await websocket_manager.connect(
            restaurant_id,
            websocket,
        )

        try:
            while True:
                await websocket.receive_text()

        except WebSocketDisconnect:
            websocket_manager.disconnect(restaurant_id,websocket,)

    finally:
        db.close()