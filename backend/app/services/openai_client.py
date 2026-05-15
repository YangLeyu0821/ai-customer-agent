import logging

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    OpenAI,
    OpenAIError,
    RateLimitError,
)

from app.core.config import get_settings

logger = logging.getLogger(__name__)


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
        "base_url": settings.openai_base_url or "https://api.openai.com/v1",
        "timeout_seconds": settings.openai_timeout_seconds,
    }


def generate_customer_service_reply(message: str) -> str:
    settings = get_settings()

    if not settings.openai_api_key.strip():
        raise MissingOpenAIKeyError("OPENAI_API_KEY is not configured.")

    client_options = {
        "api_key": settings.openai_api_key,
        "timeout": settings.openai_timeout_seconds,
    }
    if settings.openai_base_url.strip():
        client_options["base_url"] = settings.openai_base_url.strip()

    client = OpenAI(**client_options)

    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful e-commerce customer service assistant. "
                        "Reply in concise, friendly Chinese. "
                        "If order data or FAQ knowledge is needed, say that the feature will be connected later."
                    ),
                },
                {"role": "user", "content": message},
            ],
        )
    except RateLimitError as exc:
        logger.exception("OpenAI rate limit error")
        raise OpenAIRateLimitError("OpenAI rate limit exceeded.") from exc
    except APITimeoutError as exc:
        logger.exception("OpenAI timeout error")
        raise OpenAIUpstreamError(
            "OpenAI API \u8bf7\u6c42\u8d85\u65f6\uff0c\u8bf7\u68c0\u67e5\u672c\u673a\u7f51\u7edc\u3001\u4ee3\u7406\u3001\u9632\u706b\u5899\uff0c\u6216\u9002\u5f53\u8c03\u5927 OPENAI_TIMEOUT_SECONDS\u3002"
        ) from exc
    except APIConnectionError as exc:
        logger.exception("OpenAI connection error")
        raise OpenAIUpstreamError(
            "\u65e0\u6cd5\u8fde\u63a5 OpenAI API\uff0c\u8bf7\u68c0\u67e5\u672c\u673a\u7f51\u7edc\u3001\u4ee3\u7406\u6216\u9632\u706b\u5899\u8bbe\u7f6e\u3002"
        ) from exc
    except APIStatusError as exc:
        logger.exception("OpenAI API status error: %s", exc.status_code)
        messages = {
            400: "\u8bf7\u6c42\u53c2\u6570\u6709\u8bef\uff0c\u8bf7\u68c0\u67e5\u6a21\u578b\u540d\u6216 OpenAI SDK \u7248\u672c\u3002",
            401: "API Key \u65e0\u6548\u6216\u672a\u751f\u6548\u3002\u5982\u679c\u4f7f\u7528\u767e\u70bc\uff0c\u8bf7\u786e\u8ba4 OPENAI_API_KEY \u662f\u767e\u70bc\u6709\u6548 Key\uff0c\u4e14 OPENAI_BASE_URL \u5df2\u8bbe\u4e3a https://dashscope.aliyuncs.com/compatible-mode/v1\u3002",
            403: "API Key \u6ca1\u6709\u6743\u9650\u6216\u8d26\u6237\u8ba1\u8d39\u72b6\u6001\u53d7\u9650\u3002\u5982\u679c\u4f7f\u7528\u767e\u70bc\uff0c\u8bf7\u786e\u8ba4\u6a21\u578b\u5df2\u5f00\u901a\u3002",
            404: "\u5f53\u524d\u6a21\u578b\u4e0d\u53ef\u7528\uff0c\u8bf7\u68c0\u67e5 .env \u4e2d\u7684 OPENAI_MODEL\u3002",
            429: "OpenAI \u8bf7\u6c42\u8fc7\u591a\u3001\u989d\u5ea6\u4e0d\u8db3\u6216\u8d85\u51fa\u901f\u7387\u9650\u5236\u3002",
        }
        detail = messages.get(
            exc.status_code,
            f"OpenAI API \u8fd4\u56de HTTP {exc.status_code}\uff0c\u8bf7\u67e5\u770b\u540e\u7aef\u7ec8\u7aef\u65e5\u5fd7\u3002",
        )
        raise OpenAIUpstreamError(detail) from exc
    except OpenAIError as exc:
        logger.exception("OpenAI API request failed")
        raise OpenAIUpstreamError(
            "OpenAI API \u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u67e5\u770b\u540e\u7aef\u7ec8\u7aef\u65e5\u5fd7\u3002"
        ) from exc

    reply = response.choices[0].message.content
    reply = reply.strip() if reply else ""
    if not reply:
        raise OpenAIUpstreamError("OpenAI returned an empty response.")

    return reply
