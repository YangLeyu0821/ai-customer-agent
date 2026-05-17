"use client";

import { ChangeEvent, FormEvent, useState } from "react";

type UploadResult = {
  filename: string;
  saved_as: string;
  size_bytes: number;
  chunk_count: number;
  message: string;
};

const copy = {
  title: "\u77e5\u8bc6\u5e93\u7ba1\u7406",
  subtitle: "\u4e0a\u4f20 FAQ \u6587\u6863\uff0c\u540e\u7aef\u4f1a\u81ea\u52a8\u5207\u5206\u3001\u751f\u6210 Embedding \u5e76\u5199\u5165 ChromaDB\u3002",
  uploadTitle: "FAQ \u6587\u6863\u4e0a\u4f20",
  uploadHint: "\u652f\u6301 .txt \u548c .md \u6587\u4ef6\uff0c\u5355\u4e2a\u6587\u4ef6\u4e0d\u8d85\u8fc7 5MB\u3002",
  chooseFile: "\u9009\u62e9\u6587\u4ef6",
  upload: "\u4e0a\u4f20",
  uploading: "\u4e0a\u4f20\u4e2d...",
  noFile: "\u8bf7\u5148\u9009\u62e9\u4e00\u4e2a .txt \u6216 .md \u6587\u4ef6\u3002",
  invalidFile: "\u53ea\u652f\u6301\u4e0a\u4f20 .txt \u6216 .md \u6587\u4ef6\u3002",
  requestError: "\u4e0a\u4f20\u5931\u8d25\uff0c\u8bf7\u786e\u8ba4 FastAPI \u5df2\u5728 localhost:8000 \u542f\u52a8\u3002",
  savedAs: "\u4fdd\u5b58\u6587\u4ef6\u540d",
  size: "\u6587\u4ef6\u5927\u5c0f",
  chunks: "\u5207\u5206\u7247\u6bb5"
};

export default function AdminPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setError("");
    setResult(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError(copy.noFile);
      return;
    }

    const lowerName = selectedFile.name.toLowerCase();
    if (!lowerName.endsWith(".txt") && !lowerName.endsWith(".md")) {
      setError(copy.invalidFile);
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsUploading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/faq/upload", {
        method: "POST",
        body: formData
      });

      const data = (await response.json()) as UploadResult & { detail?: string };

      if (!response.ok) {
        throw new Error(data.detail || copy.requestError);
      }

      setResult(data);
      setSelectedFile(null);
      event.currentTarget.reset();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.requestError);
    } finally {
      setIsUploading(false);
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
              accept=".txt,.md,text/plain,text/markdown"
              disabled={isUploading}
              onChange={handleFileChange}
              type="file"
            />
          </label>

          {selectedFile ? <p className="selected-file">{selectedFile.name}</p> : null}

          <button className="upload-button" disabled={isUploading} type="submit">
            {isUploading ? copy.uploading : copy.upload}
          </button>
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
      </section>
    </main>
  );
}
