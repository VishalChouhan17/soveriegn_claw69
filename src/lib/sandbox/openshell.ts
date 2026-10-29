import { SandboxExecutionResult } from '../types';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// Linux bubblewrap, not an NVIDIA OpenShell integration. Fail closed on unsupported hosts.
export class OpenShellSandbox {
  static async execute(code: string, language: 'python' | 'shell' | 'javascript' = 'python', timeoutMs = 8000): Promise<SandboxExecutionResult> {
    const start = Date.now();
    const dir = mkdtempSync(join(tmpdir(), 'sovereign-skill-'));
    const result: SandboxExecutionResult = { executionId: randomUUID(), commandOrCode: code, language,
      stdout: '', stderr: '', exitCode: 1, durationMs: 0, memoryUsedMb: 0,
      sandboxViolations: [], isolatedPath: dir, success: false };
    if (language !== 'python' || code.length > 32768) {
      rmSync(dir, { recursive: true, force: true });
      return { ...result, stderr: 'Only Python skills up to 32 KiB are supported.' };
    }
    writeFileSync(join(dir, 'script.py'), code, { mode: 0o600 });
    const runner = 'import resource, runpy\nresource.setrlimit(resource.RLIMIT_AS,(268435456,268435456))\nresource.setrlimit(resource.RLIMIT_CPU,(3,3))\nresource.setrlimit(resource.RLIMIT_FSIZE,(1048576,1048576))\nresource.setrlimit(resource.RLIMIT_NOFILE,(64,64))\nresource.setrlimit(resource.RLIMIT_NPROC,(16,16))\nrunpy.run_path("/work/script.py",run_name="__main__")';
    return new Promise(resolve => {
      let finished = false;
      const child = spawn('bwrap', ['--unshare-all', '--new-session', '--die-with-parent', '--cap-drop', 'ALL',
        '--clearenv', '--setenv', 'PATH', '/usr/bin:/bin', '--setenv', 'PYTHONUNBUFFERED', '1',
        '--ro-bind', '/usr', '/usr', '--ro-bind', '/lib', '/lib', '--ro-bind', '/lib64', '/lib64',
        '--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp', '--ro-bind', dir, '/work', '--chdir', '/work',
        '/usr/bin/python3', '-I', '-c', runner], { env: { PATH: '/usr/bin:/bin', NODE_ENV: 'test' }, detached: true });
      const kill = () => { try { if (child.pid) process.kill(-child.pid, 'SIGKILL'); } catch { /* exited */ } };
      const timer = setTimeout(() => { result.sandboxViolations.push('Execution timeout'); kill(); }, Math.min(timeoutMs, 8000));
      const finish = (code: number) => {
        if (finished) return;
        finished = true; clearTimeout(timer); rmSync(dir, { recursive: true, force: true });
        resolve({ ...result, exitCode: code, durationMs: Date.now() - start,
          success: code === 0 && !result.sandboxViolations.length });
      };
      for (const stream of ['stdout', 'stderr'] as const) child[stream].on('data', data => {
        result[stream] += data.toString();
        if (result.stdout.length + result.stderr.length > 65536) {
          result.stdout = result.stdout.slice(0, 32768); result.stderr = result.stderr.slice(0, 32768);
          result.sandboxViolations.push('Output limit exceeded'); kill();
        }
      });
      child.on('error', () => { result.stderr = 'Network-isolated executor unavailable. Install bubblewrap and system Python; execution was refused.'; finish(127); });
      child.on('close', code => finish(code ?? 1));
    });
  }
}
