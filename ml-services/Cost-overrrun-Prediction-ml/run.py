from __future__ import annotations

import os

from dotenv import load_dotenv
import uvicorn


def _env_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def main() -> None:
    load_dotenv()

    port = int(os.getenv("PORT", "8085"))
    dev_mode = _env_bool(os.getenv("DEV_MODE"), default=False)

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=dev_mode,
    )


if __name__ == "__main__":
    main()
