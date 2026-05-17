from fastapi import FastAPI
from fastapi import File
from fastapi import HTTPException
from fastapi import UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.models.chat import ChatOrder, ChatRequest, ChatResponse, ChatSource
from app.models.faq import FaqDeleteResponse, FaqFile, FaqUploadResponse
from app.rag.retriever import build_faq_sources, format_faq_context, retrieve_faq_context
from app.services.faq_service import delete_faq_file, list_faq_files, save_faq_upload
from app.services.memory_service import append_turn, get_recent_messages
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


@app.get("/api/faq/files", response_model=list[FaqFile])
def get_faq_files() -> list[FaqFile]:
    return [FaqFile(**file) for file in list_faq_files()]


@app.delete("/api/faq/files/{filename}", response_model=FaqDeleteResponse)
def delete_faq(filename: str) -> FaqDeleteResponse:
    deleted_filename = delete_faq_file(filename)
    return FaqDeleteResponse(
        filename=deleted_filename,
        message="\u6587\u4ef6\u5df2\u5220\u9664\uff0c\u5bf9\u5e94 ChromaDB chunks \u5df2\u6e05\u7406\u3002",
    )


@app.post("/api/faq/upload", response_model=FaqUploadResponse)
async def upload_faq(file: UploadFile = File(...)) -> FaqUploadResponse:
    try:
        filename, saved_as, size_bytes, chunk_count = await save_faq_upload(file)
    except MissingOpenAIKeyError as exc:
        raise HTTPException(
            status_code=500,
            detail="\u540e\u7aef\u672a\u914d\u7f6e OPENAI_API_KEY\uff0c\u65e0\u6cd5\u751f\u6210 FAQ Embedding\u3002",
        ) from exc
    except OpenAIRateLimitError as exc:
        raise HTTPException(
            status_code=429,
            detail="\u5f53\u524d Embedding \u8bf7\u6c42\u8fc7\u591a\u6216\u989d\u5ea6\u53d7\u9650\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002",
        ) from exc
    except OpenAIUpstreamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return FaqUploadResponse(
        filename=filename,
        saved_as=saved_as,
        size_bytes=size_bytes,
        chunk_count=chunk_count,
        message="\u6587\u4ef6\u4e0a\u4f20\u6210\u529f\uff0cFAQ \u5df2\u5207\u5206\u5e76\u5199\u5165 ChromaDB\u3002",
    )


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    try:
        matches = retrieve_faq_context(request.message)
        faq_context = format_faq_context(matches)
        sources = [ChatSource(**source) for source in build_faq_sources(matches)]
        history = get_recent_messages(request.session_id)
        result = generate_customer_service_reply(
            request.message,
            faq_context=faq_context,
            history=history,
        )
        reply = str(result["reply"])
        order = ChatOrder(**result["order"]) if result.get("order") else None
        append_turn(request.session_id, request.message, reply)
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

    return ChatResponse(
        reply=reply,
        session_id=request.session_id,
        sources=sources,
        order=order,
    )
