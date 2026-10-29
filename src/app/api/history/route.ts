import { connection } from 'next/server';
import { readRecords } from '@/lib/storage/local-store';
export async function GET() {
  await connection();
  const records = readRecords<{ id: string; timestamp: string; prompt: string; response: string; modelUsed: string }>('conversations').sort((a,b) => a.timestamp.localeCompare(b.timestamp)).slice(-50);
  return Response.json({ conversations: records });
}
