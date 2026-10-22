from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.cuisine import router as cuisine_router
from app.api.v1.routes.menu import router as menu_router
from app.api.v1.routes.order import router as order_router
from app.api.v1.routes.registration import router as registration_router
from app.api.v1.routes.websocket import router as websocket_router
from app.api.v1.offers import router as offers_router
from app.routers.feedback import router as feedback_router
from app.api.v1.routes.restaurant import router as restaurant_router
from app.api.v1.routes.owner import router as owner_router
from app.api.v1.routes.dashboard import router as dashboard_router
from app.api.v1.routes.earnings import router as earnings_router
from app.api.v1.routes.settlement import router as settlement_router
from app.api.v1.routes.analytics import router as analytics_router
from app.api.v1.routes.complaints import router as complaints_router
from app.api.v1.routes.refunds import router as refunds_router
from app.api.v1.routes.notifications import router as notifications_router
from app.api.v1.routes import restaurant_hours
import asyncio
from contextlib import asynccontextmanager

from app.services.order_listener import OrderListener
from app.services.websocket_manager import websocket_manager

order_listener = OrderListener(websocket_manager)


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_running_loop()
    order_listener.loop = loop
    websocket_manager.loop = loop

    listener_task = asyncio.create_task(
        asyncio.to_thread(order_listener.listen)
    )

    yield

    order_listener.stop()
    await listener_task
app = FastAPI(
    title="Food Delivery Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    auth_router,
    prefix="/api/v1",
)

app.include_router(
    cuisine_router,
    prefix="/api/v1",
)

app.include_router(
    registration_router,
    prefix="/api/v1",
)

app.include_router(
    menu_router,
    prefix="/api/v1",
)

app.include_router(
    order_router,
    prefix="/api/v1",
)

app.include_router(
    websocket_router,
    prefix="/api/v1",
)

app.include_router(
    offers_router,
    prefix="/api/v1",
)

app.include_router(
    feedback_router,
    prefix="/api/v1",
)

app.include_router(
    restaurant_router,
    prefix="/api/v1",
)

app.include_router(
    restaurant_router,
)

app.include_router(
    owner_router,
    prefix="/api/v1",
)

app.include_router(
    owner_router,
)

app.include_router(
    dashboard_router,
    prefix="/api/v1",
)

app.include_router(
    earnings_router,
    prefix="/api/v1",
)

app.include_router(
    settlement_router,
    prefix="/api/v1",
)

app.include_router(
    analytics_router,
    prefix="/api/v1",
)

app.include_router(
    complaints_router,
    prefix="/api/v1",
)

app.include_router(refunds_router)

app.include_router(
    restaurant_hours.router,
    prefix="/api/v1",
)

app.include_router(
    notifications_router,
    prefix="/api/v1",
)




@app.get("/")
def root():
    return {
        "message": "Food Delivery Platform API is running"
    }
