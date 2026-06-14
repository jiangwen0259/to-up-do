"""Alembic 环境脚本：把 SQLModel.metadata 接到 Alembic 的 autogenerate。

使用方式（从 server/ 目录运行）：
    alembic revision --autogenerate -m "描述这次改了啥"
    alembic upgrade head
    alembic downgrade -1
"""

from logging.config import fileConfig
from pathlib import Path
import sys

from alembic import context
from sqlalchemy import engine_from_config, pool

# 让 alembic 可以 import 到 app.* —— 把 server/ 加到 sys.path
SERVER_DIR = Path(__file__).resolve().parent.parent
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from app import models  # noqa: F401  —— 仅为副作用：注册所有表
from app.db import DB_URL, SQLModel

# Alembic Config 对象
config = context.config

# 使用 app/db.py 里的 DB_URL，无需在 alembic.ini 里重复配置
config.set_main_option("sqlalchemy.url", DB_URL)

# 配置日志
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 关键：告诉 Alembic 我们的所有表都登记在 SQLModel.metadata
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,  # SQLite 必备：让 ALTER TABLE 走重建表流程
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # SQLite 必备
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
