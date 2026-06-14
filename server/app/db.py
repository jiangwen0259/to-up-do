"""SQLite + SQLModel 数据库引擎。

约定：
- 数据库文件位于 server/data/app.db
- 通过 get_session() 获取一次会话（FastAPI 依赖注入用）
"""

from pathlib import Path
from typing import Generator

from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine

from app.logger import logger

# ─── 路径 ───
SERVER_ROOT = Path(__file__).resolve().parent.parent  # server/
DATA_DIR = SERVER_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_FILE = DATA_DIR / "app.db"
DB_URL = f"sqlite:///{DB_FILE}"

# ─── Engine ───
# check_same_thread=False 允许跨线程使用（FastAPI 异步框架场景）
# echo=False 不打印每条 SQL（调试时可开 True）
engine: Engine = create_engine(
    DB_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)


def init_db() -> None:
    """启动时调用：确保数据库连接可用。
    注意：建表交给 Alembic 管理，这里不再 SQLModel.metadata.create_all。
    """
    logger.info("Database engine ready: %s", DB_FILE)


def get_session() -> Generator[Session, None, None]:
    """FastAPI 依赖项：每个请求一个 Session。
    用法：
        @router.get("/foo")
        def foo(session: Session = Depends(get_session)):
            ...
    """
    with Session(engine) as session:
        yield session


# 让 SQLModel 元数据可以被 Alembic 找到
__all__ = ["engine", "DB_URL", "DB_FILE", "init_db", "get_session", "SQLModel"]
