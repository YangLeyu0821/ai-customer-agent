"use client";

import { FormEvent, useState } from "react";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const copy = {
  title: "\u7535\u5546 AI \u5ba2\u670d Agent",
  subtitle: "\u5f53\u524d\u7248\u672c\u5df2\u63a5\u5165\u540e\u7aef\u56fa\u5b9a\u56de\u590d\u63a5\u53e3\u3002",
  emptyTitle: "\u5f00\u59cb\u4e00\u6bb5\u5ba2\u670d\u5bf9\u8bdd",
  emptyText:
    "\u8f93\u5165\u552e\u540e\u3001\u7269\u6d41\u6216\u8ba2\u5355\u76f8\u5173\u95ee\u9898\uff0c\u524d\u7aef\u4f1a\u8bf7\u6c42\u540e\u7aef\u5e76\u5c55\u793a\u56de\u590d\u3002",
  userLabel: "\u6211",
  assistantLabel: "\u5ba2\u670d",
  inputLabel: "\u8f93\u5165\u6d88\u606f",
  placeholder: "\u8bf7\u8f93\u5165\u4f60\u7684\u95ee\u9898...",
  send: "\u53d1\u9001",
  sending: "\u53d1\u9001\u4e2d...",
  error:
    "\u8bf7\u6c42\u540e\u7aef\u5931\u8d25\uff0c\u8bf7\u786e\u8ba4 FastAPI \u5df2\u5728 localhost:8000 \u542f\u52a8\u3002"
};

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = input.trim();
    if (!content || isSending) {
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setInput("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: content })
      });

      const data = (await response.json()) as { reply?: string; detail?: string };

      if (!response.ok) {
        throw new Error(data.detail || "Chat request failed");
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.reply || ""
        }
      ]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.error);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="chat-page">
      <section className="chat-shell" aria-label="Customer service chat">
        <header className="chat-header">
          <div>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>
        </header>

        <div className="message-list" aria-live="polite">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h2>{copy.emptyTitle}</h2>
              <p>{copy.emptyText}</p>
            </div>
          ) : (
            messages.map((message) => (
              <article
                className={`message ${
                  message.role === "user" ? "message-user" : "message-assistant"
                }`}
                key={message.id}
              >
                <span className="message-label">
                  {message.role === "user" ? copy.userLabel : copy.assistantLabel}
                </span>
                <p>{message.content}</p>
              </article>
            ))
          )}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <input
            aria-label={copy.inputLabel}
            disabled={isSending}
            placeholder={copy.placeholder}
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <button disabled={isSending} type="submit">
            {isSending ? copy.sending : copy.send}
          </button>
        </form>

        {error ? <p className="error-message">{error}</p> : null}
      </section>
    </main>
  );
}
