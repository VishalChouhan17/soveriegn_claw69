import { connection } from 'next/server';
import { NemoClawSecurityEngine } from '@/lib/security/nemoclaw';
import { jsonBody, RequestError, errorResponse } from '@/lib/http/request';
export async function GET() {
  await connection();
  return Response.json({ pendingApprovals: NemoClawSecurityEngine.listPendingApprovals(), enclaveActive: false, policyVersion: 'Local heuristic filter v1 (not NVIDIA NemoClaw)' });
}
export async function POST(req: Request) {
  try {
    const { action, id, approved, testPrompt } = await jsonBody(req);
    if (action === 'test_scan') {
      if (typeof testPrompt !== 'string' || testPrompt.length > 8000) throw new RequestError('Test prompt must be a string of at most 8000 characters');
      return Response.json({ scanResult: NemoClawSecurityEngine.scanAndSanitize(testPrompt) });
    }
    if (action === 'resolve_approval') {
      if (typeof id !== 'string' || typeof approved !== 'boolean') throw new RequestError('Review ID and boolean decision required');
      return Response.json({ success: NemoClawSecurityEngine.resolveApproval(id, approved) });
    }
    throw new RequestError('Invalid action');
  } catch(e) { return errorResponse(e); }
}
