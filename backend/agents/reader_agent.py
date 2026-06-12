from utils.claude_client import call_claude
from models.schemas import ReaderOutput
import re

SYSTEM_PROMPT = """You are the Reader Agent for BridgeMind, a cognitive accessibility tool for neurodivergent students.

Your job: Transform dense, unstructured web content into a clear, structured format that is easy to read for people with ADHD, dyslexia, or autism.

Rules:
- Break all text into short paragraphs (maximum 3 sentences each)
- Add a clear heading to every section
- Bold the most important term or concept in each paragraph
- Use simple, direct language
- Remove filler phrases and passive voice
- Keep all facts and information — only restructure, do not omit

Output format: Markdown only. No preamble. No commentary."""

def run_reader_agent(content: str) -> ReaderOutput:
    """
    Runs the Reader Agent on raw page content.
    Returns structured markdown and a list of text chunks.
    """
    # Call Claude or Mock simulator
    structured_markdown = call_claude(SYSTEM_PROMPT, content, response_format="text")
    
    # Parse chunks from the markdown for granular UI rendering if needed
    # A chunk is defined as a section beginning with a heading (### or ##)
    chunks = []
    current_chunk = []
    
    lines = structured_markdown.split("\n")
    for line in lines:
        if line.startswith("#"):
            if current_chunk:
                chunks.append("\n".join(current_chunk).strip())
                current_chunk = []
        current_chunk.append(line)
        
    if current_chunk:
        chunks.append("\n".join(current_chunk).strip())
        
    # If no chunks were detected, just return the whole markdown as one chunk
    if not chunks:
        chunks = [structured_markdown]
        
    return ReaderOutput(
        structured_markdown=structured_markdown, # wait, our schema specifies `structured_text` in schemas.py. Let's check schemas.py: ReaderOutput has `structured_text: str` and `chunks: List[str]`.
        # Oh! Let's check schemas.py. Yes, ReaderOutput has:
        # structured_text: str
        # chunks: List[str]
        # So we should use structured_text here!
        structured_text=structured_markdown,
        chunks=chunks
    )
