import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.requests import router as requests_router

app = FastAPI(title="Decision Queue API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(requests_router)
