from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import config
from app.db import init_db
from app.logger import logger
from app.middleware import RequestLogMiddleware
from app.routers import tapd, ai, reminder, settings
from app.scripts.seed import seed_defaults


def create_app() -> FastAPI:
    app = FastAPI(
        title="To-Up-Do Server",
        version="1.1.0",
        description="To-Up-Do 后端服务 — 云同步 / 计费 / TAPD / AI 网关",
    )

    cors_origins = config.server.get("cors_origins", ["*"])
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLogMiddleware)

    app.include_router(tapd.router, prefix="/api/tapd", tags=["TAPD"])
    app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
    app.include_router(reminder.router, prefix="/api/reminder", tags=["Reminder"])
    app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])

    @app.get("/health")
    async def health():
        return {"status": "ok", "version": "1.1.0"}

    @app.on_event("startup")
    def _startup():
        init_db()           # 检查数据库引擎可用
        seed_defaults()     # 幂等塞入默认套餐与配置

    logger.info("To-Up-Do Server initialized")
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    host = config.server.get("host", "0.0.0.0")
    port = config.server.get("port", 8787)
    logger.info("Starting server on %s:%s", host, port)
    uvicorn.run(app, host=host, port=port, log_level="warning")
