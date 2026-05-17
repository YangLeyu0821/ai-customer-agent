# 电商 AI 客服 Agent

一个面向电商场景的 AI 客服 Agent 项目。前端提供聊天界面和 FAQ 管理后台，后端负责大模型调用、FAQ RAG 检索、订单 Tool Calling、多轮对话 memory 和知识库文件管理。

## 技术栈

- Frontend: Next.js + TypeScript
- Backend: FastAPI + Python
- LLM: OpenAI-compatible Chat Completions API
- Embeddings: OpenAI-compatible Embeddings API
- Vector DB: ChromaDB
- Memory: SQLite
- Mock Data: 本地 mock 订单数据

当前项目已适配阿里云百炼 / DashScope OpenAI 兼容模式，也可以替换为 OpenAI 官方 API 或其他兼容网关。

## 核心功能

- 聊天 UI
- Admin FAQ 文档上传
- FAQ 文档列表与删除
- FAQ 文档切分、Embedding、写入 ChromaDB
- 聊天时先检索 FAQ，并展示参考来源
- 订单查询 Tool Calling
- mock 订单数据查询
- 订单结果结构化卡片展示
- 基于 session_id 的多轮对话 memory
- 前端聊天记录 localStorage 持久化
- 后端会话 memory SQLite 持久化

## 目录结构

```text
ai-customer-agent/
├─ frontend/
│  ├─ app/
│  │  ├─ page.tsx              # 聊天页面
│  │  ├─ admin/page.tsx        # FAQ 管理页面
│  │  ├─ layout.tsx
│  │  └─ globals.css
│  ├─ package.json
│  └─ tsconfig.json
│
├─ backend/
│  ├─ app/
│  │  ├─ main.py               # FastAPI 入口与 API 路由
│  │  ├─ core/config.py        # .env 配置读取
│  │  ├─ db/mock_orders.py     # mock 订单数据
│  │  ├─ models/
│  │  │  ├─ chat.py
│  │  │  └─ faq.py
│  │  ├─ rag/
│  │  │  ├─ document_loader.py # FAQ 解析与切分
│  │  │  ├─ embeddings.py      # Embedding 调用
│  │  │  ├─ retriever.py       # FAQ 检索与来源构造
│  │  │  └─ vector_store.py    # ChromaDB 操作
│  │  └─ services/
│  │     ├─ faq_service.py
│  │     ├─ memory_service.py  # SQLite memory
│  │     ├─ openai_client.py   # LLM + Tool Calling
│  │     └─ order_service.py
│  ├─ data/
│  │  ├─ faq_uploads/          # 上传的 FAQ 文件
│  │  ├─ chroma/               # ChromaDB 持久化数据
│  │  └─ app.db                # SQLite 会话数据库
│  ├─ requirements.txt
│  └─ .env.example
│
├─ README.md
└─ .gitignore
```

## 环境变量

在 `backend` 目录下新建 `.env`。

阿里云百炼 / DashScope 示例：

```env
APP_NAME="AI Customer Agent API"
ENVIRONMENT="development"
OPENAI_API_KEY="你的百炼 API Key"
OPENAI_MODEL="qwen-plus"
OPENAI_EMBEDDING_MODEL="text-embedding-v4"
OPENAI_TIMEOUT_SECONDS=60
OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
```

OpenAI 官方 API 示例：

```env
APP_NAME="AI Customer Agent API"
ENVIRONMENT="development"
OPENAI_API_KEY="你的 OpenAI API Key"
OPENAI_MODEL="gpt-4.1-mini"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
OPENAI_TIMEOUT_SECONDS=60
```

## 本地启动

### 后端

```bash
cd /d/ai-customer-agent/backend
python -m venv .venv
source .venv/Scripts/activate
pip install --upgrade pip
pip install -r requirements.txt
uvicorn app.main:app --reload
```

健康检查：

```bash
curl http://localhost:8000/health
```

预期返回：

```json
{"status":"ok"}
```

### 前端

```bash
cd /d/ai-customer-agent/frontend
npm install
npm run dev
```

访问：

```text
http://localhost:3000
```

Admin 页面：

```text
http://localhost:3000/admin
```

## 测试 FAQ RAG

1. 启动后端和前端。
2. 打开 Admin 页面：

```text
http://localhost:3000/admin
```

3. 上传 `.txt` 或 `.md` FAQ 文件。
4. 上传成功后，后端会自动：

```text
保存原始文件
切分文本
生成 Embedding
写入 ChromaDB
刷新 FAQ 文件列表
```

5. 回到聊天页面：

```text
http://localhost:3000
```

6. 提问 FAQ 中包含的问题，例如：

```text
退货流程是什么？
发票怎么开？
超过 7 天还能换货吗？
```

如果命中 FAQ，AI 回复下方会展示“参考来源”，包括文件名、chunk 序号和片段预览。

也可以直接查看 FAQ 文件列表：

```bash
curl http://localhost:8000/api/faq/files
```

## 测试订单 Tool Calling

聊天页面输入：

```text
帮我查一下订单 100001 到哪了
```

模型会自动调用 `get_order_status` 工具，后端查询 mock 订单数据，然后返回自然语言回复和结构化订单卡片。

可以继续追问：

```text
那什么时候到？
```

后端会基于 `session_id` 从 SQLite 读取最近对话上下文，支持多轮追问。

## Mock 订单号

```text
100001
- 状态：已发货
- 物流：包裹已到达上海转运中心
- 预计送达：2026-05-19
- 快递：顺丰速运
- 商品：无线蓝牙耳机

100002
- 状态：待发货
- 物流：仓库正在拣货打包
- 预计送达：2026-05-21
- 快递：暂未揽收
- 商品：智能保温杯

100003
- 状态：已签收
- 物流：用户本人已签收
- 预计送达：已于 2026-05-14 送达
- 快递：中通快递
- 商品：家用空气炸锅
```

## 常用接口

```text
GET    /health
GET    /debug/openai-config
POST   /api/chat
GET    /api/faq/files
POST   /api/faq/upload
DELETE /api/faq/files/{filename}
```

## 当前限制

- Admin 没有登录鉴权。
- FAQ 只支持 `.txt` 和 `.md`。
- 订单数据是 mock 数据，没有接真实电商系统。
- ChromaDB、SQLite 和上传文件都使用本地持久化。
- 后端 memory 已持久化到 SQLite，但没有会话列表 API。
- Tool Calling 当前只有订单查询一个工具。
- 没有完整自动化测试。

## 后续规划

- Admin 登录鉴权
- FAQ 重建索引
- 支持 PDF / DOCX 文档解析
- 接入真实订单系统
- 人工客服接管
- 会话列表与客服工作台
- Docker Compose 一键启动
- 单元测试与接口测试
- 部署到云服务器并提供在线演示

## 演示数据

项目提供了一个示例 FAQ 文件：

```text
backend/data/examples/sample_faq.md
```

该文件包含退货、换货、物流、发票、售后联系方式等 FAQ 内容。它不会自动写入 ChromaDB，需要通过 Admin 页面手动上传。

测试步骤：

1. 启动后端和前端。
2. 打开 Admin 页面：

```text
http://localhost:3000/admin
```

3. 上传：

```text
backend/data/examples/sample_faq.md
```

4. 上传成功后，回到聊天页面：

```text
http://localhost:3000
```

5. 可以测试这些 FAQ RAG 问题：

```text
退货运费由谁承担？
换货需要重新下单吗？
订单多久发货？
电子发票多久开具？
售后服务时间是什么？
```

Mock 订单测试问题：

```text
帮我查一下订单 100001 到哪了
订单 100002 什么时候送到？
订单 100003 是什么状态？
```

也可以测试多轮追问：

```text
帮我查一下订单 100001 到哪了
那什么时候到？
```
