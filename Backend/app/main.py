from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.cuisine import router as cuisine_router
from app.api.v1.routes.menu import router as menu_router
from app.api.v1.routes.registration import router as registration_router


app = FastAPI(
    title="Food Delivery Platform API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
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

# Also expose without /api/v1 prefix for direct POST /menu/categories
app.include_router(
    menu_router,
)


@app.get("/")
def root():
    return {
        "message": "Food Delivery Platform API is running"
    }
