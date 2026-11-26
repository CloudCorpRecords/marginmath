# BUILD REPORT — marginmath

Clean-room rebuild of `com.ecomwith/commerce-desk` v1.0.1
(remote-only MCP server at `https://ecomwith.com/api/mcp`),
built 2026-10-28 as a forwarding client. Package:
`@reneturcios/marginmath` 0.1.0, registry name
`io.github.CloudCorpRecords/marginmath`.

## Surface built

Full surface: **6 of 6 captured tools built**, none omitted.

| Tool | Required fields as served |
|------|---------------------------|
| `calculate_break_even_roas` | `currency`, `price`, `productCost`, `shippingCost`, `paymentFeeRate`, `refundRate`, `targetProfit` |
| `compare_profit_scenarios` | `scenarios` |
| `build_campaign_utm` | `url`, `source`, `medium`, `campaign` |
| `search_ecommerce_resources` | `query` |
| `list_public_weekly_reports` | NO `required` key in the capture — served verbatim, none invented |
| `get_public_weekly_report` | `slug` |

Each served tool carries exactly the keys `name`, `title`,
`description`, `inputSchema`, exactly as captured: the capture
carries `title` keys on every tool and they are served verbatim.
The inputSchemas carry `$schema` keys
(`https://json-schema.org/draft/2020-12/schema`) and anyOf/null
property shapes, carried verbatim as part of each inputSchema.
The tool literals were generated programmatically from
`harness/fixtures/ecomwith-tools.json` by the script at
`/tmp/b50-marginmath-scratch/gen.py` (parse + re-serialise; the
generator's round-trip assertions confirmed the emitted literals
parse back to the fixture's tool objects — literal 14,500 bytes,
sha256 `fd14cb4baede4498c98fbfcd0738067f250d40d92580fe033eb71a921cd727ed`).
Note on method: this VM's write guard blocked the generator's
direct file write of the fixture-derived literal (EPERM, as the
brief warned), so the generator emitted the literal on stdout
and it was embedded into `src/forward.ts` with the file-write
tool; a post-write extraction check re-parsed the literal out of
the written `src/forward.ts` and confirmed it deep-equals the
fixture's 6 tool objects. The registration-integrity test suite
plus the parity harness confirmed the same. Tools are registered
via the MCP SDK low-level Server API (`ListToolsRequestSchema` /
`CallToolRequestSchema` handlers), not McpServer+zod.

## Fixture conflicts

**None.** The spec and the fixture agree on all 6 tools' names,
titles, descriptions, required fields (including the one tool
with no `required` key: `list_public_weekly_reports`) and
property shapes.

## Labelled reconstructions (from the spec's Wire section)

- Upstream endpoint pinned: `https://ecomwith.com/api/mcp`.
- Env override `MARGINMATH_MCP_URL` — labelled reconstruction.
- The registry record declares NO headers on the remote: no auth
  header is ever sent. Tests assert that no `Authorization`
  header is sent under any environment — including with key-like
  env vars (`MARGINMATH_API_KEY`, `API_KEY`, `AUTHORIZATION`)
  set — and that no `X-API-Key` header is ever sent; upstream
  requests carry only `Content-Type`, `Accept` and, when issued,
  `Mcp-Session-Id`.
- Error rendering `marginmath error:` text for upstream failures
  — labelled reconstruction.
- Upstream results pass through verbatim, including
  `structuredContent`, `isError` and extra fields. tools/call is
  forwarded as streamable-HTTP JSON-RPC: initialize
  (protocolVersion `2025-03-26`) → notifications/initialized →
  tools/call, honouring `Mcp-Session-Id` when issued; plain-JSON
  and SSE replies are both parsed. The forwarding core takes an
  injectable fetch; tests stub the upstream — no live network
  calls in tests.

## Deviations

None in the build itself. One process note on the lockfile
route, recorded under Lockfile below.

## Lockfile

- Route: the offline route (`npm install --package-lock-only
  --ignore-scripts --offline`, Route 3) was attempted first and
  FAILED with `ENOTCACHED` (the local npm cache held no cached
  packument for `@modelcontextprotocol/sdk`). The specified
  fallback route was used: `HTTPS_PROXY=http://hatch-egress-proxy:3128
  HTTP_PROXY=http://hatch-egress-proxy:3128 npm install
  --package-lock-only --ignore-scripts --registry
  https://registry.npmjs.org`. A follow-up offline run then
  reported the result "up to date, audited 128 packages", and the
  lockfile's sha256 was re-verified unchanged after the
  subsequent full `npm install`.
- Parses as JSON; `name` == `@reneturcios/marginmath`.
- Package entries: **128**.
- sha256: `ea1027eba2a42028da83fc6344a892d0b77f7bb29a60c39be51b291db7138f62`

## server.json

- Description exactly: "Ecommerce margin calculators: break-even ROAS, profit scenarios, UTM links, weekly reports." —
  **91 characters** (verified programmatically).
- npm package entry carries `"version": "0.1.0"`; the OCI entry
  (`ghcr.io/cloudcorprecords/marginmath:0.1.0`) carries **no**
  `version` field. Both entries carry packageArguments
  `[{type: positional, value: mcp}]` and transport stdio.
  Dockerfile (node:20-alpine, both stages) carries the label
  `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/marginmath"`.
  Container workflow `IMAGE` is `ghcr.io/cloudcorprecords/marginmath`
  and its smoke test asserts the server name `marginmath`.

## Verification (all run 2026-10-28)

1. `npx tsc --noEmit` → exit 0.
2. `npm run build` → exit 0; real `dist/` produced (cli, forward,
   index, mcp, types — .js, .d.ts, .js.map each).
3. `node dist/cli.js --version` → `0.1.0`.
4. `npm test` → **60 tests, 60 pass, 0 fail** (registration-integrity
   suite deep-equals the served tools/list against the fixture's 6
   tools, including title verbatim, required-key exactness
   assertions — list_public_weekly_reports has NO required key —
   the `$schema` marker and anyOf/null property shapes, plus
   session handling/reuse, env override, the no-Authorization /
   no-X-API-Key assertions under any environment, verbatim
   per-tool argument forwarding for all 6 tools and result
   pass-through including structuredContent and upstream isError,
   SSE parsing, error rendering for both the JSON-RPC-error and
   transport-failure paths, MCP-layer validation, and CLI
   behaviour including a working subcommand for every one of the
   6 tools against a local stub server).
5. Parity: `python3 /home/hatch/workspace/mcp-rebuild-100/harness/parity.py --original /home/hatch/workspace/mcp-rebuild-100/harness/fixtures/ecomwith-tools.json --rebuild "stdio:node /home/hatch/workspace/mcp-rebuild-100/builds/marginmath/dist/cli.js mcp" --out /home/hatch/workspace/mcp-rebuild-100/builds/marginmath/parity-out` → **verdict PASS, parity 100.0**
   (6/6 identical, 0 missing, 0 extra, no schema diffs). Output in
   `parity-out/`.
