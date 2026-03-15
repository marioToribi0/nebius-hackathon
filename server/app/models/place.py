from datetime import datetime

from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    lat: float
    lng: float


class PlaceCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    coordinates: Coordinates | None = None
    image_url: str = ""
    image_alt: str = ""
    search_query: str = ""


class PlacePublic(BaseModel):
    id: str
    name: str
    description: str
    coordinates: Coordinates | None
    image_url: str
    image_alt: str
    search_query: str
    created_by: str
    created_at: datetime


class ImageSearchRequest(BaseModel):
    queries: list[str]


class ImageResult(BaseModel):
    url: str
    alt: str
    photographer: str
    query: str


class TripQuestion(BaseModel):
    question: str
    options: list[str]


class TripQuestionsResponse(BaseModel):
    questions: list[TripQuestion]
