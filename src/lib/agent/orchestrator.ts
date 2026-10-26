import { DAGStep, ModelTier, RiskLevel } from '../types';
import { NemoClawSecurityEngine } from '../security/nemoclaw';
import { OpenShellSandbox } from '../sandbox/openshell';
import { TriMemoryEngine } from '../memory/tri-memory';
import { NebiusTokenFactoryClient } from '../nebius/token-factory';

export interface OrchestrationResult {
  finalResponse: string;
  dagSteps: DAGStep[];
  securityStatus: {
    isSafe: boolean;
    threats: string[];
    redactedCount: number;
    injectionScore: number;
  };
  modelUsed: string;
  sandboxExecution?: {
    success: boolean;
    stdout: string;
    durationMs: number;
  };
  approvalRequired?: {
    requestId: string;
    description: string;
    riskLevel: RiskLevel;
  };
}

export class SovereignAgentOrchestrator {
  public static async processUserPrompt(
    prompt: string,
    preferredTier: ModelTier = 'nemotron-3-ultra'
  ): Promise<OrchestrationResult> {
    const dagSteps: DAGStep[] = [];

    // --- STEP 1: Perception & NemoClaw Security Scan ---
    const scanStepId = 'step_1_nemoclaw';
    dagSteps.push({
      id: scanStepId,
      title: 'NemoClaw Threat & Privacy Scan',
      phase: 'SECURITY_SCAN',
      status: 'IN_PROGRESS',
      details: 'Analyzing input buffer for prompt injections, evasion payloads, and secret exfiltration tokens...'
    });

    const scanResult = NemoClawSecurityEngine.scanAndSanitize(prompt);

    if (!scanResult.isSafe) {
      // Prompt injection or threat detected
      dagSteps[0].status = 'COMPLETED';
      dagSteps[0].details = `Threats neutralized: ${scanResult.threatsDetected.join(', ')}`;
      dagSteps[0].outputPreview = `Injection Confidence: ${(scanResult.injectionConfidence * 100).toFixed(1)}%`;

      const blockedStep: DAGStep = {
        id: 'step_blocked',
        title: 'Execution Quarantined by NemoClaw',
        phase: 'RESPONSE',
        status: 'COMPLETED',
        details: 'Untrusted prompt injection attempt intercepted before reaching model inference.'
      };
      dagSteps.push(blockedStep);

      // Record episodic memory of attack defense
      TriMemoryEngine.recordEpisode(
        'Intercepted malicious prompt injection',
        `Threat signatures: ${scanResult.threatsDetected.join(' | ')}`,
        'constructive',
        ['threat_blocked', 'nemoclaw']
      );

      return {
        finalResponse: `🛡️ **[NVIDIA NemoClaw Security Alert: Threat Intercepted]**\n\nThe input was quarantined due to detected prompt injection or policy violations:\n• ${scanResult.threatsDetected.join('\n• ')}\n\n*Your local data enclave and personal systems remain completely protected.*`,
        dagSteps,
        securityStatus: {
          isSafe: false,
          threats: scanResult.threatsDetected,
          redactedCount: scanResult.redactedEntities.length,
          injectionScore: scanResult.injectionConfidence
        },
        modelUsed: 'NemoClaw Edge Guardrail Shield'
      };
    }

    dagSteps[0].status = 'COMPLETED';
    dagSteps[0].details = `Zero malicious patterns detected. Redacted ${scanResult.redactedEntities.length} private entities.`;

    // --- STEP 2: Contextual Tri-Memory Retrieval ---
    const memStepId = 'step_2_memory';
    dagSteps.push({
      id: memStepId,
      title: 'Tri-Memory Graph Traversal',
      phase: 'PERCEPTION',
      status: 'IN_PROGRESS',
      details: 'Querying semantic triples and past episodic history...'
    });

    const relevantKnowledge = TriMemoryEngine.queryKnowledge(prompt.split(' ')[0] || 'User');
    dagSteps[1].status = 'COMPLETED';
    dagSteps[1].details = `Retrieved ${relevantKnowledge.length} knowledge triples from local personal graph.`;

    // --- STEP 3: Multi-Step Reasoning & DAG Synthesis (Nebius Token Factory) ---
    const reasonStepId = 'step_3_reasoning';
    dagSteps.push({
      id: reasonStepId,
      title: 'Nemotron Multi-Step Reasoning DAG',
      phase: 'REASONING_DAG',
      status: 'IN_PROGRESS',
      modelUsed: preferredTier,
      details: 'Formulating structured execution graph and evaluating tool dependencies...'
    });

    // Check if this involves a procedural skill execution
    let sandboxResult = undefined;
    const lower = prompt.toLowerCase();

    if (lower.includes('portfolio') || lower.includes('sharpe') || lower.includes('volatility')) {
      const skill = TriMemoryEngine.getSkill('portfolio_risk_analyzer');
      if (skill) {
        dagSteps.push({
          id: 'step_4_sandbox',
          title: 'OpenShell Isolated Kernel Execution',
          phase: 'SANDBOX_EXECUTION',
          status: 'IN_PROGRESS',
          details: `Executing skill '${skill.name}' in temporary isolated container...`
        });

        sandboxResult = await OpenShellSandbox.execute(skill.code, skill.language, 6000);
        
        const sandboxStep = dagSteps[dagSteps.length - 1];
        sandboxStep.status = sandboxResult.success ? 'COMPLETED' : 'FAILED';
        sandboxStep.details = `OpenShell duration: ${sandboxResult.durationMs}ms | RAM: ${sandboxResult.memoryUsedMb}MB | Exit code: ${sandboxResult.exitCode}`;
        sandboxStep.outputPreview = sandboxResult.stdout || sandboxResult.stderr;
      }
    } else if (lower.includes('scan code') || lower.includes('audit')) {
      const skill = TriMemoryEngine.getSkill('python_ast_security_scanner');
      if (skill) {
        dagSteps.push({
          id: 'step_4_sandbox',
          title: 'OpenShell AST Audit Execution',
          phase: 'SANDBOX_EXECUTION',
          status: 'IN_PROGRESS',
          details: `Executing AST scanner in isolated OpenShell sandbox...`
        });

        sandboxResult = await OpenShellSandbox.execute(skill.code, skill.language, 6000);
        const sandboxStep = dagSteps[dagSteps.length - 1];
        sandboxStep.status = sandboxResult.success ? 'COMPLETED' : 'FAILED';
        sandboxStep.details = `Sandbox execution completed in ${sandboxResult.durationMs}ms`;
        sandboxStep.outputPreview = sandboxResult.stdout;
      }
    }

    // Invoke Nebius Token Factory for conversational synthesis
    const generation = await NebiusTokenFactoryClient.generateResponse(scanResult.sanitizedContent, {
      modelTier: preferredTier
    });

    dagSteps[2].status = 'COMPLETED';
    dagSteps[2].details = `Synthesized reasoning plan in ${generation.latencyMs}ms using ${generation.modelUsed}`;

    // --- STEP 5: Memory Update & Final Response Synthesis ---
    dagSteps.push({
      id: 'step_5_memory_update',
      title: 'Procedural Episode & Graph Consolidation',
      phase: 'MEMORY_UPDATE',
      status: 'COMPLETED',
      details: 'Committed interaction to episodic memory and updated user affinity score.'
    });

    TriMemoryEngine.recordEpisode(
      `Processed task: "${prompt.substring(0, 60)}..."`,
      `Executed via ${generation.modelUsed}. OpenShell active: ${Boolean(sandboxResult)}`,
      'positive',
      ['task_execution', preferredTier]
    );

    // Unmask local enclave secrets if any were embedded
    const unmaskedResponse = NemoClawSecurityEngine.unmaskEnclaveContent(generation.text);

    return {
      finalResponse: unmaskedResponse,
      dagSteps,
      securityStatus: {
        isSafe: true,
        threats: [],
        redactedCount: scanResult.redactedEntities.length,
        injectionScore: scanResult.injectionConfidence
      },
      modelUsed: generation.modelUsed,
      sandboxExecution: sandboxResult ? {
        success: sandboxResult.success,
        stdout: sandboxResult.stdout,
        durationMs: sandboxResult.durationMs
      } : undefined
    };
  }
}
