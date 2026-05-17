import re
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from app.rag.document_loader import decode_document, split_text
from app.rag.embeddings import create_embeddings
from app.rag.vector_store import delete_faq_chunks_by_file, upsert_faq_chunks

FAQ_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "data" / "faq_uploads"
ALLOWED_EXTENSIONS = {".txt", ".md"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024


def sanitize_filename(filename: str) -> str:
    name = Path(filename).name.strip()
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", name)
    return safe_name or "faq.txt"


def list_faq_files() -> list[dict[str, str | int]]:
    if not FAQ_UPLOAD_DIR.exists():
        return []

    files: list[dict[str, str | int]] = []
    for path in FAQ_UPLOAD_DIR.iterdir():
        if not path.is_file() or path.suffix.lower() not in ALLOWED_EXTENSIONS:
            continue

        stat = path.stat()
        uploaded_at = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
        files.append(
            {
                "filename": path.name,
                "size_bytes": stat.st_size,
                "uploaded_at": uploaded_at,
            }
        )

    return sorted(files, key=lambda item: str(item["uploaded_at"]), reverse=True)


def resolve_uploaded_faq_path(filename: str) -> Path:
    safe_filename = Path(filename).name
    target_path = (FAQ_UPLOAD_DIR / safe_filename).resolve()
    upload_dir = FAQ_UPLOAD_DIR.resolve()

    if upload_dir not in target_path.parents or target_path.name != filename:
        raise HTTPException(status_code=400, detail="\u6587\u4ef6\u540d\u4e0d\u5408\u6cd5\u3002")

    if target_path.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="\u53ea\u80fd\u5220\u9664 .txt \u6216 .md \u6587\u4ef6\u3002")

    return target_path


def delete_faq_file(filename: str) -> str:
    target_path = resolve_uploaded_faq_path(filename)

    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=404, detail="\u6587\u4ef6\u4e0d\u5b58\u5728\u3002")

    target_path.unlink()
    delete_faq_chunks_by_file(filename)

    return filename


async def save_faq_upload(file: UploadFile) -> tuple[str, str, int, int]:
    original_filename = file.filename or ""
    safe_filename = sanitize_filename(original_filename)
    extension = Path(safe_filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="\u53ea\u652f\u6301\u4e0a\u4f20 .txt \u6216 .md \u6587\u4ef6\u3002")

    content = await file.read()
    size_bytes = len(content)

    if size_bytes == 0:
        raise HTTPException(status_code=400, detail="\u4e0a\u4f20\u6587\u4ef6\u4e0d\u80fd\u4e3a\u7a7a\u3002")

    if size_bytes > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="\u6587\u4ef6\u5927\u5c0f\u4e0d\u80fd\u8d85\u8fc7 5MB\u3002")

    FAQ_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    saved_as = f"{uuid4().hex}_{safe_filename}"
    target_path = FAQ_UPLOAD_DIR / saved_as
    target_path.write_bytes(content)

    text = decode_document(content)
    chunks = split_text(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="\u6587\u4ef6\u6ca1\u6709\u53ef\u7528\u7684\u6587\u672c\u5185\u5bb9\u3002")

    embeddings = create_embeddings(chunks)
    chunk_ids = [f"{Path(saved_as).stem}_{index}" for index in range(len(chunks))]
    metadatas = [
        {
            "filename": original_filename,
            "saved_as": saved_as,
            "chunk_index": index,
        }
        for index in range(len(chunks))
    ]
    upsert_faq_chunks(chunk_ids, chunks, embeddings, metadatas)

    return original_filename, saved_as, size_bytes, len(chunks)
