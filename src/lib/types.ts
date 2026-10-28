export type ModelTier = 
  | 'nemotron-nano'       // Fast, 800+ tok/s: Triage, streaming chat, PII filtering
  | 'nemotron-super'      // Balanced: Intermediate classification and structured tool calls
  | 'nemotron-3-ultra'    // Deep Reasoning: Multi-step DAG planning, complex code generation
  | 'llama-3.1-nemotron-70b'; // Heavyweight open weights fallback

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface NemoClawScanResult {
  isSafe: boolean;
  threatsDetected: string[];
  sanitizedContent: string;
  redactedEntities: Array<{
    type: 'API_KEY' | 'EMAIL' | 'PHONE' | 'TOKEN' | 'SECRET';
    original: string;
    placeholder: string;
  }>;
  injectionConfidence: number; // 0.0 to 1.0
  policyViolations: string[];
}

export interface ApprovalRequest {
  id: string;
  toolName: string;
  riskLevel: RiskLevel;
  description: string;
  parameters: Record<string, unknown>;
  timestamp: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface SandboxExecutionResult {
  executionId: string;
  commandOrCode: string;
  language: 'python' | 'shell' | 'javascript';
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  memoryUsedMb: number;
  cgroupMemoryLimitMb?: number;
  cpuQuotaPct?: number;
  seccompFilterStatus?: string;
  egressPolicy?: string;
  sandboxViolations: string[];
  isolatedPath: string;
  success: boolean;
}

export interface KnowledgeTriple {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  updatedAt: string;
  source: string;
}

export interface EpisodicMemoryItem {
  id: string;
  timestamp: string;
  summary: string;
  context: string;
  sentiment: 'positive' | 'neutral' | 'constructive';
  tags: string[];
}

export interface ProceduralSkill {
  id: string;
  name: string;
  description: string;
  version?: string;
  runtime?: string;
  securityProfile?: string;
  author?: string;
  yamlHeader?: string;
  language: 'python' | 'javascript';
  code: string;
  inputs: Record<string, string>;
  isAutonomous: boolean; // Synthesized by Nemotron during conversation
  verifiedInSandbox: boolean;
  createdAt: string;
}

export interface DAGStep {
  id: string;
  title: string;
  phase: 'PERCEPTION' | 'SECURITY_SCAN' | 'REASONING_DAG' | 'SANDBOX_EXECUTION' | 'MEMORY_UPDATE' | 'RESPONSE';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED_APPROVAL' | 'FAILED';
  modelUsed?: string;
  details?: string;
  durationMs?: number;
  outputPreview?: string;
}

export interface ServerlessJobRecord {
  id: string;
  jobType: 'NIGHTLY_CONSOLIDATION' | 'INBOX_TRIAGE' | 'PROACTIVE_BRIEFING' | 'SKILL_SIMULATION';
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  logs: string[];
  findingsCount: number;
}
