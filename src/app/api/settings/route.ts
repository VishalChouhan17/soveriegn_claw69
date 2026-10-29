import { connection } from 'next/server';
import { getSettings, saveRecord } from '@/lib/storage/local-store';
import { jsonBody, RequestError, errorResponse } from '@/lib/http/request';
export async function GET() { await connection(); return Response.json(getSettings()); }
export async function PATCH(req: Request) {
  try {
    const body = await jsonBody(req); const settings = getSettings();
    for (const key of ['shareMemoryWithModel','executeSkills','backgroundJobs'] as const) {
      if (key in body) { if (typeof body[key] !== 'boolean') throw new RequestError(`${key} must be boolean`); settings[key] = body[key]; }
    }
    return Response.json(saveRecord('settings', settings));
  } catch(e) { return errorResponse(e); }
}
