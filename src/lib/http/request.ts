export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  const reader = req.body?.getReader();
  if (!reader) throw new RequestError('JSON object required');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 65536) { await reader.cancel(); throw new RequestError('Request exceeds 64 KiB', 413); }
      chunks.push(value);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new RequestError('Invalid JSON'); }
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new RequestError('JSON object required');
    return body;
  } finally { reader.releaseLock(); }
}
export function errorResponse(error: unknown) {
  return Response.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: error instanceof RequestError ? error.status : 500 });
}
