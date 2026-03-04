from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
from app.config import ORCHESTRATOR_MODEL
from app.prompts.root_system import ROOT_SYSTEM_PROMPT
from app.tools.spatial import analyze_room
from app.tools.design import generate_redesign, generate_color_palette
from app.tools.shopping import search_furniture, build_complete_shopping_list


def create_root_agent() -> LlmAgent:
    tools = [
        FunctionTool(analyze_room),
        FunctionTool(generate_redesign),
        FunctionTool(generate_color_palette),
        FunctionTool(search_furniture),
        FunctionTool(build_complete_shopping_list),
    ]

    agent = LlmAgent(
        name="Architect",
        model=ORCHESTRATOR_MODEL,
        instruction=ROOT_SYSTEM_PROMPT,
        tools=tools,
    )

    return agent
