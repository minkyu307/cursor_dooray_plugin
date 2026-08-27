const ALLOWED_PATH_PREFIXES = [
  "/common/",
  "/project/",
  "/calendar/",
  "/drive/",
  "/wiki/",
  "/messenger/",
  "/reservation/",
  "/contacts/",
] as const;

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface DoorayRequestOptions {
  method: HttpMethod;
  path: string;
  query?: Record<string, unknown> | undefined;
  body?: unknown;
}

export class DoorayApiError extends Error {
  readonly status: number;
  readonly resultCode: number | undefined;
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown, resultCode?: number) {
    super(message);
    this.name = "DoorayApiError";
    this.status = status;
    this.payload = payload;
    this.resultCode = resultCode;
  }
}

export interface DoorayClientOptions {
  token: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

/**
 * 공식 Dooray Service API HTTP 클라이언트.
 * Authorization 헤더는 `dooray-api {TOKEN}` 형식을 사용한다.
 */
export class DoorayClient {
  private readonly token: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: DoorayClientOptions) {
    this.token = options.token;
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  /** 허용된 Dooray API 경로만 호출한다. */
  async request(options: DoorayRequestOptions): Promise<unknown> {
    const path = normalizeApiPath(options.path);
    const url = new URL(`${this.baseUrl}${path}`);
    appendQuery(url, options.query);

    const headers: Record<string, string> = {
      Authorization: `dooray-api ${this.token}`,
      Accept: "application/json",
    };

    let body: string | undefined;
    if (options.body !== undefined && options.method !== "GET") {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const response = await this.fetchImpl(url, {
      method: options.method,
      headers,
      body,
    });

    const payload = await readPayload(response);
    if (!response.ok) {
      throw toApiError(response.status, payload);
    }
    return payload;
  }
}

/** 경로가 Dooray Service API 범위인지 검증하고 정규화한다. */
export function normalizeApiPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    throw new Error(`API path must start with a single '/': ${path}`);
  }
  if (trimmed.includes("://") || trimmed.includes("\\")) {
    throw new Error(`API path must be a relative Dooray path: ${path}`);
  }

  const pathname = trimmed.split("?")[0] ?? trimmed;
  const normalized = pathname.replace(/\/{2,}/g, "/");
  if (normalized.includes("/../") || normalized.endsWith("/..")) {
    throw new Error(`API path must not contain '..': ${path}`);
  }

  const allowed = ALLOWED_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  if (!allowed) {
    throw new Error(
      `Unsupported API path '${normalized}'. Allowed prefixes: ${ALLOWED_PATH_PREFIXES.join(", ")}`,
    );
  }
  return trimmed;
}

/** DELETE 또는 문서상 파괴적 POST 경로인지 판별한다. */
export function isDestructiveRequest(method: HttpMethod, path: string): boolean {
  if (method === "DELETE") {
    return true;
  }
  const normalized = path.split("?")[0] ?? path;
  return /\/(delete|set-archive)(\/|$)/.test(normalized);
}

function appendQuery(url: URL, query: Record<string, unknown> | undefined): void {
  if (!query) {
    return;
  }
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      const joined = value.map(String).filter((item) => item.length > 0).join(",");
      if (joined.length > 0) {
        url.searchParams.set(key, joined);
      }
      continue;
    }
    url.searchParams.set(key, String(value));
  }
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function toApiError(status: number, payload: unknown): DoorayApiError {
  const header = isRecord(payload) && isRecord(payload.header) ? payload.header : undefined;
  const resultMessage = typeof header?.resultMessage === "string" ? header.resultMessage : undefined;
  const resultCode = typeof header?.resultCode === "number" ? header.resultCode : undefined;
  const message = resultMessage
    ? `Dooray API ${status}: ${resultMessage}`
    : `Dooray API request failed with HTTP ${status}`;
  return new DoorayApiError(message, status, payload, resultCode);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
