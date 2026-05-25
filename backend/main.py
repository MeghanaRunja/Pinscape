from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from routers import auth, pinterest, analyze


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Pinscape API starting up...")
    yield
    print("Pinscape API shutting down...")


app = FastAPI(
    title="Pinscape API",
    description="Backend for Pinscape — apply Pinterest pins to real life using AI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5500"],
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
