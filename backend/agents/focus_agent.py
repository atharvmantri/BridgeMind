from utils.claude_client import call_claude
from models.schemas import FocusOutput
import json
import logging

logger = logging.getLogger("bridgemind.focus_agent")

SYSTEM_PROMPT = """You are the Focus Agent for BridgeMind, a cognitive accessibility tool for neurodivergent students.

Your job: Identify distracting elements on a webpage (such as advertisements, sidebars, headers, footers, comment sections, social share buttons, and pop-ups) based on the page's HTML structure or textual context.

Produce a JSON output with two keys:
1. "remove_selectors": An array of CSS selectors (e.g. ".ad-banner", "#sidebar", "aside", ".comments-section") that should be hidden from the DOM to reduce distractions.
2. "inject_css": A string containing clean, responsive CSS rules to inject into the webpage to maximize readability, focus, and line spacing (e.g. adjust margins, background color suggestions, line height, font family instructions).

Output ONLY valid JSON. No markdown fences. No commentary."""

def run_focus_agent(content: str, focus_level: int = 2) -> FocusOutput:
    """
    Runs the Focus Agent to generate DOM cleanup selectors and CSS rules.
    """
    # Standard fallback selectors for general pages
    default_selectors = [
        "iframe", "ins", ".ads", ".ad", ".ad-banner", ".ad-container", ".advertisement",
        "aside", "#sidebar", ".sidebar", "[id*='sidebar']", "[class*='sidebar']",
        ".comments", "#comments", ".comment-section", ".social-share", ".share-buttons",
        ".banner", ".cookie-notice", ".cookie-banner", "#cookie-consent",
        "header", "nav", "footer", ".navigation", ".menu"
    ]
    
    default_css = """
    .bridgemind-focus-active {
        max-width: 800px !important;
        margin: 0 auto !important;
        line-height: 1.8 !important;
        font-size: 18px !important;
    }
    """
    
    # Run Claude or mock simulator
    # If the user content is very long, we only send the head/structure or first 8k chars to prevent token overflow
    truncated_content = content[:8000]
    
    try:
        response_text = call_claude(SYSTEM_PROMPT, truncated_content, response_format="json")
        # Strip any markdown code fences if Claude includes them
        response_text = response_text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        data = json.loads(response_text)
        
        remove_selectors = data.get("remove_selectors", default_selectors)
        inject_css = data.get("inject_css", default_css)
        
        # Depending on focus level, scale selectors
        if focus_level == 1:
            # Low focus: keep navigation, only remove actual ads and comments
            remove_selectors = [s for s in remove_selectors if "header" not in s and "nav" not in s and "menu" not in s]
        elif focus_level == 3:
            # Maximum focus: aggressively remove everything except the main content container
            if "header" not in remove_selectors:
                remove_selectors.append("header")
            if "nav" not in remove_selectors:
                remove_selectors.append("nav")
            if "footer" not in remove_selectors:
                remove_selectors.append("footer")
                
        return FocusOutput(
            remove_selectors=remove_selectors,
            inject_css=inject_css
        )
    except Exception as e:
        logger.error(f"Failed to parse Focus Agent response: {e}. Using default rules.")
        return FocusOutput(
            remove_selectors=default_selectors,
            inject_css=default_css
        )
