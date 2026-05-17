from pydantic import BaseModel, Field


class ChatSource(BaseModel):
    filename: str
    chunk_index: int
    preview: str


class ChatOrder(BaseModel):
    order_id: str
    status: str
    logistics_status: str
    estimated_delivery: str
    carrier: str
    tracking_number: str
    product_name: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: str = Field(default="default", min_length=1, max_length=120)


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    sources: list[ChatSource] = []
    order: ChatOrder | None = None


class ChatSessionSummary(BaseModel):
    session_id: str
    last_message: str
    updated_at: str
    message_count: int


class ChatHistoryMessage(BaseModel):
    role: str
    content: str
    created_at: str
