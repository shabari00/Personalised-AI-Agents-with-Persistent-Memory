import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { AGENTS } from '@/agents.config';
import { ensureAgentFolders, loadMemory, listSessions } from '@/lib/vault';
import { createSession } from '@/store/sessions';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const agentId = params.id;

  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  await ensureAgentFolders(agentId);
  const memory = await loadMemory(agentId);

  const sessionId = `${new Date().toISOString().split('T')[0]}-${randomBytes(4).toString('hex')}`;
  const sessionNumber = memory.sessionCount + 1;

  let memoryContext = '';
  if (memory.summary.trim()) {
    memoryContext += `## Long-term memory summary:\n${memory.summary.trim()}\n\n`;
  }
  if (memory.recentSessionSummaries.length > 0) {
    memoryContext += `## Recent sessions:\n${memory.recentSessionSummaries
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n')}\n\n`;
  }

  createSession({
    agentId,
    sessionId,
    sessionNumber,
    started: new Date().toISOString(),
    memoryContext,
    ragSources: [],
    transcript: [],
  });

  const contextPreview =
    memory.sessionCount > 0
      ? `Loaded ${memory.sessionCount} prior session${memory.sessionCount === 1 ? '' : 's'}`
      : 'No prior sessions';

  return NextResponse.json({ sessionId, sessionNumber, contextPreview });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const agentId = params.id;

  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  await ensureAgentFolders(agentId);
  const sessions = await listSessions(agentId);
  return NextResponse.json({ sessions });
}
