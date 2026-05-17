"use client";

import { FormEvent, useEffect, useState } from "react";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  order?: ChatOrder | null;
};

type ChatSource = {
  filename: string;
  chunk_index: number;
  preview: string;
};

type ChatOrder = {
  order_id: string;
  status: string;
  logistics_status: string;
  estimated_delivery: string;
  carrier: string;
  tracking_number: string;
  product_name: string;
};

const SESSION_STORAGE_KEY = "ai-customer-agent-session-id";
const MESSAGE_STORAGE_PREFIX = "ai-customer-agent-messages:";

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
  thinking: "AI \u6b63\u5728\u56de\u590d...",
  newSession: "\u65b0\u5efa\u4f1a\u8bdd",
  sourcesTitle: "\u53c2\u8003\u6765\u6e90",
  chunkLabel: "\u7247\u6bb5",
  orderTitle: "\u8ba2\u5355\u4fe1\u606f",
  orderId: "\u8ba2\u5355\u53f7",
  orderStatus: "\u8ba2\u5355\u72b6\u6001",
  logisticsStatus: "\u7269\u6d41\u72b6\u6001",
  estimatedDelivery: "\u9884\u8ba1\u9001\u8fbe",
  carrier: "\u5feb\u9012\u516c\u53f8",
  trackingNumber: "\u8fd0\u5355\u53f7",
  productName: "\u5546\u54c1",
  error:
    "\u8bf7\u6c42\u540e\u7aef\u5931\u8d25\uff0c\u8bf7\u786e\u8ba4 FastAPI \u5df2\u5728 localhost:8000 \u542f\u52a8\u3002"
};

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    const currentSessionId = getOrCreateSessionId();
    setSessionId(currentSessionId);
    setMessages(loadStoredMessages(currentSessionId));
  }, []);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    window.localStorage.setItem(getMessageStorageKey(sessionId), JSON.stringify(messages));
  }, [messages, sessionId]);

  function getOrCreateSessionId() {
    const existingSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existingSessionId) {
      return existingSessionId;
    }

    const newSessionId = window.crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
    return newSessionId;
  }

  function getMessageStorageKey(value: string) {
    return `${MESSAGE_STORAGE_PREFIX}${value}`;
  }

  function loadStoredMessages(value: string) {
    const storedMessages = window.localStorage.getItem(getMessageStorageKey(value));
    if (!storedMessages) {
      return [];
    }

    try {
      const parsedMessages = JSON.parse(storedMessages) as Message[];
      return Array.isArray(parsedMessages) ? parsedMessages : [];
    } catch {
      return [];
    }
  }

  function handleNewSession() {
    const newSessionId = window.crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
    setSessionId(newSessionId);
    setMessages([]);
    setInput("");
    setError("");
  }

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
        body: JSON.stringify({
          message: content,
          session_id: sessionId || getOrCreateSessionId()
        })
      });

      const data = (await parseJsonResponse(response)) as {
        reply?: string;
        session_id?: string;
        sources?: ChatSource[];
        order?: ChatOrder | null;
        detail?: string;
      };

      if (!response.ok) {
        throw new Error(data.detail || "Chat request failed");
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.reply || "",
          sources: data.sources || [],
          order: data.order || null
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
          <button className="new-session-button" onClick={handleNewSession} type="button">
            {copy.newSession}
          </button>
        </header>

        <div className="message-list" aria-live="polite">
          {messages.length === 0 && !isSending ? (
            <div className="empty-state">
              <h2>{copy.emptyTitle}</h2>
              <p>{copy.emptyText}</p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
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
                {message.role === "assistant" && message.order ? (
                  <section className="order-card" aria-label="Order details">
                    <div className="order-card-header">
                      <span>{copy.orderTitle}</span>
                      <strong>{message.order.status}</strong>
                    </div>
                    <dl>
                      <div>
                        <dt>{copy.orderId}</dt>
                        <dd>{message.order.order_id}</dd>
                      </div>
                      <div>
                        <dt>{copy.productName}</dt>
                        <dd>{message.order.product_name}</dd>
                      </div>
                      <div>
                        <dt>{copy.logisticsStatus}</dt>
                        <dd>{message.order.logistics_status}</dd>
                      </div>
                      <div>
                        <dt>{copy.estimatedDelivery}</dt>
                        <dd>{message.order.estimated_delivery}</dd>
                      </div>
                      <div>
                        <dt>{copy.carrier}</dt>
                        <dd>{message.order.carrier}</dd>
                      </div>
                      <div>
                        <dt>{copy.trackingNumber}</dt>
                        <dd>{message.order.tracking_number}</dd>
                      </div>
                    </dl>
                  </section>
                ) : null}
                {message.role === "assistant" && message.sources?.length ? (
                  <div className="message-sources">
                    <span>{copy.sourcesTitle}</span>
                    {message.sources.map((source) => (
                      <article
                        className="message-source"
                        key={`${source.filename}-${source.chunk_index}`}
                      >
                        <strong>
                          {source.filename} · {copy.chunkLabel} {source.chunk_index + 1}
                        </strong>
                        <p>{source.preview}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </article>
              ))}
              {isSending ? (
                <article className="message message-assistant message-loading">
                  <span className="message-label">{copy.assistantLabel}</span>
                  <p>{copy.thinking}</p>
                </article>
              ) : null}
            </>
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

async function parseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
