import { SovereignAgentOrchestrator } from '@/lib/agent/orchestrator';
import { ModelTier } from '@/lib/types';
import { jsonBody, RequestError, errorResponse } from '@/lib/http/request';
export async function POST(req: Request) {
  try {
    const { prompt, tier = 'nemotron-3-ultra' } = await jsonBody(req);
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 8000) throw new RequestError('Prompt must be 1–8000 characters');
    if (typeof tier !== 'string' || !['nemotron-nano','nemotron-super','nemotron-3-ultra','llama-3.1-nemotron-70b'].includes(tier)) throw new RequestError('Unknown NVIDIA model tier');
    return Response.json(await SovereignAgentOrchestrator.processUserPrompt(prompt, tier as ModelTier));
  } catch (e) { return errorResponse(e); }
}
