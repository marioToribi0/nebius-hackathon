from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from app.core.config import settings
from app.core.logging import logger
from app.services.guide.tools import make_retrieval_tool, search_web


def _get_guide_model() -> str:
    """Return the model ID for the guide agent."""
    if settings.NEBIUS_GUIDE_MODEL:
        return settings.NEBIUS_GUIDE_MODEL
    return settings.NEBIUS_CHAT_MODEL


def build_guide_agent(place_key: str, place_name: str):
    """Build a per-session ReAct agent with place-specific tools."""
    model_id = _get_guide_model()
    logger.info("Building guide agent | place_key={!r} model={!r}", place_key, model_id)

    llm = ChatOpenAI(
        model=model_id,
        api_key=settings.NEBIUS_API_KEY,
        base_url=settings.NEBIUS_BASE_URL,
        streaming=True,
    )

    tools = [search_web, make_retrieval_tool(place_key)]

    system_prompt = (
        f"You are Wayfinder, an expert AI tour guide for {place_name}. "
        "You are friendly, knowledgeable, and enthusiastic about helping visitors discover this place. "
        "Use retrieve_knowledge first for place-specific questions, as it contains researched information. "
        "Use search_web for current events, recent news, or information not in the knowledge base. "
        "Keep responses concise but informative. Use markdown formatting where helpful."
    )

    agent = create_react_agent(
        model=llm,
        tools=tools,
        prompt=system_prompt,
    )

    return agent
