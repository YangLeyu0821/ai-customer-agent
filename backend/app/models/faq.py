from pydantic import BaseModel


class FaqFile(BaseModel):
    filename: str
    size_bytes: int
    uploaded_at: str


class FaqUploadResponse(BaseModel):
    filename: str
    saved_as: str
    size_bytes: int
    chunk_count: int
    message: str


class FaqDeleteResponse(BaseModel):
    filename: str
    message: str


class FaqReindexResponse(BaseModel):
    file_count: int
    chunk_count: int
    message: str
