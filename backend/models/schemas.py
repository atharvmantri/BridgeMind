from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

# Profile types
ProfileType = Literal["adhd", "dyslexia", "autism", "custom"]
PageType = Literal["article", "assignment", "form", "general"]
ReadingLevel = Literal["simple", "standard", "detailed"]

class AdaptOptions(BaseModel):
    focus_level: int = Field(default=2, ge=1, le=3)
    reading_level: ReadingLevel = Field(default="standard")

class AdaptRequest(BaseModel):
    content: str
    page_type: PageType = Field(default="general")
    profile: ProfileType = Field(default="custom")
    agents: List[str] = Field(default_factory=lambda: ["reader", "focus", "comprehension", "communication", "emotion"])
    options: Optional[AdaptOptions] = Field(default_factory=AdaptOptions)

class ReaderOutput(BaseModel):
    structured_text: str
    chunks: List[str]

class FocusOutput(BaseModel):
    remove_selectors: List[str]
    inject_css: str

class ConceptMap(BaseModel):
    main: str
    nodes: List[str]

class ComprehensionOutput(BaseModel):
    tldr: List[str]
    concept_map: ConceptMap
    simple_version: str
    detailed_version: str

class CommunicationOutput(BaseModel):
    rewritten_instructions: str
    steps: List[str]

class EmotionOutput(BaseModel):
    distress_detected: bool
    warning_message: Optional[str] = None

class AdaptResponse(BaseModel):
    reader_output: Optional[ReaderOutput] = None
    focus_output: Optional[FocusOutput] = None
    comprehension_output: Optional[ComprehensionOutput] = None
    communication_output: Optional[CommunicationOutput] = None
    emotion_output: Optional[EmotionOutput] = None

# Profile representation
class ProfileSettings(BaseModel):
    id: str
    name: str
    description: str
    focus_level: int
    reading_level: ReadingLevel
    active_agents: List[str]
    custom_rules: Optional[Dict[str, Any]] = None

# New schemas for Interactive Features
class ChatRequest(BaseModel):
    content: str
    query: str
    profile: ProfileType = Field(default="custom")

class ChatResponse(BaseModel):
    response: str

class SimplifyRequest(BaseModel):
    text: str
    mode: Literal["define", "simplify"]
    profile: Optional[ProfileType] = Field(default="custom")

class SimplifyResponse(BaseModel):
    result: str

