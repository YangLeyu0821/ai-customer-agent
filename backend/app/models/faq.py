from pydantic import BaseModel


class FaqUploadResponse(BaseModel):
    filename: str
    saved_as: str
    size_bytes: int
    chunk_count: int
    message: str
