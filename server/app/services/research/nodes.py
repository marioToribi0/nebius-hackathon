"""
LangGraph nodes for the research agent.

Each node is a plain async function that receives the current ResearchState
and returns a dict with the keys it wants to update.
"""

import json
import re
from datetime import datetime, timezone
from functools import lru_cache

from openai import AsyncOpenAI

from app.core.config import settings
from app.core.logging import logger
from app.services.research.state import ResearchState, StopDocument, StopInfo
from app.services.search.tavily_service import SearchResult, search_place, search_place_stop


@lru_cache(maxsize=1)
def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url=settings.NEBIUS_BASE_URL,
        api_key=settings.NEBIUS_API_KEY,
    )


async def _chat(system: str, user: str) -> str:
    """Send a chat completion request to Nebius and return the response text."""
    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.NEBIUS_CHAT_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.3,
    )
    return response.choices[0].message.content or ""


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def _extract_json_block(text: str) -> str:
    """Extract the first JSON array or object from a string."""
    match = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
    if match:
        return match.group(1).strip()
    match = re.search(r"(\[[\s\S]*\]|\{[\s\S]*\})", text)
    if match:
        return match.group(1).strip()
    return text.strip()


def _build_search_context_doc(
    place_key: str,
    place_name: str,
    overview_results: list[SearchResult],
    stop_results: list[tuple[str, list[SearchResult]]],
) -> StopDocument:
    """
    Build a hidden RAG-only document that aggregates every search result
    from the overview and all individual stops. This is not shown in the
    checklist but is embedded so the retrieval system can answer detailed
    questions grounded in the original web sources.
    """
    lines: list[str] = [
        f"# Search Context: {place_name}",
        "",
        "_This document is generated automatically and aggregates all raw web search results "
        "used to produce the route plan. It is used for semantic search and is not displayed "
        "to visitors._",
        "",
        "---",
        "",
        "## Overview Search Results",
        "",
    ]
    all_urls: list[str] = []

    for r in overview_results:
        lines += [f"### [{r['title']}]({r['url']})", "", r["content"], ""]
        if r["url"]:
            all_urls.append(r["url"])

    for stop_title, results in stop_results:
        lines += ["---", "", f"## Stop: {stop_title}", ""]
        for r in results:
            lines += [f"### [{r['title']}]({r['url']})", "", r["content"], ""]
            if r["url"]:
                all_urls.append(r["url"])

    lines += ["---", "", "## All Sources", ""]
    lines += [f"- {url}" for url in dict.fromkeys(all_urls)]

    return StopDocument(
        doc_key=f"{place_key}-search-context",
        title="Search Context (RAG)",
        order=0,
        estimated_minutes=0,
        content="\n".join(lines),
        sources=list(dict.fromkeys(all_urls)),
        is_search_context=True,
    )


# ---------------------------------------------------------------------------
# Graph nodes
# ---------------------------------------------------------------------------


async def search_and_plan(state: ResearchState) -> dict:
    """
    Node 1: Search for overview information about the place using Tavily,
    then ask the LLM to write a narrative route_plan and extract a structured
    list of stops with time allocations summing to 30 minutes.
    """
    place_name = state["place_name"]
    place_key = state["place_key"]
    logger.info("[{}] search_and_plan | starting overview search", place_key)

    overview_results = await search_place(place_name, max_results=6)
    logger.info(
        "[{}] search_and_plan | got {} overview results",
        place_key,
        len(overview_results),
    )

    context = "\n\n".join(
        f"[{r['title']}]({r['url']})\n{r['content']}" for r in overview_results
    )

    system_prompt = (
        "You are an expert tourism guide and historian. "
        "Given web search results about a place, produce two things:\n"
        "1. A short narrative paragraph (3-5 sentences) summarising the 30-minute visit experience.\n"
        "2. A JSON array of stops the visitor should make. "
        "Each stop must have 'title' (string) and 'estimated_minutes' (integer). "
        "The sum of estimated_minutes must equal exactly 30. "
        "Aim for 4-6 stops.\n\n"
        "Respond ONLY in the following format (no extra text):\n"
        "NARRATIVE:\n<narrative paragraph>\n\n"
        "STOPS:\n```json\n[{...}]\n```"
    )

    user_prompt = f"Place: {place_name}\n\nSearch results:\n{context}"

    logger.info("[{}] search_and_plan | calling LLM ({})", place_key, settings.NEBIUS_CHAT_MODEL)
    raw = await _chat(system_prompt, user_prompt)
    logger.debug("[{}] search_and_plan | LLM raw response length={}", place_key, len(raw))

    # Parse narrative
    narrative = ""
    if "NARRATIVE:" in raw:
        after_narrative = raw.split("NARRATIVE:", 1)[1]
        narrative = after_narrative.split("STOPS:")[0].strip()

    # Parse stops JSON
    stops: list[StopInfo] = []
    stops_match = re.search(r"STOPS:\s*([\s\S]*)", raw)
    if stops_match:
        stops_raw = _extract_json_block(stops_match.group(1))
        try:
            parsed = json.loads(stops_raw)
            for item in parsed:
                stops.append(
                    StopInfo(
                        title=str(item.get("title", "")),
                        estimated_minutes=int(item.get("estimated_minutes", 5)),
                    )
                )
        except (json.JSONDecodeError, TypeError):
            logger.warning("[{}] search_and_plan | failed to parse stops JSON, using fallback", place_key)

    if not stops:
        stops = [StopInfo(title=place_name, estimated_minutes=30)]

    total_minutes = sum(s["estimated_minutes"] for s in stops)
    logger.info(
        "[{}] search_and_plan | planned {} stops, total {} min",
        place_key,
        len(stops),
        total_minutes,
    )
    for s in stops:
        logger.debug("[{}]   stop: {!r} ({}min)", place_key, s["title"], s["estimated_minutes"])

    return {
        "overview_results": overview_results,
        "route_plan": narrative,
        "stops": stops,
        "error": None,
    }


async def research_stops(state: ResearchState) -> dict:
    """
    Node 2: For each stop, search Tavily and generate a detailed markdown
    document with sources. Also builds a hidden search-context document
    that aggregates all raw search results for RAG embedding.
    """
    place_name = state["place_name"]
    place_key = state["place_key"]
    stops = state["stops"]
    overview_results = state["overview_results"]

    logger.info("[{}] research_stops | researching {} stops", place_key, len(stops))

    stop_documents: list[StopDocument] = []
    all_stop_results: list[tuple[str, list[SearchResult]]] = []

    for order, stop in enumerate(stops, start=1):
        title = stop["title"]
        estimated_minutes = stop["estimated_minutes"]
        doc_key = f"{place_key}-{_slugify(title)}"

        logger.info(
            "[{}] research_stops | [{}/{}] searching for {!r}",
            place_key,
            order,
            len(stops),
            title,
        )

        results = await search_place_stop(place_name, title, max_results=5)
        all_stop_results.append((title, results))

        context = "\n\n".join(
            f"[{r['title']}]({r['url']})\n{r['content']}" for r in results
        )
        source_urls = [r["url"] for r in results if r["url"]]

        system_prompt = (
            "You are an expert tourism guide and historian. "
            "Write a detailed, engaging markdown document about the given stop. "
            "Use the provided web search results as your primary source. "
            "Structure the document with a top-level heading, multiple sections, "
            "interesting facts, historical context, and visitor tips. "
            "End the document with a '## Sources' section listing the source URLs as a markdown list. "
            "Write the document entirely in English."
        )

        user_prompt = (
            f"Place: {place_name}\n"
            f"Stop: {title}\n"
            f"Time allocated: {estimated_minutes} minutes\n\n"
            f"Search results:\n{context}"
        )

        logger.info(
            "[{}] research_stops | [{}/{}] calling LLM for {!r}",
            place_key,
            order,
            len(stops),
            title,
        )
        content = (await _chat(system_prompt, user_prompt)).strip()

        if "## Sources" not in content:
            sources_section = "\n\n## Sources\n" + "\n".join(
                f"- {url}" for url in source_urls
            )
            content += sources_section

        logger.debug(
            "[{}] research_stops | [{}/{}] doc generated, {} chars",
            place_key,
            order,
            len(stops),
            len(content),
        )

        stop_documents.append(
            StopDocument(
                doc_key=doc_key,
                title=title,
                order=order,
                estimated_minutes=estimated_minutes,
                content=content,
                sources=source_urls,
                is_search_context=False,
            )
        )

    # Build the aggregated search-context document
    search_context_doc = _build_search_context_doc(
        place_key, place_name, overview_results, all_stop_results
    )
    stop_documents.append(search_context_doc)
    logger.info(
        "[{}] research_stops | search-context doc built ({} chars)",
        place_key,
        len(search_context_doc["content"]),
    )

    return {"stop_documents": stop_documents}


async def save_to_mongo(state: ResearchState) -> dict:
    """
    Node 3: Upsert the assembled PlaceResearch document into MongoDB.
    redis_keys are left empty — they are populated on /embeddings/sync.
    """
    from app.databases.mongodb import get_database

    place_key = state["place_key"]
    logger.info("[{}] save_to_mongo | upserting to MongoDB", place_key)

    db = get_database()
    collection = db["place_research"]

    now = datetime.now(timezone.utc)

    documents = [
        {
            "doc_key": doc["doc_key"],
            "title": doc["title"],
            "order": doc["order"],
            "estimated_minutes": doc["estimated_minutes"],
            "content": doc["content"],
            "sources": doc["sources"],
            "redis_keys": [],
            "is_search_context": doc["is_search_context"],
        }
        for doc in state["stop_documents"]
    ]

    await collection.update_one(
        {"place_key": place_key},
        {
            "$set": {
                "place_name": state["place_name"],
                "route_plan": state["route_plan"],
                "documents": documents,
                "status": "completed",
                "error": None,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    display_count = sum(1 for d in documents if not d["is_search_context"])
    logger.info(
        "[{}] save_to_mongo | saved {} display docs + 1 search-context doc",
        place_key,
        display_count,
    )

    return {}
