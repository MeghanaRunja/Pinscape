from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import get_settings
from routers import auth, pinterest, analyze


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Pinscape API starting up...")
    yield
    print("Pinscape API shutting down...")


settings = get_settings()

app = FastAPI(
    title="Pinscape API",
    description="Backend for Pinscape — apply Pinterest pins to real life using AI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    # Origins are configured via CORS_ORIGINS in .env so they don't need a
    # code change when adding a production domain.
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/auth",      tags=["Auth"])
app.include_router(pinterest.router, prefix="/pinterest",  tags=["Pinterest"])
app.include_router(analyze.router,   prefix="/analyze",   tags=["Analyze"])


@app.get("/health")
def health():
    return {"status": "ok"}
