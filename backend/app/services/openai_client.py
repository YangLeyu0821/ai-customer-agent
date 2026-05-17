import logging
import json

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    OpenAI,
    OpenAIError,
    RateLimitError,
)

from app.core.config import get_settings
from app.services.order_service import get_order_status

logger = logging.getLogger(__name__)

ORDER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_order_status",
            "description": "查询 mock 电商订单的状态、物流状态和预计送达时间。用户询问订单状态、物流进度、预计送达时间时使用。",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "string",
                        "description": "用户提供的订单号，例如 100001。",
                    }
                },
                "required": ["order_id"],
                "additionalProperties": False,
            },
        },
    }
]


class OpenAIServiceError(Exception):
    pass


class MissingOpenAIKeyError(OpenAIServiceError):
    pass


class OpenAIRateLimitError(OpenAIServiceError):
    pass


class OpenAIUpstreamError(OpenAIServiceError):
    pass


def get_openai_runtime_config() -> dict[str, str | bool | float]:
    settings = get_settings()

    return {
        "has_api_key": bool(settings.openai_api_key.strip()),
        "api_key_prefix": settings.openai_api_key.strip()[:6],
        "model": settings.openai_model,
        "embedding_model": settings.openai_embedding_model,
        "base_url": settings.openai_base_url or "https://api.openai.com/v1",
        "timeout_seconds": settings.openai_timeout_seconds,
    }


def build_openai_client() -> OpenAI:
    settings = get_settings()

    client_options = {
        "api_key": settings.openai_api_key,
        "timeout": settings.openai_timeout_seconds,
    }
    if settings.openai_base_url.strip():
        client_options["base_url"] = settings.openai_base_url.strip()

    return OpenAI(**client_options)


def map_openai_exception(exc: Exception) -> OpenAIServiceError | None:
    if isinstance(exc, RateLimitError):
        logger.exception("OpenAI rate limit error")
        return OpenAIRateLimitError("OpenAI rate limit exceeded.")
    if isinstance(exc, APITimeoutError):
        logger.exception("OpenAI timeout error")
        return OpenAIUpstreamError(
            "OpenAI API \u8bf7\u6c42\u8d85\u65f6\uff0c\u8bf7\u68c0\u67e5\u672c\u673a\u7f51\u7edc\u3001\u4ee3\u7406\u3001\u9632\u706b\u5899\uff0c\u6216\u9002\u5f53\u8c03\u5927 OPENAI_TIMEOUT_SECONDS\u3002"
        )
    if isinstance(exc, APIConnectionError):
        logger.exception("OpenAI connection error")
        return OpenAIUpstreamError(
            "\u65e0\u6cd5\u8fde\u63a5 OpenAI API\uff0c\u8bf7\u68c0\u67e5\u672c\u673a\u7f51\u7edc\u3001\u4ee3\u7406\u6216\u9632\u706b\u5899\u8bbe\u7f6e\u3002"
        )
    if isinstance(exc, APIStatusError):
        logger.exception("OpenAI API status error: %s", exc.status_code)
        messages = {
            400: "\u8bf7\u6c42\u53c2\u6570\u6709\u8bef\uff0c\u8bf7\u68c0\u67e5\u6a21\u578b\u540d\u6216 OpenAI SDK \u7248\u672c\u3002",
            401: "API Key \u65e0\u6548\u6216\u672a\u751f\u6548\u3002\u5982\u679c\u4f7f\u7528\u767e\u70bc\uff0c\u8bf7\u786e\u8ba4 OPENAI_API_KEY \u662f\u767e\u70bc\u6709\u6548 Key\uff0c\u4e14 OPENAI_BASE_URL \u5df2\u8bbe\u4e3a https://dashscope.aliyuncs.com/compatible-mode/v1\u3002",
            403: "API Key \u6ca1\u6709\u6743\u9650\u6216\u8d26\u6237\u8ba1\u8d39\u72b6\u6001\u53d7\u9650\u3002\u5982\u679c\u4f7f\u7528\u767e\u70bc\uff0c\u8bf7\u786e\u8ba4\u6a21\u578b\u5df2\u5f00\u901a\u3002",
            404: "\u5f53\u524d\u6a21\u578b\u4e0d\u53ef\u7528\uff0c\u8bf7\u68c0\u67e5 .env \u4e2d\u7684 OPENAI_MODEL \u6216 OPENAI_EMBEDDING_MODEL\u3002",
            429: "OpenAI \u8bf7\u6c42\u8fc7\u591a\u3001\u989d\u5ea6\u4e0d\u8db3\u6216\u8d85\u51fa\u901f\u7387\u9650\u5236\u3002",
        }
        detail = messages.get(
            exc.status_code,
            f"OpenAI API \u8fd4\u56de HTTP {exc.status_code}\uff0c\u8bf7\u67e5\u770b\u540e\u7aef\u7ec8\u7aef\u65e5\u5fd7\u3002",
        )
        return OpenAIUpstreamError(detail)
    if isinstance(exc, OpenAIError):
        logger.exception("OpenAI API request failed")
        return OpenAIUpstreamError(
            "OpenAI API \u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u67e5\u770b\u540e\u7aef\u7ec8\u7aef\u65e5\u5fd7\u3002"
        )

    return None


def generate_customer_service_reply(message: str, faq_context: str = "") -> str:
    if not get_settings().openai_api_key.strip():
        raise MissingOpenAIKeyError("OPENAI_API_KEY is not configured.")

    client = build_openai_client()
    system_prompt = (
        "You are a helpful e-commerce customer service assistant. "
        "Reply in concise, friendly Chinese. "
        "When FAQ context is provided, prioritize it and do not invent policy details. "
        "If the FAQ context is insufficient, say what is missing and answer generally. "
        "When the user asks about an order status, logistics status, or delivery time and provides an order id, "
        "you must call the get_order_status tool before answering."
    )
    if faq_context:
        system_prompt += f"\n\nFAQ context:\n{faq_context}"

    try:
        messages = [
            {
                "role": "system",
                "content": system_prompt,
            },
            {"role": "user", "content": message},
        ]
        response = client.chat.completions.create(
            model=get_settings().openai_model,
            messages=messages,
            tools=ORDER_TOOLS,
            tool_choice="auto",
        )
    except RateLimitError as exc:
        mapped = map_openai_exception(exc)
        raise mapped from exc
    except (APITimeoutError, APIConnectionError, APIStatusError, OpenAIError) as exc:
        mapped = map_openai_exception(exc)
        raise mapped from exc

    assistant_message = response.choices[0].message
    tool_calls = assistant_message.tool_calls or []

    if tool_calls:
        messages.append(assistant_message.model_dump(exclude_none=True))

        for tool_call in tool_calls:
            if tool_call.function.name != "get_order_status":
                continue

            try:
                arguments = json.loads(tool_call.function.arguments or "{}")
            except json.JSONDecodeError:
                arguments = {}

            order_id = str(arguments.get("order_id", "")).strip()
            tool_result = get_order_status(order_id)

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(tool_result, ensure_ascii=False),
                }
            )

        try:
            response = client.chat.completions.create(
                model=get_settings().openai_model,
                messages=messages,
            )
        except RateLimitError as exc:
            mapped = map_openai_exception(exc)
            raise mapped from exc
        except (APITimeoutError, APIConnectionError, APIStatusError, OpenAIError) as exc:
            mapped = map_openai_exception(exc)
            raise mapped from exc

    reply = response.choices[0].message.content
    reply = reply.strip() if reply else ""
    if not reply:
        raise OpenAIUpstreamError("OpenAI returned an empty response.")

    return reply
