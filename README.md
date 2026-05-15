# AI Customer Agent

电商 AI 客服 Agent 项目骨架。

## 技术栈

- Frontend: Next.js + TypeScript
- Backend: FastAPI
- AI: OpenAI API
- Vector DB: ChromaDB

## 本地启动

### Frontend

```bash
cd frontend
npm install
npm run dev
```

默认访问 `http://localhost:3000`。

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

默认访问 `http://localhost:8000`，健康检查为 `http://localhost:8000/health`。
