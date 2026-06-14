"""账号与登录相关表：users / identities / email_codes / user_sessions"""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    """用户主表。

    一个用户可绑定多个第三方身份（GitHub / Google / 邮箱）。
    email 是合并账号的关键键：同一邮箱即使来自不同 provider，也会归并到同一 user_id。
    """

    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    email: Optional[str] = Field(default=None, unique=True, index=True)
    nickname: Optional[str] = Field(default=None)
    avatar_url: Optional[str] = Field(default=None)
    status: str = Field(default="active", description="active | banned")

    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = Field(default=None)


class Identity(SQLModel, table=True):
    """第三方身份绑定。

    一个用户可同时绑 github + google + email，
    UNIQUE(provider, provider_uid) 保证同一账号不会重复入库。
    """

    __tablename__ = "identities"
    __table_args__ = (
        # 复合唯一索引：同一 provider 的同一 uid 全局唯一
        {"sqlite_autoincrement": True},
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    provider: str = Field(index=True, description="github | google | email")
    provider_uid: str = Field(index=True, description="GitHub 数字 ID / Google sub / email")
    raw_profile: Optional[str] = Field(default=None, description="JSON 原始 profile")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EmailCode(SQLModel, table=True):
    """邮件登录验证码（短时表，过期即可清理）。"""

    __tablename__ = "email_codes"

    email: str = Field(primary_key=True)
    code: str
    expires_at: datetime
    attempts: int = Field(default=0, description="错误尝试次数，>5 锁定")


class UserSession(SQLModel, table=True):
    """登录会话。JWT 自身已可校验，但保存一份方便：
    1) 主动踢人（让某个 token 立刻失效）
    2) 列出"我的设备"，让用户看在哪些设备登录了
    """

    __tablename__ = "user_sessions"

    token: str = Field(primary_key=True, description="jti / 随机串")
    user_id: int = Field(foreign_key="users.id", index=True)
    device_id: Optional[str] = Field(default=None, description="插件首次启动生成的 UUID")
    device_name: Optional[str] = Field(default=None, description="例：Chrome on MacBook")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen: Optional[datetime] = Field(default=None)
    expires_at: Optional[datetime] = Field(default=None)
