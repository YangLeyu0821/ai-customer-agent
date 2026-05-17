from app.rag.embeddings import create_embeddings
from app.rag.vector_store import get_faq_chunk_count, query_faq_chunks


def retrieve_faq_context(question: str, top_k: int = 4) -> list[dict[str, object]]:
    if get_faq_chunk_count() == 0:
        return []

    query_embedding = create_embeddings([question])[0]
    matches = query_faq_chunks(query_embedding=query_embedding, top_k=top_k)

    return [match for match in matches if match.get("document")]


def format_faq_context(matches: list[dict[str, object]]) -> str:
    if not matches:
        return ""

    parts: list[str] = []
    for index, match in enumerate(matches, start=1):
        metadata = match.get("metadata") or {}
        source = metadata.get("filename", "FAQ") if isinstance(metadata, dict) else "FAQ"
        document = str(match.get("document", "")).strip()
        if document:
            parts.append(f"[FAQ {index} | {source}]\n{document}")

    return "\n\n".join(parts)
