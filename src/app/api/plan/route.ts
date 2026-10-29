import { planDay } from '@/lib/tasks/planner';
import { jsonBody, errorResponse } from '@/lib/http/request';
export async function POST(req: Request) {
  try { const b = await jsonBody(req); return Response.json(planDay(new Date(String(b.start)), Number(b.availableMinutes ?? 240))); }
  catch(e) { return errorResponse(e); }
}
