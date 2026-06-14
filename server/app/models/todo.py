"""云端待办相关表：cloud_todos / device_sync_state"""

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class CloudTodo(SQLModel, table=True):
    """云端镜像的待办。schema 与前端 IndexedDB 大体对齐。

    关键字段：
    - client_uuid：前端生成、跨设备稳定的 ID。同步靠它做 upsert
    - updated_at：增量同步的时间戳依据
    - deleted_at：软删除（None=未删除）。保留 30 天用于回收站
    """

    __tablename__ = "cloud_todos"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    client_uuid: str = Field(index=True)

    title: str
    description: str = Field(default="")
    priority: str = Field(default="medium", description="low | medium | high | urgent")
    status: str = Field(default="todo", description="todo | in_progress | done")
    source: str = Field(default="manual", description="manual | tapd")
    tags: str = Field(default="[]", description="JSON 数组字符串")

    due_date: Optional[datetime] = Field(default=None)
    remind_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

    sort_order: int = Field(default=0)
    sub_tasks: str = Field(default="[]", description="JSON 数组字符串")
    estimated_hours: Optional[float] = Field(default=None)
    parent_id: Optional[int] = Field(default=None, description="子任务用，存父 todo 的 id")

    tapd_id: Optional[str] = Field(default=None)
    tapd_work_item_type: Optional[str] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    deleted_at: Optional[datetime] = Field(default=None, index=True)


class DeviceSyncState(SQLModel, table=True):
    """每个设备最近一次成功 pull 的时间戳。
    这样设备 A 推送后，设备 B 拉的时候只取增量。
    """

    __tablename__ = "device_sync_state"

    user_id: int = Field(primary_key=True, foreign_key="users.id")
    device_id: str = Field(primary_key=True)
    last_pulled: Optional[datetime] = Field(default=None)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
