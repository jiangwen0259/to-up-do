import logging
import sys
import os
from datetime import datetime, timezone


class StandardFormatter(logging.Formatter):
    """标准格式: {timestamp} | {level} | {request_id} | {module} | {message}"""

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        level = record.levelname.ljust(8)
        req_id = getattr(record, "request_id", "-")
        module = record.name
        msg = record.getMessage()

        return f"{ts} | {level} | {req_id} | {module} | {msg}"


class JsonFormatter(logging.Formatter):
    """JSON 格式，适配日志采集系统"""

    def format(self, record: logging.LogRecord) -> str:
        import json

        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "request_id": getattr(record, "request_id", None),
            "module": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info and record.exc_info[1]:
            entry["error"] = str(record.exc_info[1])
        return json.dumps(entry, ensure_ascii=False)


def setup_logging() -> logging.Logger:
    log_format = os.getenv("LOG_FORMAT", "text")
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter() if log_format == "json" else StandardFormatter())

    logger = logging.getLogger("app")
    logger.setLevel(getattr(logging, log_level, logging.INFO))
    logger.handlers.clear()
    logger.addHandler(handler)

    return logger


logger = setup_logging()
