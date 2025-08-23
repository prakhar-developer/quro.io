from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.assistant import router as assistant_router
from dotenv import load_dotenv
from routes.challenge import router as challenge_router


# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# React frontend dev server origin (update for production)
origins = [
    "http://localhost:3000",     # React dev
    "http://127.0.0.1:3000",     # Optional alias
    "http://localhost:5173",     # Vite dev server
    "https://localhost:5173",
    # "https://your-production-site.com"  # Add production if needed
]

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register assistant routes
app.include_router(assistant_router, prefix="/api/assistant")
app.include_router(challenge_router, prefix="/api/challenge")