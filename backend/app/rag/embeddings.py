from app.core.config import get_settings
from app.services.openai_client import (
    MissingOpenAIKeyError,
    OpenAIRateLimitError,
    OpenAIUpstreamError,
    build_openai_client,
    map_openai_exception,
)

EMBEDDING_BATCH_SIZE = 10


def create_embeddings(texts: list[str]) -> list[list[float]]:
    settings = get_settings()

    if not settings.openai_api_key.strip():
        raise MissingOpenAIKeyError("OPENAI_API_KEY is not configured.")

    client = build_openai_client()
    embeddings: list[list[float]] = []

    for start in range(0, len(texts), EMBEDDING_BATCH_SIZE):
        batch = texts[start : start + EMBEDDING_BATCH_SIZE]
        try:
            response = client.embeddings.create(
                model=settings.openai_embedding_model,
                input=batch,
            )
        except Exception as exc:
            mapped = map_openai_exception(exc)
            if mapped:
                raise mapped from exc
            raise OpenAIUpstreamError("OpenAI embedding request failed.") from exc

        embeddings.extend(item.embedding for item in response.data)

    return embeddings
