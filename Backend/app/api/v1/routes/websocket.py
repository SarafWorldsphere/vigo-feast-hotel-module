from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import SessionLocal
from app.models.restaurant import Restaurant
from app.services.websocket_manager import websocket_manager


router = APIRouter()


@router.websocket("/ws/orders")
async def restaurant_orders_websocket(websocket: WebSocket):
    access_token = websocket.cookies.get("access_token") or websocket.query_params.get("token")

    if not access_token:
        print("[WS AUTH] Reject: No access_token provided in cookies or query param")
        await websocket.close(code=1008)
        return

    try:
        owner_id = decode_access_token(access_token)
    except ValueError as e:
        print(f"[WS AUTH] Reject: decode_access_token failed: {e}")
        await websocket.close(code=1008)
        return

    # Look up the restaurant and immediately release the database connection
    db: Session = SessionLocal()
    try:
        restaurant = (
            db.query(Restaurant)
            .filter(
                Restaurant.owner_id == owner_id,
                Restaurant.is_deleted.is_(False),
            )
            .first()
        )
    finally:
        db.close()

    if not restaurant:
        print(f"[WS AUTH] Reject: No active restaurant found for owner_id={owner_id}")
        await websocket.close(code=1008)
        return

    restaurant_id = str(restaurant.id)
    print(f"[WS AUTH] Accepted connection for restaurant_id={restaurant_id}, owner_id={owner_id}")

    await websocket_manager.connect(
        restaurant_id,
        websocket,
    )

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(restaurant_id, websocket)