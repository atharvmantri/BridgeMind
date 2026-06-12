from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import AdaptRequest, AdaptResponse, ProfileSettings, ChatRequest, ChatResponse, SimplifyRequest, SimplifyResponse
from agents.orchestrator import orchestrate_adaptation
from utils.gemini_client import chat_with_gemini, simplify_text_with_gemini
from typing import List, Dict
import uvicorn
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

app = FastAPI(
    title="BridgeMind API",
    description="Cognitive accessibility multi-agent adaptation engine",
    version="1.0"
)

# Enable CORS for Chrome Extensions and Frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Built-in profile database (in-memory)
BUILTIN_PROFILES: Dict[str, ProfileSettings] = {
    "adhd": ProfileSettings(
        id="adhd",
        name="ADHD Profile",
        description="Optimized for focus and reading flow. Hides distractions, splits paragraphs, and shows summaries first.",
        focus_level=3,
        reading_level="simple",
        active_agents=["reader", "focus", "comprehension"]
    ),
    "dyslexia": ProfileSettings(
        id="dyslexia",
        name="Dyslexia Profile",
        description="Optimized for parsing. Employs readable layouts, focus guides, and spacing adjustments.",
        focus_level=2,
        reading_level="standard",
        active_agents=["reader", "focus", "comprehension"]
    ),
    "autism": ProfileSettings(
        id="autism",
        name="Autism Profile",
        description="Optimized for predictability and instruction clarity. Highlights warnings and provides explicit step-by-step guidance.",
        focus_level=2,
        reading_level="standard",
        active_agents=["reader", "focus", "communication", "emotion"]
    ),
    "custom": ProfileSettings(
        id="custom",
        name="Custom Profile",
        description="Allows manual configuration of agents, intensities, and features.",
        focus_level=2,
        reading_level="standard",
        active_agents=["reader", "focus", "comprehension", "communication", "emotion"]
    )
}

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the BridgeMind Multi-Agent API",
        "endpoints": {
            "adapt": "/api/adapt",
            "profiles": "/api/profiles"
        }
    }

@app.post("/api/adapt", response_model=AdaptResponse)
def adapt_page(request: AdaptRequest):
    """
    Main endpoint that accepts content and returns cognitive adaptations.
    """
    try:
        logging.info(f"Received adapt request. Profile: {request.profile}, Page Type: {request.page_type}")
        response = orchestrate_adaptation(request)
        return response
    except Exception as e:
        logging.error(f"Error during adaptation process: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Adaptation failed: {str(e)}")

@app.get("/api/profiles", response_model=List[ProfileSettings])
def get_profiles():
    """
    Lists all built-in profiles.
    """
    return list(BUILTIN_PROFILES.values())

@app.get("/api/profiles/{profile_id}", response_model=ProfileSettings)
def get_profile(profile_id: str):
    """
    Gets details for a specific profile.
    """
    pid = profile_id.lower()
    if pid not in BUILTIN_PROFILES:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found.")
    return BUILTIN_PROFILES[pid]

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """
    Endpoint that handles conversation messages from the student about the webpage content.
    """
    try:
        logging.info(f"Received chat query. Profile: {request.profile}")
        response_text = chat_with_gemini(request.content, request.query, request.profile)
        return ChatResponse(response=response_text)
    except Exception as e:
        logging.error(f"Error during chat process: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat query failed: {str(e)}")

@app.post("/api/simplify", response_model=SimplifyResponse)
def simplify_endpoint(request: SimplifyRequest):
    """
    Endpoint that simplifies a specific word/phrase selected by the student.
    """
    try:
        logging.info(f"Received simplify query. Mode: {request.mode}")
        response_text = simplify_text_with_gemini(request.text, request.mode, request.profile or "custom")
        return SimplifyResponse(result=response_text)
    except Exception as e:
        logging.error(f"Error during simplification process: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Simplification failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

