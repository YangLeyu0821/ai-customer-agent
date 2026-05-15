from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models.chat import ChatRequest, ChatResponse
from app.services.openai_client import (
    MissingOpenAIKeyError,
    OpenAIRateLimitError,
    OpenAIUpstreamError,
    get_openai_runtime_config,
    generate_customer_service_reply,
)

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


@app.get("/debug/openai-config")
def debug_openai_config() -> dict[str, str | bool | float]:
    return get_openai_runtime_config()


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    try:
        reply = generate_customer_service_reply(request.message)
    except MissingOpenAIKeyError as exc:
        raise HTTPException(
            status_code=500,
            detail="\u540e\u7aef\u672a\u914d\u7f6e OPENAI_API_KEY\uff0c\u8bf7\u5728 .env \u4e2d\u8bbe\u7f6e\u540e\u91cd\u542f\u670d\u52a1\u3002",
        ) from exc
    except OpenAIRateLimitError as exc:
        raise HTTPException(
            status_code=429,
            detail="\u5f53\u524d OpenAI \u8bf7\u6c42\u8fc7\u591a\u6216\u989d\u5ea6\u53d7\u9650\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002",
        ) from exc
    except OpenAIUpstreamError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    return ChatResponse(reply=reply)
