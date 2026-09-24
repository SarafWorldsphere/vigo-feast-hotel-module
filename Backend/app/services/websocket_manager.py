from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.connections: dict[str, set[WebSocket]] = {}

    async def connect(
        self,
        restaurant_id: str,
        websocket: WebSocket,
    ):
        await websocket.accept()

        self.connections.setdefault(
            restaurant_id,
            set(),
        ).add(websocket)

    def disconnect(
        self,
        restaurant_id: str,
        websocket: WebSocket,
    ):
        connections = self.connections.get(restaurant_id)

        if not connections:
            return

        connections.discard(websocket)

        if not connections:
            self.connections.pop(restaurant_id, None)

    async def send_to_restaurant(
        self,
        restaurant_id: str,
        message: dict,
    ):
        connections = self.connections.get(restaurant_id, set())

        for websocket in connections.copy():
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect(
                    restaurant_id,
                    websocket,
                )


websocket_manager = WebSocketManager()