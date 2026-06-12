from utils.claude_client import call_claude
from models.schemas import CommunicationOutput
import re

SYSTEM_PROMPT = """You are the Communication Agent for BridgeMind, a cognitive accessibility tool for neurodivergent students.

Your job: Rewrite assignment prompts, form instructions, and task descriptions so they are crystal clear for autistic students and students with ADHD.

Rules:
- Convert all implicit expectations into explicit numbered steps
- Remove all ambiguous language ("somehow", "as appropriate", "etc.")
- State the exact deliverable required
- Specify what "done" looks like
- Use "You will..." sentence structure for each step

Output format: A numbered list of steps. Nothing else. Do not add any preamble, intro, or markdown formatting outside the list."""

def run_communication_agent(content: str) -> CommunicationOutput:
    """
    Runs the Communication Agent on instructional text or prompts.
    """
    rewritten = call_claude(SYSTEM_PROMPT, content, response_format="text")
    
    # Parse the steps out of the response
    # We look for lines starting with "1. ", "2. ", etc., or just list markers
    steps = []
    lines = rewritten.split("\n")
    for line in lines:
        cleaned_line = line.strip()
        if not cleaned_line:
            continue
        
        # Match "1. Step description" or "1) Step description"
        match = re.match(r'^\d+[\.\)]\s*(.*)$', cleaned_line)
        if match:
            steps.append(match.group(1).strip())
        elif cleaned_line.startswith("-") or cleaned_line.startswith("*"):
            steps.append(cleaned_line[1:].strip())
        else:
            steps.append(cleaned_line)
            
    # If we couldn't parse any steps, treat the whole output as a single step
    if not steps:
        steps = [rewritten]
        
    return CommunicationOutput(
        rewritten_instructions=rewritten,
        steps=steps
    )
