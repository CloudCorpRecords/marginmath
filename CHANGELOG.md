# Changelog

## 0.1.0 (2026-10-28)

- First release: a forwarding client for the hosted Ecomwith MCP server. All 6 captured tools are answered locally for tools/list, and every tools/call is forwarded upstream over a streamable-HTTP JSON-RPC session (initialize, notifications/initialized, tools/call, honouring the Mcp-Session-Id header when the upstream issues one).
- Tools: `calculate_break_even_roas`, `compare_profit_scenarios`, `build_campaign_utm`, `search_ecommerce_resources`, `list_public_weekly_reports`, `get_public_weekly_report`. The capture carries `title` keys on every tool and they are served verbatim; `list_public_weekly_reports` carries no `required` key in the capture and none is served. The inputSchemas carry `$schema` keys (JSON Schema draft 2020-12) and anyOf/null property shapes, carried verbatim.
- Upstream results pass through verbatim, including the isError flag; upstream failures surface as `marginmath error:` text results.
- One bin serves the CLI (one subcommand per tool, plus `--version`) and the stdio MCP server (`mcp` subcommand). The upstream endpoint can be overridden via `MARGINMATH_MCP_URL`. The upstream record declares no headers, so no auth header is ever sent.
