"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

type UploadResult = {
  filename: string;
  saved_as: string;
  size_bytes: number;
  chunk_count: number;
  message: string;
};

type FaqFile = {
  filename: string;
  size_bytes: number;
  uploaded_at: string;
};

type ReindexResult = {
  file_count: number;
  chunk_count: number;
  message: string;
};

const copy = {
  title: "\u77e5\u8bc6\u5e93\u7ba1\u7406",
  subtitle: "\u4e0a\u4f20 FAQ \u6587\u6863\uff0c\u540e\u7aef\u4f1a\u81ea\u52a8\u5207\u5206\u3001\u751f\u6210 Embedding \u5e76\u5199\u5165 ChromaDB\u3002",
  uploadTitle: "FAQ \u6587\u6863\u4e0a\u4f20",
  uploadHint: "\u652f\u6301 .txt\u3001.md\u3001.pdf \u548c .docx \u6587\u4ef6\uff0c\u5355\u4e2a\u6587\u4ef6\u4e0d\u8d85\u8fc7 10MB\u3002",
  chooseFile: "\u9009\u62e9\u6587\u4ef6",
  upload: "\u4e0a\u4f20",
  uploading: "\u4e0a\u4f20\u548c\u5411\u91cf\u5316\u4e2d...",
  noFile: "\u8bf7\u5148\u9009\u62e9\u4e00\u4e2a .txt\u3001.md\u3001.pdf \u6216 .docx \u6587\u4ef6\u3002",
  invalidFile: "\u53ea\u652f\u6301\u4e0a\u4f20 .txt\u3001.md\u3001.pdf \u6216 .docx \u6587\u4ef6\u3002",
  requestError: "\u4e0a\u4f20\u5931\u8d25\uff0c\u8bf7\u786e\u8ba4 FastAPI \u5df2\u5728 localhost:8000 \u542f\u52a8\u3002",
  savedAs: "\u4fdd\u5b58\u6587\u4ef6\u540d",
  size: "\u6587\u4ef6\u5927\u5c0f",
  chunks: "\u5207\u5206\u7247\u6bb5",
  fileListTitle: "FAQ \u6587\u4ef6\u5217\u8868",
  fileListEmpty: "\u77e5\u8bc6\u5e93\u8fd8\u662f\u7a7a\u7684\uff0c\u8bf7\u5148\u4e0a\u4f20 FAQ \u6587\u4ef6\u3002",
  refresh: "\u5237\u65b0",
  uploadedAt: "\u4e0a\u4f20\u65f6\u95f4",
  delete: "\u5220\u9664",
  deleteConfirm: "\u786e\u5b9a\u8981\u5220\u9664\u8fd9\u4e2a FAQ \u6587\u4ef6\u5417\uff1f\u5bf9\u5e94\u7684 ChromaDB chunks \u4e5f\u4f1a\u88ab\u5220\u9664\u3002",
  uploadStatus: "\u6b63\u5728\u4e0a\u4f20\u6587\u4ef6\u3001\u5207\u5206\u6587\u672c\u3001\u751f\u6210 Embedding \u5e76\u5199\u5165 ChromaDB...",
  reindex: "\u91cd\u5efa\u7d22\u5f15",
  reindexing: "\u91cd\u5efa\u4e2d...",
  reindexConfirm: "\u786e\u5b9a\u8981\u6e05\u7a7a\u5e76\u91cd\u5efa FAQ \u7d22\u5f15\u5417\uff1f\u8fd9\u4f1a\u91cd\u65b0\u5904\u7406\u6240\u6709\u5df2\u4e0a\u4f20\u7684 FAQ \u6587\u4ef6\u3002",
  reindexStatus: "\u6b63\u5728\u91cd\u5efa FAQ \u7d22\u5f15\uff0c\u8bf7\u7a0d\u5019...",
  filesProcessed: "\u5904\u7406\u6587\u4ef6",
  chunksIndexed: "\u5199\u5165\u7247\u6bb5"
};

export default function AdminPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [deletingFilename, setDeletingFilename] = useState("");
  const [isReindexing, setIsReindexing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [reindexResult, setReindexResult] = useState<ReindexResult | null>(null);
  const [files, setFiles] = useState<FaqFile[]>([]);

  useEffect(() => {
    void loadFiles();
  }, []);

  async function loadFiles() {
    setIsLoadingFiles(true);
    try {
      const response = await fetch("http://localhost:8000/api/faq/files");
      const data = (await parseJsonResponse(response)) as FaqFile[] | { detail?: string };

      if (!response.ok) {
        throw new Error("detail" in data ? data.detail : copy.requestError);
      }

      setFiles(Array.isArray(data) ? data : []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.requestError);
    } finally {
      setIsLoadingFiles(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setError("");
    setResult(null);
    setReindexResult(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError(copy.noFile);
      return;
    }

    const lowerName = selectedFile.name.toLowerCase();
    const allowedExtensions = [".txt", ".md", ".pdf", ".docx"];
    if (!allowedExtensions.some((extension) => lowerName.endsWith(extension))) {
      setError(copy.invalidFile);
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsUploading(true);
    setError("");
    setResult(null);
    setReindexResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/faq/upload", {
        method: "POST",
        body: formData
      });

      const data = (await parseJsonResponse(response)) as UploadResult & { detail?: string };

      if (!response.ok) {
        throw new Error(data.detail || copy.requestError);
      }

      setResult(data);
      setSelectedFile(null);
      event.currentTarget.reset();
      await loadFiles();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.requestError);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(filename: string) {
    if (!window.confirm(copy.deleteConfirm)) {
      return;
    }

    setDeletingFilename(filename);
    setError("");
    setResult(null);
    setReindexResult(null);

    try {
      const response = await fetch(
        `http://localhost:8000/api/faq/files/${encodeURIComponent(filename)}`,
        {
          method: "DELETE"
        }
      );
      const data = (await parseJsonResponse(response)) as { detail?: string };

      if (!response.ok) {
        throw new Error(data.detail || copy.requestError);
      }

      await loadFiles();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.requestError);
    } finally {
      setDeletingFilename("");
    }
  }

  async function handleReindex() {
    if (!window.confirm(copy.reindexConfirm)) {
      return;
    }

    setIsReindexing(true);
    setError("");
    setResult(null);
    setReindexResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/faq/reindex", {
        method: "POST"
      });
      const data = (await parseJsonResponse(response)) as ReindexResult & { detail?: string };

      if (!response.ok) {
        throw new Error(data.detail || copy.requestError);
      }

      setReindexResult(data);
      await loadFiles();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.requestError);
    } finally {
      setIsReindexing(false);
    }
  }

  return (
    <main className="admin-page">
      <section className="admin-shell" aria-label="FAQ admin upload">
        <header className="admin-header">
          <div>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>
        </header>

        <form className="upload-panel" onSubmit={handleSubmit}>
          <div className="upload-copy">
            <h2>{copy.uploadTitle}</h2>
            <p>{copy.uploadHint}</p>
          </div>

          <label className="file-picker">
            <span>{copy.chooseFile}</span>
            <input
              accept=".txt,.md,.pdf,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={isUploading}
              onChange={handleFileChange}
              type="file"
            />
          </label>

          {selectedFile ? <p className="selected-file">{selectedFile.name}</p> : null}

          <button className="upload-button" disabled={isUploading} type="submit">
            {isUploading ? copy.uploading : copy.upload}
          </button>
          {isUploading ? <p className="upload-status">{copy.uploadStatus}</p> : null}
        </form>

        {error ? <p className="error-message admin-message">{error}</p> : null}

        {result ? (
          <section className="upload-result" aria-label="Upload result">
            <p>{result.message}</p>
            <dl>
              <div>
                <dt>{copy.savedAs}</dt>
                <dd>{result.saved_as}</dd>
              </div>
              <div>
                <dt>{copy.size}</dt>
                <dd>{result.size_bytes} bytes</dd>
              </div>
              <div>
                <dt>{copy.chunks}</dt>
                <dd>{result.chunk_count}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        <section className="faq-files-panel" aria-label="FAQ files">
          <div className="faq-files-header">
            <h2>{copy.fileListTitle}</h2>
            <div className="faq-files-header-actions">
              <button
                disabled={isLoadingFiles || isReindexing}
                onClick={() => void loadFiles()}
                type="button"
              >
                {copy.refresh}
              </button>
              <button
                disabled={isReindexing}
                onClick={() => void handleReindex()}
                type="button"
              >
                {isReindexing ? copy.reindexing : copy.reindex}
              </button>
            </div>
          </div>

          {isReindexing ? <p className="upload-status">{copy.reindexStatus}</p> : null}

          {reindexResult ? (
            <section className="upload-result faq-reindex-result" aria-label="Reindex result">
              <p>{reindexResult.message}</p>
              <dl>
                <div>
                  <dt>{copy.filesProcessed}</dt>
                  <dd>{reindexResult.file_count}</dd>
                </div>
                <div>
                  <dt>{copy.chunksIndexed}</dt>
                  <dd>{reindexResult.chunk_count}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          {files.length === 0 ? (
            <p className="faq-files-empty">{copy.fileListEmpty}</p>
          ) : (
            <div className="faq-files-table">
              {files.map((file) => (
                <article className="faq-file-row" key={file.filename}>
                  <div>
                    <strong>{file.filename}</strong>
                    <span>{formatDate(file.uploaded_at)}</span>
                  </div>
                  <div className="faq-file-actions">
                    <span>{formatSize(file.size_bytes)}</span>
                    <button
                      disabled={deletingFilename === file.filename}
                      onClick={() => void handleDelete(file.filename)}
                      type="button"
                    >
                      {copy.delete}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function formatSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

async function parseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
