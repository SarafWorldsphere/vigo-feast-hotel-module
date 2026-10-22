import asyncio
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.connections: dict[str, set[WebSocket]] = {}
        self.loop = None

    async def connect(
        self,
        restaurant_id: str,
        websocket: WebSocket,
    ):
        await websocket.accept()

        self.connections.setdefault(
            str(restaurant_id),
            set(),
        ).add(websocket)

    def disconnect(
        self,
        restaurant_id: str,
        websocket: WebSocket,
    ):
        r_id = str(restaurant_id)
        connections = self.connections.get(r_id)

        if not connections:
            return

        connections.discard(websocket)

        if not connections:
            self.connections.pop(r_id, None)

    async def send_to_restaurant(
        self,
        restaurant_id: str,
        message: dict,
    ):
        r_id = str(restaurant_id)
        connections = self.connections.get(r_id, set())

        for websocket in connections.copy():
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect(
                    r_id,
                    websocket,
                )

    def broadcast_to_restaurant_sync(
        self,
        restaurant_id: str,
        message: dict,
    ):
        """Schedule send_to_restaurant on the active async loop from sync code."""
        if self.loop and self.loop.is_running():
            try:
                asyncio.run_coroutine_threadsafe(
                    self.send_to_restaurant(str(restaurant_id), message),
                    self.loop,
                )
            except Exception as e:
                print(f"[WebSocketManager] Failed to schedule sync broadcast: {e}")


websocket_manager = WebSocketManager()