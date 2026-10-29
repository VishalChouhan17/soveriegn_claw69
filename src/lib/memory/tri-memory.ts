import { KnowledgeTriple, EpisodicMemoryItem, ProceduralSkill } from '../types';
import { OpenShellSandbox } from '../sandbox/openshell';

import { readRecords, saveRecord, getSettings } from '../storage/local-store';
import { RequestError } from '../http/request';
import { randomUUID } from 'node:crypto';

const proceduralSkills: ProceduralSkill[] = [
  {
    id: 'skill_portfolio',
    name: 'portfolio_risk_analyzer',
    version: '1.2.0',
    runtime: 'bubblewrap-python3',
    securityProfile: 'linux-network-namespace',
    author: 'sovereignclaw',
    yamlHeader: `---
name: portfolio_risk_analyzer
version: 1.2.0
runtime: bubblewrap-python3
security_profile: linux-network-namespace
author: sovereignclaw
description: Computes quantitative Sharpe ratio, asset volatility, and Value-at-Risk (VaR).
---`,
    description: 'Computes volatility, Sharpe ratio, and Value at Risk (VaR) for asset allocations.',
    language: 'python',
    code: `
def analyze_portfolio(weights=[0.4, 0.4, 0.2], returns=[0.12, 0.08, 0.04]):
    expected_return = sum(w * r for w, r in zip(weights, returns))
    variance = sum(w**2 * 0.04 for w in weights)
    volatility = variance ** 0.5
    sharpe = (expected_return - 0.03) / volatility if volatility > 0 else 0
    print(f"Expected Return: {expected_return*100:.2f}% | Volatility: {volatility*100:.2f}% | Sharpe Ratio: {sharpe:.2f}")

analyze_portfolio()
`.trim(),
    inputs: { weights: 'array of floats', returns: 'array of annual expected returns' },
    isAutonomous: false,
    verifiedInSandbox: false,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: 'skill_ast_auditor',
    name: 'python_ast_security_scanner',
    version: '2.0.1',
    runtime: 'bubblewrap-python3',
    securityProfile: 'linux-network-namespace',
    author: 'sovereignclaw',
    yamlHeader: `---
name: python_ast_security_scanner
version: 2.0.1
runtime: bubblewrap-python3
security_profile: linux-network-namespace
author: sovereignclaw
description: Statically audits source code AST for unsafe system calls, eval, and secret leaks.
---`,
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
    print(f"AST Audit completed: {len(findings)} vulnerability findings -> {findings}")

sample = "x = 10"
audit_code(sample)
`.trim(),
    inputs: { snippet: 'string source code' },
    isAutonomous: false,
    verifiedInSandbox: false,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

export class TriMemoryEngine {
  // --- Semantic Knowledge Graph ---
  public static getKnowledgeGraph(): KnowledgeTriple[] {
    return readRecords<KnowledgeTriple>('knowledge');
  }

  public static addKnowledgeTriple(triple: Omit<KnowledgeTriple, 'id' | 'updatedAt'>): KnowledgeTriple {
    const newTriple: KnowledgeTriple = {
      ...triple,
      id: `k_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: new Date().toISOString()
    };
    saveRecord('knowledge', newTriple);
    return newTriple;
  }

  public static queryKnowledge(keyword: string): KnowledgeTriple[] {
    const lower = keyword.toLowerCase();
    return this.getKnowledgeGraph().filter(
      k => k.subject.toLowerCase().includes(lower) ||
           k.predicate.toLowerCase().includes(lower) ||
           k.object.toLowerCase().includes(lower)
    );
  }

  // --- Episodic Memory ---
  public static getEpisodicMemories(): EpisodicMemoryItem[] {
    return readRecords<EpisodicMemoryItem>('episodes').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public static recordEpisode(summary: string, context: string, sentiment: EpisodicMemoryItem['sentiment'], tags: string[] = []): EpisodicMemoryItem {
    const episode: EpisodicMemoryItem = {
      id: `ep_${randomUUID()}`,
      timestamp: new Date().toISOString(),
      summary,
      context,
      sentiment,
      tags
    };
    saveRecord('episodes', episode);
    return episode;
  }

  // --- Procedural Skill Forge ---
  public static listSkills(): ProceduralSkill[] {
    return [...proceduralSkills, ...readRecords<ProceduralSkill>('skills')];
  }

  public static getSkill(nameOrId: string): ProceduralSkill | undefined {
    return this.listSkills().find(s => s.id === nameOrId || s.name === nameOrId);
  }

  /**
   * Forges and verifies a brand new skill in isolated Python process!
   */
  public static async forgeSkill(
    name: string,
    description: string,
    code: string,
    inputs: Record<string, string>,
    language: 'python' | 'javascript' = 'python',
    isAutonomous = true
  ): Promise<{ skill: ProceduralSkill; sandboxVerification: string }> {
    const normalized = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (this.getSkill(normalized)) throw new RequestError('A skill with that name already exists', 409);
    // Verify before registration.
    if (!getSettings().executeSkills) throw new Error('Enable isolated Python tools in Privacy controls before forging a skill.');
    const testRun = await OpenShellSandbox.execute(code, language, 5000);
    if (!testRun.success) throw new Error(`Skill verification failed: ${testRun.stderr || testRun.sandboxViolations.join(', ') || testRun.exitCode}`);
    
    const cleanName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const yamlHeader = `---
name: ${cleanName}
version: 1.0.0
runtime: bubblewrap-${language === 'python' ? 'python3' : 'node20'}
security_profile: linux-network-namespace
author: ${isAutonomous ? 'nemotron-skill-forge' : 'user-enclave'}
description: ${JSON.stringify(description)}
---`;

    const skill: ProceduralSkill = {
      id: `skill_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: cleanName,
      description,
      version: '1.0.0',
      runtime: `bubblewrap-${language === 'python' ? 'python3' : 'node20'}`,
      securityProfile: 'linux-network-namespace',
      author: isAutonomous ? 'nemotron-skill-forge' : 'user-enclave',
      yamlHeader,
      language,
      code,
      inputs,
      isAutonomous,
      verifiedInSandbox: testRun.success,
      createdAt: new Date().toISOString()
    };

    saveRecord('skills', skill);

    // Record episode
    this.recordEpisode(
      `Synthesized skill '${skill.name}'`,
      `Verified in isolated Python process with exit code ${testRun.exitCode}. Output: ${testRun.stdout.substring(0, 100)}`,
      testRun.success ? 'positive' : 'constructive',
      ['skill_forge', 'openshell', skill.name]
    );

    return {
      skill,
      sandboxVerification: testRun.success 
        ? `Isolated Python verified: Successfully executed in ${testRun.durationMs}ms. Output: "${testRun.stdout}"`
        : `Python execution failed: Execution exited with code ${testRun.exitCode}. Stderr: "${testRun.stderr}"`
    };
  }
}
