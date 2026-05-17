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


def build_faq_sources(matches: list[dict[str, object]], preview_length: int = 140) -> list[dict[str, str | int]]:
    sources: list[dict[str, str | int]] = []
    seen: set[tuple[str, int]] = set()

    for match in matches:
        metadata = match.get("metadata") or {}
        if not isinstance(metadata, dict):
            continue

        filename = str(metadata.get("filename") or metadata.get("saved_as") or "FAQ")
        chunk_index = int(metadata.get("chunk_index", 0))
        key = (filename, chunk_index)
        if key in seen:
            continue

        document = str(match.get("document", "")).strip()
        preview = document[:preview_length]
        if len(document) > preview_length:
            preview += "..."

        sources.append(
            {
                "filename": filename,
                "chunk_index": chunk_index,
                "preview": preview,
            }
        )
        seen.add(key)

    return sources
