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

type ChatSession = {
  session_id: string;
  last_message: string;
  updated_at: string;
  message_count: number;
};

type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
  created_at: string;
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
  sessionsTitle: "\u5386\u53f2\u4f1a\u8bdd",
  sessionsEmpty: "\u6682\u65e0\u5386\u53f2\u4f1a\u8bdd",
  loadingSessions: "\u52a0\u8f7d\u4f1a\u8bdd\u4e2d...",
  messagesCount: "\u6761\u6d88\u606f",
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
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    const currentSessionId = getOrCreateSessionId();
    setSessionId(currentSessionId);
    setMessages(loadStoredMessages(currentSessionId));
    void loadSessions();
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

  function buildMessagesFromHistory(historyMessages: HistoryMessage[]) {
    return historyMessages.map((message, index) => ({
      id: buildMessageId(message.created_at, index),
      role: message.role,
      content: message.content
    }));
  }

  function buildMessageId(createdAt: string, index: number) {
    const timestamp = Date.parse(createdAt.replace(" ", "T"));
    return Number.isNaN(timestamp) ? Date.now() + index : timestamp + index;
  }

  async function loadSessions() {
    setIsLoadingSessions(true);

    try {
      const response = await fetch("http://localhost:8000/api/sessions");
      const data = (await parseJsonResponse(response)) as ChatSession[] | { detail?: string };

      if (!response.ok) {
        throw new Error("detail" in data ? data.detail : copy.error);
      }

      setSessions(Array.isArray(data) ? data : []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.error);
    } finally {
      setIsLoadingSessions(false);
    }
  }

  async function handleSelectSession(nextSessionId: string) {
    if (isSending || nextSessionId === sessionId) {
      return;
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, nextSessionId);
    setSessionId(nextSessionId);
    setMessages(loadStoredMessages(nextSessionId));
    setInput("");
    setError("");

    try {
      const response = await fetch(
        `http://localhost:8000/api/sessions/${encodeURIComponent(nextSessionId)}/messages`
      );
      const data = (await parseJsonResponse(response)) as HistoryMessage[] | { detail?: string };

      if (!response.ok) {
        throw new Error("detail" in data ? data.detail : copy.error);
      }

      const historyMessages = Array.isArray(data) ? buildMessagesFromHistory(data) : [];
      setMessages(historyMessages);
      window.localStorage.setItem(
        getMessageStorageKey(nextSessionId),
        JSON.stringify(historyMessages)
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.error);
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
    const assistantMessageId = Date.now() + 1;
    const currentSessionId = sessionId || getOrCreateSessionId();

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        sources: []
      }
    ]);
    setInput("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch("http://localhost:8000/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: content,
          session_id: currentSessionId
        })
      });

      if (!response.ok) {
        const data = (await parseJsonResponse(response)) as { detail?: string };
        throw new Error(data.detail || "Chat request failed");
      }

      await readChatStream(response, assistantMessageId);
    } catch (caughtError) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== assistantMessageId)
      );
      setError(caughtError instanceof Error ? caughtError.message : copy.error);
    } finally {
      setIsSending(false);
      void loadSessions();
    }
  }

  async function readChatStream(response: Response, assistantMessageId: number) {
    if (!response.body) {
      throw new Error(copy.error);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const rawEvent of events) {
        handleStreamEvent(rawEvent, assistantMessageId);
      }
    }

    if (buffer.trim()) {
      handleStreamEvent(buffer, assistantMessageId);
    }
  }

  function handleStreamEvent(rawEvent: string, assistantMessageId: number) {
    const lines = rawEvent.split("\n");
    const eventName = lines
      .find((line) => line.startsWith("event:"))
      ?.replace("event:", "")
      .trim();
    const dataText = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.replace("data:", "").trim())
      .join("");

    if (!eventName || !dataText) {
      return;
    }

    const data = JSON.parse(dataText) as {
      content?: string;
      reply?: string;
      sources?: ChatSource[];
      order?: ChatOrder | null;
      session_id?: string;
      detail?: string;
    };

    if (eventName === "error") {
      throw new Error(data.detail || copy.error);
    }

    if (eventName === "metadata") {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                sources: data.sources || []
              }
            : message
        )
      );
      return;
    }

    if (eventName === "delta") {
      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: `${message.content}${data.content || ""}`
              }
            : message
        )
      );
      return;
    }

    if (eventName === "done") {
      if (data.session_id) {
        setSessionId(data.session_id);
      }

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: data.reply || message.content,
                sources: data.sources || message.sources || [],
                order: data.order || null
              }
            : message
        )
      );
    }
  }

  return (
    <main className="chat-page">
      <section className="chat-workspace" aria-label="Customer service workspace">
        <aside className="session-sidebar" aria-label="Chat sessions">
          <div className="session-sidebar-header">
            <h2>{copy.sessionsTitle}</h2>
            <button disabled={isLoadingSessions} onClick={() => void loadSessions()} type="button">
              {isLoadingSessions ? copy.loadingSessions : "\u5237\u65b0"}
            </button>
          </div>

          {sessions.length === 0 ? (
            <p className="session-empty">{copy.sessionsEmpty}</p>
          ) : (
            <div className="session-list">
              {sessions.map((session) => (
                <button
                  className={`session-item ${
                    session.session_id === sessionId ? "session-item-active" : ""
                  }`}
                  disabled={isSending}
                  key={session.session_id}
                  onClick={() => void handleSelectSession(session.session_id)}
                  type="button"
                >
                  <span>{session.last_message || session.session_id}</span>
                  <small>
                    {session.message_count} {copy.messagesCount} -{" "}
                    {formatSessionTime(session.updated_at)}
                  </small>
                </button>
              ))}
            </div>
          )}
        </aside>

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
                <p>
                  {message.content ||
                    (message.role === "assistant" && isSending ? copy.thinking : "")}
                </p>
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
                          {source.filename} - {copy.chunkLabel} {source.chunk_index + 1}
                        </strong>
                        <p>{source.preview}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </article>
              ))}
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
      </section>
    </main>
  );
}

function formatSessionTime(value: string) {
  const normalizedValue = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

async function parseJsonResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
