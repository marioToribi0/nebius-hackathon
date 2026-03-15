import httpx

from app.core.config import settings
from app.core.logging import logger
from app.models.place import ImageResult

PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search"


async def search_images(queries: list[str]) -> list[ImageResult]:
    """Search Pexels for one landscape image per query."""
    results: list[ImageResult] = []
    headers = {"Authorization": settings.PEXELS_API_KEY}

    async with httpx.AsyncClient() as client:
        for query in queries:
            try:
                resp = await client.get(
                    PEXELS_SEARCH_URL,
                    params={
                        "query": query,
                        "per_page": 1,
                        "orientation": "landscape",
                    },
                    headers=headers,
                    timeout=10,
                )
                resp.raise_for_status()
                data = resp.json()
                photos = data.get("photos", [])
                if photos:
                    photo = photos[0]
                    # Use large2x src and append WebP format
                    url = photo["src"].get("large2x", photo["src"]["original"])
                    if "?" in url:
                        url += "&fm=webp"
                    else:
                        url += "?fm=webp"
                    results.append(
                        ImageResult(
                            url=url,
                            alt=photo.get("alt", query),
                            photographer=photo.get("photographer", ""),
                            query=query,
                        )
                    )
            except Exception as e:
                logger.warning("Pexels search failed for '{}': {}", query, e)

    return results
