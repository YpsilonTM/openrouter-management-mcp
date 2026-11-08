"""CLI entry point: MCP server on stdio."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from openrouter_management_mcp.log import get_log_level, log, set_log_level


def _load_dotenv() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(dotenv_path=Path.cwd() / ".env", override=False)


def _configure_logging() -> None:
    level = (os.environ.get("OPENROUTER_MGMT_LOG_LEVEL") or "info").lower()
    if level in ("error", "warn", "info", "debug"):
        set_log_level(level)  # type: ignore[arg-type]


def build_parser() -> argparse.ArgumentParser:
    return argparse.ArgumentParser(
        prog="openrouter-management-mcp",
        description="OpenRouter Management API Model Context Protocol server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Environment:\n"
            "  OPENROUTER_MANAGEMENT_API_KEY   Required "
            "(https://openrouter.ai/settings/management-keys)\n"
            "  OPENROUTER_MGMT_LOG_LEVEL       error|warn|info|debug (default info)\n"
            "  OPENROUTER_BASE_URL             Override API base "
            "(default https://openrouter.ai/api/v1)\n"
        ),
    )


def main(argv: list[str] | None = None) -> None:
    _load_dotenv()
    _configure_logging()
    parser = build_parser()
    parser.parse_args(argv)

    try:
        from openrouter_management_mcp.server import start_mcp_server

        start_mcp_server()
    except SystemExit:
        raise
    except Exception as err:
        fields: dict[str, object] = {"error": str(err)}
        if get_log_level() == "debug":
            fields["exc_type"] = type(err).__name__
        log.error("Fatal error", fields)
        sys.exit(1)


__all__ = ["main", "build_parser"]
