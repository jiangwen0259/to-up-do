"""所有 ORM 模型集中导入。

Alembic 的 autogenerate 需要能扫描到所有继承自 SQLModel 的表类，
所以这里统一从子模块 re-export。新增模型时记得在这里导入一次。
"""

from app.models.user import (  # noqa: F401
    User,
    Identity,
    EmailCode,
    UserSession,
)
from app.models.billing import (  # noqa: F401
    Plan,
    ActivationCode,
    Subscription,
    Redemption,
)
from app.models.todo import (  # noqa: F401
    CloudTodo,
    DeviceSyncState,
)
from app.models.app_config import AppConfig  # noqa: F401
