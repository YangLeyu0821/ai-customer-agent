from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str

app = FastAPI(title="AI Customer Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "AI Customer Agent API"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    return ChatResponse(
        reply=f"\u6211\u5df2\u6536\u5230\u4f60\u7684\u6d88\u606f\uff1a{request.message}\u3002\u8fd9\u662f\u540e\u7aef\u8fd4\u56de\u7684\u56fa\u5b9a\u56de\u590d\u3002"
    )
