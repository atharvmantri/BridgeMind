from utils.claude_client import call_claude
from models.schemas import EmotionOutput
import json
import re
import logging

logger = logging.getLogger("bridgemind.emotion_agent")

SYSTEM_PROMPT = """You are the Emotion Agent for BridgeMind, a cognitive accessibility tool for neurodivergent students.

Your job: Analyze text content to detect potential distressing, graphic, or anxiety-inducing topics (such as violence, self-harm, suicide, warfare, death, abuse, or severe crisis language).

Produce a JSON object with two keys:
1. "distress_detected": A boolean (true or false) indicating if potentially distressing content was found.
2. "warning_message": A helpful, neutral, and gentle warning message (e.g. "This article contains descriptions of warfare that may be distressing.") or null if distress_detected is false.

Output ONLY valid JSON. No markdown fences. No commentary."""

# Regex fallback for triggering words
TRIGGER_WORDS = [
    r'\bdeath\b', r'\bdied\b', r'\bdeadly\b', r'\bkilled\b', r'\bkilling\b', r'\bmurder\b',
    r'\bsuicide\b', r'\bself-harm\b', r'\bviolence\b', r'\bviolent\b', r'\babuse\b',
    r'\bwarfare\b', r'\bwar\b', r'\bbombing\b', r'\bterrorism\b', r'\bshooting\b',
    r'\bgenocide\b', r'\btorture\b', r'\bcrisis\b', r'\baccident\b', r'\bfatal\b'
]

def run_emotion_agent(content: str) -> EmotionOutput:
    """
    Runs the Emotion Agent to flag distressing content and supply warnings.
    """
    # Truncate content to first 6k characters for performance
    truncated_content = content[:6000]
    
    # 1. First run a quick local regex check as a fast pass
    found_triggers = []
    content_lower = truncated_content.lower()
    for pattern in TRIGGER_WORDS:
        if re.search(pattern, content_lower):
            # Extract word from pattern for user display if needed
            word = pattern.replace(r'\b', '')
            found_triggers.append(word)
            
    # If triggers are found or we want to double check, call Claude
    # If Claude client isn't available, we use local detection to immediately return
    try:
        response_text = call_claude(SYSTEM_PROMPT, truncated_content, response_format="json")
        response_text = response_text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        data = json.loads(response_text)
        return EmotionOutput(
            distress_detected=data.get("distress_detected", False),
            warning_message=data.get("warning_message", None)
        )
    except Exception as e:
        logger.error(f"Failed to parse Emotion Agent response: {e}. Falling back to keyword search.")
        if found_triggers:
            # Clean up duplicates
            unique_triggers = list(set(found_triggers))[:3]
            return EmotionOutput(
                distress_detected=True,
                warning_message=f"This content contains sensitive terms ({', '.join(unique_triggers)}) that might be distressing."
            )
        return EmotionOutput(
            distress_detected=False,
            warning_message=None
        )
