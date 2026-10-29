import { connection } from 'next/server';
import { getSettings, readRecords } from '@/lib/storage/local-store';
export async function GET() {
  await connection();
  return Response.json({ version: 1, exportedAt: new Date().toISOString(), settings: getSettings(), ...Object.fromEntries(['knowledge','episodes','tasks','skills','conversations','jobs','approvals'].map(c => [c,readRecords(c)])) }, { headers: { 'Content-Disposition': 'attachment; filename="sovereignclaw-private-data.json"' } });
}
