import type { GuardFinding, GuardScanResult, GuardSeverity } from "@/lib/trust-pipeline/types";

const BLOCKING: readonly GuardSeverity[] = ["CRITICAL", "HIGH"];

const SECRET_PATTERNS: readonly { id: string; re: RegExp; messageKo: string }[] = [
  { id: "env_read", re: /process\.env|Deno\.env|getenv\(/i, messageKo: "환경변수 접근이 감지됐어요." },
  { id: "secret_literal", re: /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}/i, messageKo: "시크릿 리터럴이 소스에 있어요." },
  { id: "private_key", re: /BEGIN (RSA |OPENSSH )?PRIVATE KEY/, messageKo: "Private key 재료가 포함돼 있어요." },
];

const MALWARE_PATTERNS: readonly { id: string; re: RegExp; messageKo: string }[] = [
  { id: "prod_db", re: /deleteProductionDatabase|drop\s+table|DROP\s+DATABASE/i, messageKo: "프로덕션 파괴 호출이 감지됐어요." },
  { id: "child_process", re: /child_process|execSync|spawnSync/i, messageKo: "호스트 프로세스 실행이 감지됐어요." },
  { id: "eval", re: /\beval\s*\(|new Function\s*\(/, messageKo: "동적 코드 실행이 감지됐어요." },
];

const SUSPICIOUS_DEPS = [
  "event-stream",
  "flatmap-stream",
  "ua-parser-js@0.7.29",
  "node-ipc",
] as const;

const NETWORK_PATTERNS = [
  /https?:\/\/(?!api\.rimvio\.|rimvio\.)[a-z0-9.-]+/i,
  /fetch\s*\(\s*[`'"]https?:\/\//i,
  /new\s+WebSocket/i,
];

function finding(
  scanner: string,
  severity: GuardSeverity,
  messageKo: string,
  evidence?: string,
): GuardFinding {
  return {
    id: `${scanner}:${evidence ?? messageKo}`.slice(0, 80),
    scanner,
    severity,
    messageKo,
    evidence,
  };
}

export function scanCapabilitySource(input: {
  readonly source: string;
  readonly dependencies?: readonly string[];
}): GuardScanResult {
  const findings: GuardFinding[] = [];
  const source = input.source;

  if (!source.trim()) {
    findings.push(finding("schema", "HIGH", "소스가 비어 있어요."));
  }

  for (const rule of SECRET_PATTERNS) {
    if (rule.re.test(source)) {
      findings.push(finding("secret", "CRITICAL", rule.messageKo, rule.id));
    }
  }

  for (const rule of MALWARE_PATTERNS) {
    if (rule.re.test(source)) {
      findings.push(finding("malware", "CRITICAL", rule.messageKo, rule.id));
    }
  }

  if (/require\s*\(\s*['"]fs['"]|from\s+['"]node:fs['"]/.test(source) && /\.\.\//.test(source)) {
    findings.push(finding("sast", "HIGH", "샌드박스 밖 경로 접근이 의심돼요.", "path_escape"));
  }

  for (const dep of input.dependencies ?? []) {
    const lowered = dep.toLowerCase();
    if (SUSPICIOUS_DEPS.some((s) => lowered.includes(s))) {
      findings.push(finding("dependency", "HIGH", `의심 의존성: ${dep}`, dep));
    }
  }

  if (NETWORK_PATTERNS.some((re) => re.test(source))) {
    findings.push(
      finding("permission", "MEDIUM", "선언되지 않은 외부 네트워크 호출이 있어요.", "undeclared_network"),
    );
  }

  if (/bypass|skip.?review/i.test(source)) {
    findings.push(finding("policy", "MEDIUM", "검수 우회 흔적이 있어요.", "bypass"));
  }

  const blocked = findings.some((f) => BLOCKING.includes(f.severity));
  return {
    passed: !blocked,
    blocked,
    findings,
    nextStage: blocked ? null : "sandbox",
  };
}

export function worstSeverity(findings: readonly GuardFinding[]): GuardSeverity | null {
  for (const severity of BLOCKING) {
    if (findings.some((f) => f.severity === severity)) return severity;
  }
  if (findings.some((f) => f.severity === "MEDIUM")) return "MEDIUM";
  if (findings.some((f) => f.severity === "LOW")) return "LOW";
  return null;
}
