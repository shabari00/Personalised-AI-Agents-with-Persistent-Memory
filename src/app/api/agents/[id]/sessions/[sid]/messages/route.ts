import { NextRequest } from 'next/server';
import { AGENTS } from '@/agents.config';
import { chatStream } from '@/lib/llm';
import { retrieveContext, formatRagContext } from '@/lib/rag';
import { getSession, appendMessage, setRagSources } from '@/store/sessions';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sid: string } },
) {
  const agentId = params.id;
  const sessionId = params.sid;

  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) {
    return new Response(JSON.stringify({ error: 'Agent not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = getSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { message } = (await req.json()) as { message: string };
  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // RAG: retrieve relevant past session chunks before appending user turn
  const ragResults = await retrieveContext(message.trim(), agentId, 5);
  const ragContext = formatRagContext(ragResults);
  const ragSourceLabels = ragResults.map((r) =>
    r.sessionNumber > 0
      ? `Session ${String(r.sessionNumber).padStart(3, '0')}`
      : r.sessionId,
  );
  setRagSources(sessionId, ragSourceLabels);

  appendMessage(sessionId, 'user', message.trim());

  // Build system prompt: agent persona + vault memory + RAG context
  let systemPrompt = agent.systemPrompt;
  if (session.memoryContext) {
    systemPrompt += `\n\n## Memory from previous sessions:\n${session.memoryContext}`;
  }
  if (ragContext) {
    systemPrompt += `\n\n## Relevant context retrieved from memory:\n${ragContext}`;
  }

  const messages = session.transcript.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  const encoder = new TextEncoder();
  let assistantMessage = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Emit RAG context info as first event (if any sources were used)
        if (ragSourceLabels.length > 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'ctx', sources: ragSourceLabels })}\n\n`,
            ),
          );
        }

        for await (const chunk of chatStream(systemPrompt, messages)) {
          assistantMessage += chunk;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`),
          );
        }

        appendMessage(sessionId, 'assistant', assistantMessage);
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        console.error('[messages] stream error:', err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
