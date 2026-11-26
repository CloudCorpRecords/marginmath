/**
 * marginmath core: a forwarding client for the hosted
 * Ecomwith MCP server.
 *
 * Nothing about the calculators is computed here.
 * tools/list is answered from the literal definitions
 * below, which reproduce a live capture of the upstream
 * server word for word (name, title, description and
 * inputSchema exactly as captured; the capture carries
 * title keys on every tool, and one tool --
 * list_public_weekly_reports -- carries no `required`
 * key, so none is served for it). A tools/call travels
 * upstream over a streamable-HTTP JSON-RPC session: an
 * initialize POST, a notifications/initialized POST,
 * then the tools/call POST, carrying the Mcp-Session-Id
 * response header on later requests when the upstream
 * issues one. The session opens lazily on the first
 * forwarded call and is reused for the client's
 * lifetime.
 *
 * The endpoint is pinned to
 * https://ecomwith.com/api/mcp and may be replaced
 * with the MARGINMATH_MCP_URL environment variable
 * (that override is a labelled reconstruction). The
 * registry record declares NO headers on the upstream
 * remote, so no auth header is ever sent, under any
 * environment.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures -- an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch
 * that throws or times out -- become an isError result
 * whose text begins with `marginmath error:` (that
 * rendering is a labelled reconstruction). Replies may
 * be plain JSON or SSE (`data:` lines); the JSON-RPC
 * message whose id matches the request wins.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://ecomwith.com/api/mcp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/ecomwith-tools.json; generated           */
/* programmatically by parsing and re-serialising the fixture JSON,     */
/* never retyped). All 6 captured tools are built.                      */
/* ------------------------------------------------------------------ */

export const TOOL_DEFS: ToolDef[] = [
  {
    "name": "calculate_break_even_roas",
    "title": "Calculate break-even ROAS",
    "description": "Calculate break-even and target-profit ROAS and maximum CPA from user-supplied revenue, costs, percentage fees and refund reserve. Ask for missing inputs even if asked not to ask questions. Unknown fields must be null, never guessed zeros or a default currency. If any input is unknown, returns needs_input with questions and no estimate. Only explicit user-supplied zeros are valid. Does not read an ad account or change a budget.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "additionalProperties": false,
      "properties": {
        "currency": {
          "anyOf": [
            {
              "description": "ISO 4217 currency code; all amounts must use this currency.",
              "pattern": "^[A-Z]{3}$",
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "description": "User-supplied ISO 4217 currency code. Use null if unknown; never assume USD."
        },
        "paymentFeeRate": {
          "anyOf": [
            {
              "description": "Payment fee as a percentage, e.g. 3 means 3%, not 0.03.",
              "maximum": 100,
              "minimum": 0,
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "description": "User-supplied payment fee percentage: 3 means 3%. Use null if unknown; do not substitute 0."
        },
        "price": {
          "anyOf": [
            {
              "description": "Revenue per order after discounts, excluding collected taxes.",
              "exclusiveMinimum": 0,
              "maximum": 1000000000,
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "description": "User-supplied revenue per order after discounts and excluding collected taxes. Use null if unknown."
        },
        "productCost": {
          "anyOf": [
            {
              "description": "Product cost per order, including any allocated costs you want to model.",
              "maximum": 1000000000,
              "minimum": 0,
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "description": "User-supplied product cost per order. Use null if unknown; use 0 only when the user explicitly supplied zero."
        },
        "refundRate": {
          "anyOf": [
            {
              "description": "Revenue reserved for refunds as a percentage; this is a simplified reserve.",
              "maximum": 100,
              "minimum": 0,
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "description": "User-supplied refund reserve percentage. Use null if unknown; do not substitute 0."
        },
        "shippingCost": {
          "anyOf": [
            {
              "description": "Net shipping and fulfillment cost per order.",
              "maximum": 1000000000,
              "minimum": 0,
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "description": "User-supplied net shipping and fulfillment cost per order. Use null if unknown; do not substitute 0."
        },
        "targetProfit": {
          "anyOf": [
            {
              "description": "Desired contribution per order after advertising. Supply 0 for break-even only.",
              "maximum": 1000000000,
              "minimum": 0,
              "type": "number"
            },
            {
              "type": "null"
            }
          ],
          "description": "User-supplied desired profit per order, or 0 when the user requests break-even only. Use null if unknown."
        }
      },
      "required": [
        "currency",
        "price",
        "productCost",
        "shippingCost",
        "paymentFeeRate",
        "refundRate",
        "targetProfit"
      ],
      "type": "object"
    }
  },
  {
    "name": "compare_profit_scenarios",
    "title": "Compare profit scenarios",
    "description": "Compare two to five user-supplied pricing or cost scenarios in one currency. Unknown inputs must be null, never guessed zeros or a default currency. If any scenario is incomplete, returns needs_input with labeled questions and no numeric comparison; ask for those inputs. Complete scenarios return contribution, maximum CPA and ROAS. Does not predict sales or change pricing or advertising.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "additionalProperties": false,
      "properties": {
        "scenarios": {
          "description": "Array of two to five user-supplied pricing or cost scenarios to compare, in one currency",
          "items": {
            "additionalProperties": false,
            "properties": {
              "inputs": {
                "additionalProperties": false,
                "properties": {
                  "currency": {
                    "anyOf": [
                      {
                        "description": "ISO 4217 currency code; all amounts must use this currency.",
                        "pattern": "^[A-Z]{3}$",
                        "type": "string"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "description": "User-supplied ISO 4217 currency code. Use null if unknown; never assume USD."
                  },
                  "paymentFeeRate": {
                    "anyOf": [
                      {
                        "description": "Payment fee as a percentage, e.g. 3 means 3%, not 0.03.",
                        "maximum": 100,
                        "minimum": 0,
                        "type": "number"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "description": "User-supplied payment fee percentage: 3 means 3%. Use null if unknown; do not substitute 0."
                  },
                  "price": {
                    "anyOf": [
                      {
                        "description": "Revenue per order after discounts, excluding collected taxes.",
                        "exclusiveMinimum": 0,
                        "maximum": 1000000000,
                        "type": "number"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "description": "User-supplied revenue per order after discounts and excluding collected taxes. Use null if unknown."
                  },
                  "productCost": {
                    "anyOf": [
                      {
                        "description": "Product cost per order, including any allocated costs you want to model.",
                        "maximum": 1000000000,
                        "minimum": 0,
                        "type": "number"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "description": "User-supplied product cost per order. Use null if unknown; use 0 only when the user explicitly supplied zero."
                  },
                  "refundRate": {
                    "anyOf": [
                      {
                        "description": "Revenue reserved for refunds as a percentage; this is a simplified reserve.",
                        "maximum": 100,
                        "minimum": 0,
                        "type": "number"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "description": "User-supplied refund reserve percentage. Use null if unknown; do not substitute 0."
                  },
                  "shippingCost": {
                    "anyOf": [
                      {
                        "description": "Net shipping and fulfillment cost per order.",
                        "maximum": 1000000000,
                        "minimum": 0,
                        "type": "number"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "description": "User-supplied net shipping and fulfillment cost per order. Use null if unknown; do not substitute 0."
                  },
                  "targetProfit": {
                    "anyOf": [
                      {
                        "description": "Desired contribution per order after advertising. Supply 0 for break-even only.",
                        "maximum": 1000000000,
                        "minimum": 0,
                        "type": "number"
                      },
                      {
                        "type": "null"
                      }
                    ],
                    "description": "User-supplied desired profit per order, or 0 when the user requests break-even only. Use null if unknown."
                  }
                },
                "required": [
                  "currency",
                  "price",
                  "productCost",
                  "shippingCost",
                  "paymentFeeRate",
                  "refundRate",
                  "targetProfit"
                ],
                "type": "object"
              },
              "label": {
                "maxLength": 80,
                "minLength": 1,
                "type": "string"
              }
            },
            "required": [
              "label",
              "inputs"
            ],
            "type": "object"
          },
          "maxItems": 5,
          "minItems": 2,
          "type": "array"
        }
      },
      "required": [
        "scenarios"
      ],
      "type": "object"
    }
  },
  {
    "name": "build_campaign_utm",
    "title": "Build a campaign UTM link",
    "description": "Format one HTTP(S) campaign URL with source, medium and campaign, plus optional content and term. Trims and lowercases UTM values and replaces whitespace with underscores. Returns naming warnings. Never visits the URL, sends a message, saves a campaign or changes tracking settings.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "additionalProperties": false,
      "properties": {
        "campaign": {
          "description": "UTM campaign name (utm_campaign)",
          "maxLength": 120,
          "minLength": 1,
          "type": "string"
        },
        "content": {
          "description": "UTM content tag (utm_content) distinguishing variants of the same ad or link",
          "maxLength": 120,
          "minLength": 1,
          "type": "string"
        },
        "medium": {
          "description": "UTM medium (utm_medium), such as email, cpc or social",
          "maxLength": 120,
          "minLength": 1,
          "type": "string"
        },
        "source": {
          "description": "UTM source (utm_source), such as a site or newsletter name",
          "maxLength": 120,
          "minLength": 1,
          "type": "string"
        },
        "term": {
          "description": "UTM term (utm_term), the paid-search keyword tag",
          "maxLength": 120,
          "minLength": 1,
          "type": "string"
        },
        "url": {
          "description": "Destination URL. This tool formats it locally and never fetches it.",
          "maxLength": 2048,
          "minLength": 1,
          "type": "string"
        }
      },
      "required": [
        "url",
        "source",
        "medium",
        "campaign"
      ],
      "type": "object"
    }
  },
  {
    "name": "search_ecommerce_resources",
    "title": "Search Ecomwith resources",
    "description": "Search Ecomwith published tutorial metadata, internal tool descriptions and public answer summaries in English or Chinese. Returns up to ten source links with content access labels. Does not search the wider web, fetch websites or return paid lesson bodies, drafts or customer data.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "additionalProperties": false,
      "properties": {
        "limit": {
          "description": "Maximum number of results to return",
          "default": 5,
          "maximum": 10,
          "minimum": 1,
          "type": "integer"
        },
        "locale": {
          "description": "Locale for the response: en or zh",
          "default": "en",
          "enum": [
            "en",
            "zh"
          ],
          "type": "string"
        },
        "query": {
          "description": "Search text to match against the ecommerce resources",
          "maxLength": 160,
          "minLength": 2,
          "type": "string"
        }
      },
      "required": [
        "query"
      ],
      "type": "object"
    }
  },
  {
    "name": "list_public_weekly_reports",
    "title": "List public ecommerce weekly reports",
    "description": "List up to ten Ecomwith published or corrected ecommerce reports with public summaries and dates. Does not return drafts, withdrawn issues, member-only sections, subscriber data or unpublished research. These are dated editorial reports, not a live news feed.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "additionalProperties": false,
      "properties": {
        "limit": {
          "description": "Maximum number of results to return",
          "default": 5,
          "maximum": 10,
          "minimum": 1,
          "type": "integer"
        },
        "locale": {
          "description": "Locale for the response: en or zh",
          "default": "en",
          "enum": [
            "en",
            "zh"
          ],
          "type": "string"
        }
      },
      "type": "object"
    }
  },
  {
    "name": "get_public_weekly_report",
    "title": "Read a public ecommerce weekly report",
    "description": "Read guest excerpts and cited source links for one published or corrected Ecomwith weekly report, using a slug returned by list_public_weekly_reports. Retain publication and correction dates and each cited source verificationStatus label; do not upgrade weaker evidence. Rechecks publication state each call. A withdrawn, unpublished, missing or unavailable-language report is not returned. No member content or private research notes are accessible.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "additionalProperties": false,
      "properties": {
        "locale": {
          "description": "Locale for the response: en or zh",
          "default": "en",
          "enum": [
            "en",
            "zh"
          ],
          "type": "string"
        },
        "slug": {
          "description": "Slug identifying the weekly report to read",
          "maxLength": 160,
          "minLength": 1,
          "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$",
          "type": "string"
        }
      },
      "required": [
        "slug"
      ],
      "type": "object"
    }
  }
];
export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the captured built surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `marginmath error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client holding a single upstream session,
 * opened lazily on first use and reused from then on
 * (for the process lifetime in the MCP server, or for a
 * single invocation in the CLI).
 */
export class MarginmathClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).MARGINMATH_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    // The registry record declares NO headers on the upstream
    // remote: no Authorization header is ever sent.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "marginmath", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): MarginmathClient {
  return new MarginmathClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new MarginmathClient(deps).callTool(name, args);
}
