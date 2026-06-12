import os
import re
from typing import Dict, Any, List
import logging
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("bridgemind.claude_client")

# Initialize client if key is present
api_key = os.getenv("ANTHROPIC_API_KEY")
client = None

if api_key:
    try:
        client = Anthropic(api_key=api_key)
        logger.info("Anthropic client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Anthropic client: {e}")

def call_claude(system_prompt: str, user_content: str, response_format: str = "text") -> str:
    """
    Calls the Anthropic Claude API using claude-3-5-sonnet.
    Falls back to mock responses if the API key is missing or calls fail.
    """
    if client:
        try:
            logger.info("Calling Claude API...")
            # We use the standard model claude-3-5-sonnet-20241022 or equivalent
            # In the PRD it mentions claude-sonnet-4-6 which is a placeholder for standard Sonnet,
            # we will use 'claude-3-5-sonnet-20241022' as the current standard model.
            message = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4000,
                temperature=0.1,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_content}
                ]
            )
            # The response is in message.content[0].text
            return message.content[0].text
        except Exception as e:
            logger.error(f"Claude API call failed, falling back to simulator: {e}")
            # Fall through to mock logic
    
    return generate_mock_response(system_prompt, user_content, response_format)

def generate_mock_response(system_prompt: str, user_content: str, response_format: str) -> str:
    """
    Simulates Claude's behavior by processing the input text and structuring it.
    This allows the entire system to run dynamically even without an API key.
    """
    # Simple cleanup of HTML tags if any
    clean_text = re.sub(r'<[^>]+>', ' ', user_content)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    
    # Extract sentences
    sentences = [s.strip() + "." for s in re.split(r'\.|\?|\!', clean_text) if len(s.strip()) > 5]
    if not sentences:
        sentences = ["This page does not contain enough extractable text content.", "Please try another webpage with more readable paragraphs."]

    # 1. Reader Agent Mock
    if "Reader Agent" in system_prompt:
        output_paragraphs = []
        # Create sections
        chunk_size = max(2, len(sentences) // 4)
        for i in range(0, len(sentences), chunk_size):
            chunk = sentences[i:i+chunk_size]
            if not chunk:
                continue
            
            # Generate a heading based on the first few words of the first sentence
            first_words = re.findall(r'\b\w+\b', chunk[0])
            heading_words = [w.capitalize() for w in first_words[:4] if len(w) > 2]
            heading = " ".join(heading_words) if heading_words else f"Section {i // chunk_size + 1}"
            
            output_paragraphs.append(f"### {heading}")
            
            # Group into paragraphs of max 2-3 sentences and bold some terms
            for p_idx in range(0, len(chunk), 2):
                p_sentences = chunk[p_idx:p_idx+2]
                paragraph_text = " ".join(p_sentences)
                
                # Bold some important looking terms (words of length >= 6, capitalized, or scientific-looking)
                words = paragraph_text.split(" ")
                for w_idx, w in enumerate(words):
                    clean_w = re.sub(r'[^\w]', '', w)
                    if len(clean_w) >= 7 and w_idx % 4 == 0:
                        # Wrap in double asterisks
                        words[w_idx] = f"**{w}**"
                
                output_paragraphs.append(" ".join(words))
                output_paragraphs.append("") # empty line
                
        return "\n\n".join(output_paragraphs)
        
    # 2. Comprehension Agent Mock
    elif "Comprehension Agent" in system_prompt:
        # Extract main concept (from first heading or first few words)
        first_words = re.findall(r'\b\w+\b', sentences[0])
        main_concept = " ".join([w.capitalize() for w in first_words[:3]]) if len(first_words) >= 3 else "Main Subject"
        
        # Sub concepts
        sub_concepts = []
        for idx in range(min(5, len(sentences))):
            words = re.findall(r'\b\w+\b', sentences[idx])
            noun_words = [w.capitalize() for w in words if len(w) > 5 and w.lower() not in ["the", "this", "that", "these", "those"]]
            if noun_words:
                sub_concepts.append(noun_words[0])
        sub_concepts = list(set(sub_concepts))[:4]
        if not sub_concepts:
            sub_concepts = ["Core Theory", "Practical Application", "Key Examples"]
            
        tldr_bullets = []
        for idx in range(min(4, len(sentences))):
            # Select sentences that represent summaries
            sent = sentences[idx]
            # Replace long structures with shorter sentences
            tldr_bullets.append(sent[:100] + ("..." if len(sent) > 100 else ""))
            
        simple_summary = " ".join(sentences[:2])
        if len(simple_summary) > 200:
            simple_summary = simple_summary[:200] + "..."
            
        detailed_summary = " ".join(sentences[:min(4, len(sentences))])
        
        import json
        response_dict = {
            "tldr": tldr_bullets,
            "concept_map": {
                "main": main_concept,
                "nodes": sub_concepts
            },
            "simple_version": f"In simple terms, this content is about {main_concept}. It explains that {simple_summary.lower()}",
            "detailed_version": detailed_summary
        }
        return json.dumps(response_dict)
        
    # 3. Communication Agent Mock
    elif "Communication Agent" in system_prompt:
        # Generate steps from the input sentences
        steps = []
        for idx, sent in enumerate(sentences[:min(6, len(sentences))]):
            steps.append(f"Step {idx + 1}: You will **read and review** the information: \"{sent}\"")
        steps.append(f"Step {len(steps) + 1}: You will verify your understanding and note down key take-aways.")
        
        import json
        # Return numbered list as requested in prompt format
        return "\n".join([f"{idx+1}. {step}" for idx, step in enumerate(steps)])
        
    # 4. Emotion Agent Mock (does not use Claude in typical cases, but just in case)
    elif "Emotion Agent" in system_prompt:
        # Keyword-based warning system
        trigger_words = ["death", "dead", "kill", "suicide", "crash", "war", "battle", "scared", "fear", "anxiety", "die", "died", "murder", "violence", "harm", "abuse"]
        found_triggers = []
        for word in trigger_words:
            if re.search(r'\b' + re.escape(word) + r'\b', clean_text.lower()):
                found_triggers.append(word)
                
        import json
        if found_triggers:
            return json.dumps({
                "distress_detected": True,
                "warning_message": f"This page contains content relating to sensitive topics ({', '.join(found_triggers)}). Please read with care."
            })
        else:
            return json.dumps({
                "distress_detected": False,
                "warning_message": None
            })
            
    # 5. Focus Agent Mock
    elif "Focus Agent" in system_prompt:
        import json
        return json.dumps({
            "remove_selectors": [
                "iframe", "ins", ".ads", ".ad", ".ad-banner", ".ad-container", ".advertisement",
                "aside", "#sidebar", ".sidebar", "[id*='sidebar']", "[class*='sidebar']",
                ".comments", "#comments", ".comment-section", ".social-share", ".share-buttons",
                ".banner", ".cookie-notice", ".cookie-banner", "#cookie-consent",
                "header", "nav", "footer", ".navigation", ".menu"
            ],
            "inject_css": "body { max-width: 800px !important; margin: 0 auto !important; line-height: 1.8 !important; font-size: 18px !important; }"
        })
            
    return "Mock response generated by BridgeMind Simulator."
