MOCK_ORDERS: dict[str, dict[str, str]] = {
    "100001": {
        "order_id": "100001",
        "status": "已发货",
        "logistics_status": "包裹已到达上海转运中心",
        "estimated_delivery": "2026-05-19",
        "carrier": "顺丰速运",
        "tracking_number": "SF1000018888",
        "product_name": "无线蓝牙耳机",
    },
    "100002": {
        "order_id": "100002",
        "status": "待发货",
        "logistics_status": "仓库正在拣货打包",
        "estimated_delivery": "2026-05-21",
        "carrier": "暂未揽收",
        "tracking_number": "暂未生成",
        "product_name": "智能保温杯",
    },
    "100003": {
        "order_id": "100003",
        "status": "已签收",
        "logistics_status": "用户本人已签收",
        "estimated_delivery": "已于 2026-05-14 送达",
        "carrier": "中通快递",
        "tracking_number": "ZT1000036666",
        "product_name": "家用空气炸锅",
    },
}
