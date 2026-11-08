"""CLI smoke tests."""

from __future__ import annotations

from openrouter_management_mcp.cli import build_parser


def test_parser_help() -> None:
    parser = build_parser()
    help_text = parser.format_help()
    assert "openrouter-management-mcp" in help_text
    assert "OPENROUTER_MANAGEMENT_API_KEY" in help_text
