"""一次性初始化默认数据：套餐、运维配置。

幂等：已存在就跳过，不会覆盖你之后改过的值。
启动时自动调用，也可手动跑：
    python -m app.scripts.seed
"""

from datetime import datetime
import json

from sqlmodel import Session, select

from app.db import engine
from app.logger import logger
from app.models.app_config import AppConfig
from app.models.billing import Plan


# ─── 默认套餐 ───
DEFAULT_PLANS = [
    {
        "id": "monthly",
        "name": "月度会员",
        "duration_days": 30,
        "price_cny_cents": 500,  # 5 元
        "is_active": True,
        "sort_order": 1,
    },
    {
        "id": "quarterly",
        "name": "季度会员",
        "duration_days": 90,
        "price_cny_cents": 1400,  # 14 元，约 4.67/月
        "is_active": True,
        "sort_order": 2,
    },
    {
        "id": "yearly",
        "name": "年度会员",
        "duration_days": 365,
        "price_cny_cents": 5000,  # 50 元，约 4.17/月
        "is_active": True,
        "sort_order": 3,
    },
]

# ─── 默认运维配置 ───
DEFAULT_APP_CONFIG = [
    {
        "key": "free_todo_limit",
        "value": "100",
        "note": "免费用户最大可同步条数",
    },
    {
        "key": "trial_days",
        "value": "0",
        "note": "新用户试用天数（0 = 不开试用）",
    },
    {
        "key": "announcement",
        "value": json.dumps({"text": "", "level": "info"}, ensure_ascii=False),
        "note": "插件顶部公告，level: info | warning | success",
    },
    {
        "key": "feature_flags",
        "value": json.dumps(
            {
                "ai_assistant": True,
                "reminder_push": False,
                "tapd_sync": True,
            },
            ensure_ascii=False,
        ),
        "note": "前端可读的 feature 开关",
    },
]


def seed_defaults() -> None:
    """幂等地塞入默认套餐与配置。"""
    with Session(engine) as session:
        # ── 套餐 ──
        for p in DEFAULT_PLANS:
            existing = session.get(Plan, p["id"])
            if existing:
                continue
            session.add(Plan(**p))
            logger.info("Seeded plan: %s (¥%.2f / %d天)",
                        p["id"], p["price_cny_cents"] / 100, p["duration_days"])

        # ── 配置 ──
        for c in DEFAULT_APP_CONFIG:
            existing = session.get(AppConfig, c["key"])
            if existing:
                continue
            session.add(AppConfig(**c, updated_at=datetime.utcnow()))
            logger.info("Seeded config: %s", c["key"])

        session.commit()


if __name__ == "__main__":
    seed_defaults()
    print("Seed complete.")
