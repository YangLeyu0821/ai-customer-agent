from app.db.mock_orders import MOCK_ORDERS


def get_order_status(order_id: str) -> dict[str, str | bool]:
    normalized_order_id = order_id.strip()
    order = MOCK_ORDERS.get(normalized_order_id)

    if not order:
        return {
            "found": False,
            "order_id": normalized_order_id,
            "message": "没有找到该订单。请用户确认订单号是否正确，或提供下单手机号后四位。"
        }

    return {
        "found": True,
        **order,
    }
