import json
import os
from pathlib import Path
from typing import Optional

from app.logger import logger


def _find_config() -> Path:
    env_path = os.getenv("CONFIG_PATH", "")
    candidates = [
        Path(env_path) if env_path else Path("/dev/null"),
        Path(__file__).resolve().parent.parent / "config.json",
        Path.cwd() / "config.json",
    ]
    for p in candidates:
        if p.is_file():
            return p
    return candidates[1]


class Config:
    def __init__(self):
        self._path = _find_config()
        self._data: dict = {}
        self.reload()

    def reload(self) -> None:
        if self._path.exists():
            with open(self._path, "r", encoding="utf-8") as f:
                self._data = json.load(f)
            logger.info("Config loaded from %s", self._path)
        else:
            logger.warning("Config file not found at %s, using defaults", self._path)
            self._data = _default_config()

    def save(self) -> None:
        with open(self._path, "w", encoding="utf-8") as f:
            json.dump(self._data, f, indent=2, ensure_ascii=False)
        logger.info("Config saved to %s", self._path)

    @property
    def tapd(self) -> dict:
        return self._data.get("tapd", {})

    @property
    def ai(self) -> dict:
        return self._data.get("ai", {})

    @property
    def server(self) -> dict:
        return self._data.get("server", {})

    @property
    def reminder(self) -> dict:
        return self._data.get("reminder", {})

    def update_tapd(self, data: dict) -> None:
        self._data["tapd"] = {**self._data.get("tapd", {}), **data}
        self.save()

    def update_ai(self, data: dict) -> None:
        self._data["ai"] = {**self._data.get("ai", {}), **data}
        self.save()

    def update_reminder(self, data: dict) -> None:
        self._data["reminder"] = {**self._data.get("reminder", {}), **data}
        self.save()


def _default_config() -> dict:
    return {
        "tapd": {
            "personal_token": "",
            "oauth": {"client_id": "", "client_secret": ""},
            "default_workspace_id": "",
            "sync_interval": 30,
        },
        "ai": {
            "provider": "openai",
            "api_key": "",
            "base_url": "https://api.openai.com/v1",
            "model": "gpt-4o",
        },
        "server": {
            "host": "0.0.0.0",
            "port": 8787,
            "cors_origins": ["*"],
        },
        "reminder": {
            "enabled": True,
            "deadline_advance": 30,
        },
    }


config = Config()
