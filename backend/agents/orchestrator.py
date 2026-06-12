from models.schemas import AdaptRequest, AdaptResponse
from agents.reader_agent import run_reader_agent
from agents.focus_agent import run_focus_agent
from agents.comprehension_agent import run_comprehension_agent
from agents.communication_agent import run_communication_agent
from agents.emotion_agent import run_emotion_agent
import logging
import concurrent.futures

logger = logging.getLogger("bridgemind.orchestrator")

def orchestrate_adaptation(request: AdaptRequest) -> AdaptResponse:
    """
    Parses user request and profile to run selected agents, aggregating their responses.
    """
    # 1. Resolve agent list and settings based on profile
    profile = request.profile.lower()
    selected_agents = set(request.agents)
    focus_level = request.options.focus_level if request.options else 2
    
    if profile == "adhd":
        selected_agents = {"reader", "focus", "comprehension"}
        focus_level = 3
    elif profile == "dyslexia":
        selected_agents = {"reader", "focus", "comprehension"}
        focus_level = 2
    elif profile == "autism":
        selected_agents = {"reader", "focus", "communication", "emotion"}
        focus_level = 2
    
    # 2. Run agents. Since they make external calls, we run them in parallel using ThreadPoolExecutor
    response = AdaptResponse()
    
    # Define tasks to run
    tasks = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        if "focus" in selected_agents:
            tasks["focus"] = executor.submit(run_focus_agent, request.content, focus_level)
            
        if "reader" in selected_agents:
            tasks["reader"] = executor.submit(run_reader_agent, request.content)
            
        if "comprehension" in selected_agents:
            tasks["comprehension"] = executor.submit(run_comprehension_agent, request.content)
            
        if "communication" in selected_agents:
            # Only run communication agent if page_type is form/assignment, OR profile is autism, OR custom requested
            # To be safe, run it if explicitly selected or profile is autism
            tasks["communication"] = executor.submit(run_communication_agent, request.content)
            
        if "emotion" in selected_agents:
            tasks["emotion"] = executor.submit(run_emotion_agent, request.content)
            
        # 3. Gather results
        for agent_name, future in tasks.items():
            try:
                result = future.result()
                if agent_name == "focus":
                    response.focus_output = result
                elif agent_name == "reader":
                    response.reader_output = result
                elif agent_name == "comprehension":
                    response.comprehension_output = result
                elif agent_name == "communication":
                    response.communication_output = result
                elif agent_name == "emotion":
                    response.emotion_output = result
            except Exception as e:
                logger.error(f"Agent '{agent_name}' failed during orchestration: {e}")
                
    return response
