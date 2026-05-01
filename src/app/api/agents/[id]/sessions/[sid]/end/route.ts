import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/store/sessions';
import { summarize, condenseSummary, extractEntities } from '@/lib/llm';
import {
  writeSession,
  updateIndex,
  updateSummary,
  updateLog,
  writeEntities,
} from '@/lib/vault';
import { withAgentLock } from '@/store/locks';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; sid: string } },
) {
  const agentId = params.id;
  const sessionId = params.sid;

  const session = deleteSession(sessionId);
  if (!session) {
    return NextResponse.json({ ok: true, message: 'already ended' });
  }

  if (session.transcript.length === 0) {
    return NextResponse.json({ ok: true, message: 'empty session' });
  }

  const transcriptText = session.transcript
    .map((m) => `**${m.role === 'user' ? 'User' : 'Agent'}:** ${m.content}`)
    .join('\n\n');

  // Run summarization and entity extraction in parallel (outside the lock)
  const [{ summary, bullets }, entities] = await Promise.all([
    summarize(transcriptText),
    extractEntities(transcriptText),
  ]);

  const ended = new Date().toISOString();
  const sessionNumber = session.sessionNumber;

  await withAgentLock(agentId, async () => {
    const filename = await writeSession(agentId, {
      agentId,
      sessionId,
      sessionNumber,
      started: session.started,
      ended,
      messageCount: session.transcript.length,
      summary,
      bullets,
      transcriptText,
    });

    await updateIndex(agentId, sessionId, filename, sessionNumber);
    await updateLog(agentId, sessionNumber, session.started, session.transcript.length, summary);
    await updateSummary(agentId, bullets, condenseSummary);

    if (entities.trim()) {
      await writeEntities(agentId, sessionId, entities);
    }
  });

  return NextResponse.json({ ok: true });
}
