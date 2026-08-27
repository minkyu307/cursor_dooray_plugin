const PLACEHOLDER = /\$\{[A-Z0-9_]+\}/;
const DEFAULT_BASE_URL = "https://api.dooray.com";

/** 환경 변수 값이 비어 있거나 치환되지 않은 플레이스홀더인지 확인한다. */
export function isUnset(value: string | undefined): boolean {
  if (value === undefined) {
    return true;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 || PLACEHOLDER.test(trimmed);
}

/** MCP 프로세스에서 Dooray API 토큰과 Base URL을 읽는다. */
export function readDoorayConfig(env: NodeJS.ProcessEnv = process.env): {
  token: string;
  baseUrl: string;
} {
  const token = env.DOORAY_API_TOKEN;
  if (isUnset(token)) {
    throw new Error(
      "DOORAY_API_TOKEN이 없습니다. Cursor Plugins → Configure에서 두레이 개인 인증 토큰을 설정하세요. (개인설정 > API > 개인 인증 토큰)",
    );
  }

  const rawBase = env.DOORAY_API_BASE_URL;
  const baseUrl = isUnset(rawBase) ? DEFAULT_BASE_URL : rawBase!.trim().replace(/\/+$/, "");
  return { token: token!.trim(), baseUrl };
}
