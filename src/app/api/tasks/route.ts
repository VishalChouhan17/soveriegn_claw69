import { connection } from 'next/server';
import { listTasks, createTask, updateTask, deleteTask } from '@/lib/tasks/planner';
import { jsonBody, errorResponse } from '@/lib/http/request';
export async function GET() { await connection(); return Response.json({ tasks: listTasks() }); }
export async function POST(req: Request) { try { return Response.json({ task: createTask(await jsonBody(req)) }); } catch(e) { return errorResponse(e); } }
export async function PATCH(req: Request) { try { return Response.json({ task: updateTask(await jsonBody(req)) }); } catch(e) { return errorResponse(e); } }
export async function DELETE(req: Request) { try { deleteTask((await jsonBody(req)).id); return Response.json({ success: true }); } catch(e) { return errorResponse(e); } }
