import { KnowledgeTriple, EpisodicMemoryItem, ProceduralSkill } from '../types';
import { OpenShellSandbox } from '../sandbox/openshell';

// Persistent in-process cognitive memory store
const knowledgeGraph: KnowledgeTriple[] = [
  {
    id: 'k1',
    subject: 'User',
    predicate: 'participates_in',
    object: 'NVIDIA x Nebius Global AI Hackathon (Personal AI Track)',
    confidence: 0.99,
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    source: 'user_onboarding'
  },
  {
    id: 'k2',
    subject: 'User',
    predicate: 'preferred_models',
    object: 'NVIDIA Nemotron 3 Ultra & Nemotron Nano on Nebius Token Factory',
    confidence: 0.95,
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    source: 'runtime_configuration'
  },
  {
    id: 'k3',
    subject: 'SovereignClaw',
    predicate: 'implements',
    object: 'NVIDIA OpenShell kernel sandbox and NemoClaw zero-trust privacy guardrails',
    confidence: 1.0,
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    source: 'system_architecture'
  },
  {
    id: 'k4',
    subject: 'User',
    predicate: 'priority_focus',
    object: 'High performance edge/cloud sovereign computing with zero data exfiltration',
    confidence: 0.92,
    updatedAt: new Date().toISOString(),
    source: 'inferred_dialogue'
  }
];

const episodicMemory: EpisodicMemoryItem[] = [
  {
    id: 'ep1',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    summary: 'System initialized on Nebius Token Factory infrastructure',
    context: 'Bootstrapped runtime with OpenShell sandbox and NemoClaw policy guardrails.',
    sentiment: 'positive',
    tags: ['initialization', 'infrastructure', 'nebius']
  },
  {
    id: 'ep2',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    summary: 'Prevented indirect prompt injection attack from unverified email source',
    context: 'Blocked attempt to exfiltrate API tokens via fake instruction override.',
    sentiment: 'constructive',
    tags: ['nemoclaw', 'security', 'threat_neutralized']
  }
];

const proceduralSkills: ProceduralSkill[] = [
  {
    id: 'skill_portfolio',
    name: 'portfolio_risk_analyzer',
    description: 'Computes volatility, Sharpe ratio, and Value at Risk (VaR) for asset allocations.',
    language: 'python',
    code: `
def analyze_portfolio(weights=[0.4, 0.4, 0.2], returns=[0.12, 0.08, 0.04]):
    expected_return = sum(w * r for w, r in zip(weights, returns))
    variance = sum(w**2 * 0.04 for w in weights)
    volatility = variance ** 0.5
    sharpe = (expected_return - 0.03) / volatility if volatility > 0 else 0
    print(f"Expected Return: {expected_return*100:.2f}% | Volatility: {volatility*100:.2f}% | Sharpe: {sharpe:.2f}")

analyze_portfolio()
`.trim(),
    inputs: { weights: 'array of floats', returns: 'array of annual expected returns' },
    isAutonomous: false,
    verifiedInSandbox: true,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: 'skill_ast_auditor',
    name: 'python_ast_security_scanner',
    description: 'Parses Python source code to find insecure system calls, hardcoded secrets, and unsafe deserialization.',
    language: 'python',
    code: `
import ast

def audit_code(snippet):
    tree = ast.parse(snippet)
    findings = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and getattr(node.func, 'id', '') in ['eval', 'exec', '__import__']:
            findings.append(f"Dangerous call '{node.func.id}' at line {node.lineno}")
    print(f"Audit completed: {len(findings)} vulnerability findings -> {findings}")

sample = "x = 10\\n# safe code"
audit_code(sample)
`.trim(),
    inputs: { snippet: 'string source code' },
    isAutonomous: false,
    verifiedInSandbox: true,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

export class TriMemoryEngine {
  // --- Semantic Knowledge Graph ---
  public static getKnowledgeGraph(): KnowledgeTriple[] {
    return [...knowledgeGraph];
  }

  public static addKnowledgeTriple(triple: Omit<KnowledgeTriple, 'id' | 'updatedAt'>): KnowledgeTriple {
    const newTriple: KnowledgeTriple = {
      ...triple,
      id: `k_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: new Date().toISOString()
    };
    knowledgeGraph.push(newTriple);
    return newTriple;
  }

  public static queryKnowledge(keyword: string): KnowledgeTriple[] {
    const lower = keyword.toLowerCase();
    return knowledgeGraph.filter(
      k => k.subject.toLowerCase().includes(lower) ||
           k.predicate.toLowerCase().includes(lower) ||
           k.object.toLowerCase().includes(lower)
    );
  }

  // --- Episodic Memory ---
  public static getEpisodicMemories(): EpisodicMemoryItem[] {
    return [...episodicMemory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public static recordEpisode(summary: string, context: string, sentiment: EpisodicMemoryItem['sentiment'], tags: string[] = []): EpisodicMemoryItem {
    const episode: EpisodicMemoryItem = {
      id: `ep_${Date.now()}`,
      timestamp: new Date().toISOString(),
      summary,
      context,
      sentiment,
      tags
    };
    episodicMemory.unshift(episode);
    return episode;
  }

  // --- Procedural Skill Forge ---
  public static listSkills(): ProceduralSkill[] {
    return [...proceduralSkills];
  }

  public static getSkill(nameOrId: string): ProceduralSkill | undefined {
    return proceduralSkills.find(s => s.id === nameOrId || s.name === nameOrId);
  }

  /**
   * Forges and verifies a brand new skill in OpenShell sandbox!
   */
  public static async forgeSkill(
    name: string,
    description: string,
    code: string,
    inputs: Record<string, string>,
    language: 'python' | 'javascript' = 'python',
    isAutonomous = true
  ): Promise<{ skill: ProceduralSkill; sandboxVerification: string }> {
    // 1. First test in OpenShell
    const testRun = await OpenShellSandbox.execute(code, language, 5000);
    
    const skill: ProceduralSkill = {
      id: `skill_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      description,
      language,
      code,
      inputs,
      isAutonomous,
      verifiedInSandbox: testRun.success,
      createdAt: new Date().toISOString()
    };

    proceduralSkills.push(skill);

    // Record episode
    this.recordEpisode(
      `Synthesized skill '${skill.name}'`,
      `Verified in OpenShell sandbox with exit code ${testRun.exitCode}. Output: ${testRun.stdout.substring(0, 100)}`,
      testRun.success ? 'positive' : 'constructive',
      ['skill_forge', 'openshell', skill.name]
    );

    return {
      skill,
      sandboxVerification: testRun.success 
        ? `OpenShell Verified: Successfully executed in ${testRun.durationMs}ms. Output: "${testRun.stdout}"`
        : `OpenShell Warning: Execution exited with code ${testRun.exitCode}. Stderr: "${testRun.stderr}"`
    };
  }
}
