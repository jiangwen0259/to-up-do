"""运维配置表：免费额度、公告、feature flags 等。一行一个 key。"""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class AppConfig(SQLModel, table=True):
    """系统配置表。
    value 统一存 JSON 字符串，业务层自行解析。
    """

    __tablename__ = "app_config"

    key: str = Field(primary_key=True)
    value: str = Field(description="JSON 字符串")
    note: Optional[str] = Field(default=None)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
