# marginmath

What does a product's margin actually allow you to spend on ads? marginmath is a local forwarding client for the hosted Ecomwith MCP service: it answers `tools/list` locally from the captured tool definitions and forwards every call to the service, returning the answers exactly as the service sends them back.

All six tools are calculators and public reads. Two compute ecommerce margins from figures you supply — break-even and target-profit ROAS with maximum CPA, and side-by-side comparisons of pricing or cost scenarios — one formats campaign UTM links locally, and the rest search Ecomwith's published tutorials and read its public weekly reports. Unknown inputs are passed through as null and come back as `needs_input` questions, never guessed. There is no write, signup, or send tool in this surface.

## The tools

- **`calculate_break_even_roas`** — Break-even and target-profit ROAS and maximum CPA from revenue, costs, percentage fees and a refund reserve. All seven inputs (`currency`, `price`, `productCost`, `shippingCost`, `paymentFeeRate`, `refundRate`, `targetProfit`) are required; use null for any that is unknown.
- **`compare_profit_scenarios`** — Compares two to five user-supplied pricing or cost scenarios (`scenarios`, each with a `label` and the same seven `inputs`) in one currency, returning contribution, maximum CPA and ROAS for complete scenarios.
- **`build_campaign_utm`** — Formats one HTTP(S) campaign URL with `url`, `source`, `medium` and `campaign` (plus optional `content` and `term`), trimming and lowercasing the UTM values. It never visits the URL.
- **`search_ecommerce_resources`** — Searches Ecomwith published tutorial metadata and public answer summaries by `query` (English or Chinese); `limit` caps the count between 1 and 10 and `locale` is `en` or `zh`.
- **`list_public_weekly_reports`** — Lists up to ten published or corrected Ecomwith weekly reports with public summaries and dates. No required parameters; `limit` and `locale` are optional.
- **`get_public_weekly_report`** — Reads guest excerpts and cited source links for one published weekly report by its `slug`, as returned by `list_public_weekly_reports`.

## Install and run

As an MCP server via npm:

```bash
npx -y @reneturcios/marginmath mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "marginmath": {
      "command": "npx",
      "args": ["-y", "@reneturcios/marginmath", "mcp"]
    }
  }
}
```

As a container:

```bash
docker run -i ghcr.io/cloudcorprecords/marginmath
docker run --rm ghcr.io/cloudcorprecords/marginmath search_ecommerce_resources '{"query":"roas"}'
```

## CLI

One binary serves both the command line and the MCP server. Each tool is a subcommand taking a single JSON string with that tool's arguments:

```bash
marginmath calculate_break_even_roas '{"currency":"USD","price":100,"productCost":40,"shippingCost":8,"paymentFeeRate":3,"refundRate":5,"targetProfit":10}'
marginmath compare_profit_scenarios '{"scenarios":[{"label":"base","inputs":{"currency":"USD","price":100,"productCost":40,"shippingCost":8,"paymentFeeRate":3,"refundRate":5,"targetProfit":10}},{"label":"premium","inputs":{"currency":"USD","price":140,"productCost":40,"shippingCost":8,"paymentFeeRate":3,"refundRate":5,"targetProfit":10}}]}'
marginmath build_campaign_utm '{"url":"https://example.com/landing","source":"google","medium":"cpc","campaign":"spring_sale"}'
marginmath search_ecommerce_resources '{"query":"break-even roas"}'
marginmath list_public_weekly_reports '{}'
marginmath get_public_weekly_report '{"slug":"2026-week-01"}'
marginmath --version
```

Exit codes: `0` when the forwarded call succeeds, `1` when the upstream result is an error, and `2` for usage problems such as an unknown subcommand or a malformed JSON argument.

## Configuration

- `MARGINMATH_MCP_URL` — Overrides the upstream endpoint. The default is the pinned hosted endpoint, `https://ecomwith.com/api/mcp`. (The override variable is a reconstruction added by this rebuild.)

The upstream registry record declares no headers, so no authentication header is ever sent; the tool surface was captured keyless.

Upstream failures — a JSON-RPC error from the service, a non-2xx response, an unreadable body, or a request that fails outright — are reported to the caller as an error result whose text starts with `marginmath error:`.

## How forwarding works

The first forwarded call opens a session: an `initialize` request (protocol version `2025-03-26`), followed by a `notifications/initialized` notification, then the `tools/call` itself. If the service answers the initialize request with an `Mcp-Session-Id` header, that value is carried on every later request, and the open session is reused for the rest of the process. Replies are accepted either as plain JSON or as server-sent events. Successful results pass through verbatim, including any `isError` flag and any extra fields the service includes.

## Development

```bash
npm install
npm run build   # tsc -> dist/ (dist/cli.js is the bin)
npm test        # tsx --test test/*.test.ts — stubbed upstream, no network
npm run dev     # run the CLI from source
```

The test suite checks the served tool list against the captured surface (all 6 tools, deep-equal, in order, with titles served verbatim and no `required` key added to the one tool that carries none), exercises the session handshake and its reuse, verifies that no `Authorization` or `X-API-Key` header is ever sent under any environment, and verifies that arguments go upstream untouched and results come back untouched.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Rene Turcios.
