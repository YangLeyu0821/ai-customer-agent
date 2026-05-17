from pathlib import Path
from typing import Any

import chromadb

CHROMA_DIR = Path(__file__).resolve().parents[2] / "data" / "chroma"
FAQ_COLLECTION_NAME = "faq_chunks"


def get_faq_collection() -> Any:
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return client.get_or_create_collection(
        name=FAQ_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def upsert_faq_chunks(
    ids: list[str],
    chunks: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict[str, str | int]],
) -> None:
    if not chunks:
        return

    collection = get_faq_collection()
    collection.upsert(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
    )


def get_faq_chunk_count() -> int:
    collection = get_faq_collection()
    return collection.count()


def query_faq_chunks(query_embedding: list[float], top_k: int = 4) -> list[dict[str, Any]]:
    collection = get_faq_collection()
    result = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    documents = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]

    matches: list[dict[str, Any]] = []
    for document, metadata, distance in zip(documents, metadatas, distances):
        matches.append(
            {
                "document": document,
                "metadata": metadata or {},
                "distance": distance,
            }
        )

    return matches
