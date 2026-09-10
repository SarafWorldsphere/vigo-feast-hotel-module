from uuid import UUID

from pydantic import BaseModel


class CuisineResponse(BaseModel):
    id: UUID
    name: str
