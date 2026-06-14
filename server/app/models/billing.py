"""计费 / 激活码相关表：plans / activation_codes / subscriptions / redemptions"""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Plan(SQLModel, table=True):
    """套餐价格表。运维可改这张表来调价或加套餐，不用改代码。"""

    __tablename__ = "plans"

    id: str = Field(primary_key=True, description="例：monthly / quarterly / yearly")
    name: str = Field(description="展示名，例：月度会员")
    duration_days: int = Field(description="一次激活给多少天")
    price_cny_cents: int = Field(description="价格，单位：分。500 = 5 元")
    is_active: bool = Field(default=True, description="是否对外可购买")
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ActivationCode(SQLModel, table=True):
    """激活码池。一码一行，用过即作废。"""

    __tablename__ = "activation_codes"

    code: str = Field(primary_key=True, description="格式：TUD-XXXX-XXXX-XXXX")
    plan_id: str = Field(foreign_key="plans.id", index=True)
    batch_id: Optional[str] = Field(default=None, index=True, description="批次号，方便回溯")
    note: Optional[str] = Field(default=None, description="备注，如：6月微信群活动")

    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = Field(default=None, description="码自身过期时间")

    used_by: Optional[int] = Field(default=None, foreign_key="users.id", index=True)
    used_at: Optional[datetime] = Field(default=None)


class Subscription(SQLModel, table=True):
    """用户的当前订阅状态。一个 user_id 一行，续费就更新 paid_until。"""

    __tablename__ = "subscriptions"

    user_id: int = Field(primary_key=True, foreign_key="users.id")
    plan_id: Optional[str] = Field(default=None, foreign_key="plans.id")
    trial_until: Optional[datetime] = Field(default=None, description="试用到期，可选")
    paid_until: Optional[datetime] = Field(default=None, description="付费到期（最关键）")
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Redemption(SQLModel, table=True):
    """激活记录。审计 / 退款 / 客服查询用。"""

    __tablename__ = "redemptions"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    code: str = Field(foreign_key="activation_codes.code")
    plan_id: str = Field(foreign_key="plans.id")
    days_added: int

    paid_until_before: Optional[datetime] = Field(default=None)
    paid_until_after: Optional[datetime] = Field(default=None)

    redeemed_at: datetime = Field(default_factory=datetime.utcnow)
