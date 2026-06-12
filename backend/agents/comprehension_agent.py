from utils.claude_client import call_claude
from models.schemas import ComprehensionOutput, ConceptMap
import json
import logging

logger = logging.getLogger("bridgemind.comprehension_agent")

SYSTEM_PROMPT = """You are the Comprehension Agent for BridgeMind, a cognitive accessibility tool for neurodivergent students.

Your job: Help neurodivergent students quickly understand what a page is about before (or instead of) reading it fully.

Produce FOUR outputs in a JSON object:
1. "tldr": An array of exactly 3-5 bullet points summarizing the key points.
2. "concept_map": A JSON object representing the main concept and its 3-5 related sub-concepts: { "main": "MAIN_CONCEPT_NAME", "nodes": ["SUB_CONCEPT_1", "SUB_CONCEPT_2", ...] }
3. "simple_version": A 2-3 sentence plain English summary (Grade 6 reading level).
4. "detailed_version": A longer, comprehensive summary of the core arguments and contents.

Output ONLY valid JSON. No markdown fences. No commentary."""

def run_comprehension_agent(content: str) -> ComprehensionOutput:
    """
    Runs the Comprehension Agent to generate summaries and a concept map.
    """
    # Truncate content to avoid token overflow
    truncated_content = content[:10000]
    
    try:
        response_text = call_claude(SYSTEM_PROMPT, truncated_content, response_format="json")
        response_text = response_text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        data = json.loads(response_text)
        
        # Build concept map
        cmap_data = data.get("concept_map", {})
        concept_map = ConceptMap(
            main=cmap_data.get("main", "Core Topic"),
            nodes=cmap_data.get("nodes", ["Concept A", "Concept B", "Concept C"])
        )
        
        return ComprehensionOutput(
            tldr=data.get("tldr", ["Key summary point 1", "Key summary point 2", "Key summary point 3"]),
            concept_map=concept_map,
            simple_version=data.get("simple_version", "This is a simplified summary of the page content."),
            detailed_version=data.get("detailed_version", "This is a detailed summary of the page content.")
        )
    except Exception as e:
        logger.error(f"Failed to parse Comprehension Agent response: {e}. Using fallback generator.")
        # Fallback values
        return ComprehensionOutput(
            tldr=["Summary not available due to parser error.", "Please check the original page content.", "Verify your internet connection."],
            concept_map=ConceptMap(main="Parsing Error", nodes=["Error Details", "Claude Client", "Fallback Mode"]),
            simple_version="We couldn't simplify this page's text right now.",
            detailed_version="Error details: " + str(e)
        )
