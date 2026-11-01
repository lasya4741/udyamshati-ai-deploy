import sys
from pathlib import Path
from fastapi import FastAPI

# Add ai-service to Python module search path
BASE_DIR = Path(__file__).resolve().parent.parent
AI_SERVICE_DIR = BASE_DIR / "ai-service"
if str(AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_DIR))

from app.main import app as ai_app

# Main wrapper app mounting both /ai and root to guarantee all route prefixes match
app = FastAPI(
    title="UdyamSaarthi AI Service Gateway",
    description="Vercel Serverless Gateway for UdyamSaarthi AI Microservice"
)
app.mount("/ai", ai_app)
app.mount("", ai_app)
