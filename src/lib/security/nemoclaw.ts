import { NemoClawScanResult, RiskLevel, ApprovalRequest } from '../types';

// In-memory enclave store for redacted private secrets that never leave the device
const privateEnclaveStore = new Map<string, string>();
const pendingApprovals = new Map<string, ApprovalRequest>();

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /system\s+override/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /bypass\s+(safety|security)\s+filters/i,
  /print\s+(all\s+)?env(ironment)?\s+variables/i,
  /exfiltrate/i,
  /steal\s+token/i,
  /drop\s+table/i,
  /rm\s+-rf\s+\//i,
  /cat\s+\/etc\/shadow/i,
  /curl\s+-X\s+POST\s+-d\s+@/i
];

const PII_PATTERNS: Array<{ type: 'API_KEY' | 'EMAIL' | 'TOKEN' | 'SECRET'; regex: RegExp }> = [
  { type: 'API_KEY', regex: /(?:nebius|nvapi|sk|ghp|gho|xoxb|aws_key)_[a-zA-Z0-9_\-]{16,64}/g },
  { type: 'TOKEN', regex: /Bearer\s+([a-zA-Z0-9\-\._~\+\/]+=*)/g },
  { type: 'EMAIL', regex: /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g }
];

export class NemoClawSecurityEngine {
  /**
   * Scans untrusted input (user prompt, incoming email, scraped web page)
   * for prompt injections, malicious payloads, and PII that must be redacted.
   */
  public static scanAndSanitize(input: string): NemoClawScanResult {
    const threats: string[] = [];
    const policyViolations: string[] = [];
    let injectionConfidence = 0.0;

    // 1. Prompt Injection & Jailbreak check
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        threats.push(`Prompt Injection Pattern matched: ${pattern.source}`);
        injectionConfidence = Math.min(1.0, injectionConfidence + 0.45);
      }
    }

    // Check for abnormal control characters or hidden evasion
    if (/[\u200B-\u200D\uFEFF]/.test(input)) {
      threats.push('Zero-width evasion characters detected in text buffer');
      injectionConfidence = Math.min(1.0, injectionConfidence + 0.3);
    }

    // 2. Egress PII & Secret Redaction (Keep secrets in local enclave)
    let sanitizedContent = input;
    const redactedEntities: NemoClawScanResult['redactedEntities'] = [];

    for (const { type, regex } of PII_PATTERNS) {
      sanitizedContent = sanitizedContent.replace(regex, (match) => {
        const secretId = `[ENCLAVE_${type}_${Math.random().toString(36).substring(2, 8).toUpperCase()}]`;
        privateEnclaveStore.set(secretId, match);
        redactedEntities.push({
          type,
          original: match.replace(/.(?=.{4})/g, '*'), // Masked representation for audit
          placeholder: secretId
        });
        return secretId;
      });
    }

    const isSafe = threats.length === 0 && injectionConfidence < 0.4;
    if (!isSafe) {
      policyViolations.push('NVIDIA NemoClaw Policy NC-01: Untrusted instruction stream rejected or sandboxed');
    }

    return {
      isSafe,
      threatsDetected: threats,
      sanitizedContent,
      redactedEntities,
      injectionConfidence,
      policyViolations
    };
  }

  /**
   * Unmasks redacted secrets safely on return when rendering locally
   */
  public static unmaskEnclaveContent(text: string): string {
    let result = text;
    for (const [placeholder, realSecret] of privateEnclaveStore.entries()) {
      result = result.replaceAll(placeholder, realSecret);
    }
    return result;
  }

  /**
   * Assesses risk of an agent action before execution
   */
  public static assessActionRisk(toolName: string, parameters: Record<string, unknown>): {
    riskLevel: RiskLevel;
    requiresApproval: boolean;
    reason: string;
  } {
    const sensitiveTools = ['execute_shell', 'write_file', 'delete_file', 'send_email', 'deploy_cloud_service'];
    
    if (toolName === 'delete_file' || toolName === 'execute_shell') {
      const cmd = String(parameters.command || parameters.code || '');
      if (/rm\s+-rf|del\s+\/f|format|shutdown/i.test(cmd)) {
        return {
          riskLevel: 'CRITICAL',
          requiresApproval: true,
          reason: 'Attempting destructive file or system-level command'
        };
      }
      return {
        riskLevel: 'HIGH',
        requiresApproval: true,
        reason: 'Executing arbitrary shell or script in host environment'
      };
    }

    if (sensitiveTools.includes(toolName)) {
      return {
        riskLevel: 'MEDIUM',
        requiresApproval: true,
        reason: `Invoking persistent action tool: ${toolName}`
      };
    }

    return {
      riskLevel: 'LOW',
      requiresApproval: false,
      reason: 'Safe query or localized compute action'
    };
  }

  /**
   * Creates an approval request gate
   */
  public static createApprovalGate(toolName: string, riskLevel: RiskLevel, description: string, parameters: Record<string, unknown>): ApprovalRequest {
    const request: ApprovalRequest = {
      id: `appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      toolName,
      riskLevel,
      description,
      parameters,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };
    pendingApprovals.set(request.id, request);
    return request;
  }

  public static getApprovalRequest(id: string): ApprovalRequest | undefined {
    return pendingApprovals.get(id);
  }

  public static listPendingApprovals(): ApprovalRequest[] {
    return Array.from(pendingApprovals.values()).filter(a => a.status === 'PENDING');
  }

  public static resolveApproval(id: string, approved: boolean): boolean {
    const req = pendingApprovals.get(id);
    if (!req) return false;
    req.status = approved ? 'APPROVED' : 'REJECTED';
    return true;
  }
}
