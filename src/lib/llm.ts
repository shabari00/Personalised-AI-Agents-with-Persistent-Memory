import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.',
    );
  }
  return new Anthropic({ apiKey });
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function* chatStream(
  systemPrompt: string,
  messages: ChatMessage[],
): AsyncGenerator<string, void, unknown> {
  const client = getClient();

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}

export interface SummarizationResult {
  summary: string;
  bullets: string[];
}

export async function summarize(transcript: string): Promise<SummarizationResult> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          'Here is a conversation transcript:\n\n',
          transcript,
          '\n\nSummarize this session in one paragraph. Then list new facts, preferences, or decisions worth remembering as bullet points.',
          '\n\nReply in exactly this format:\nSUMMARY:\n<one paragraph>\n\nBULLETS:\n- <item>\n- <item>',
        ].join(''),
      },
    ],
  });

  const text =
    response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? '';

  const summaryMatch = text.match(/SUMMARY:\n([\s\S]*?)(?=\n\nBULLETS:|$)/);
  const bulletsMatch = text.match(/BULLETS:\n([\s\S]*)/);

  const summary = summaryMatch?.[1]?.trim() ?? text.trim();
  const bulletsText = bulletsMatch?.[1]?.trim() ?? '';
  const bullets = bulletsText
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);

  return { summary, bullets };
}

export async function condenseSummary(text: string): Promise<string> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Rewrite the following summary more concisely while preserving all key facts and bullet points:\n\n${text}`,
      },
    ],
  });

  return (
    response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? text
  );
}

export async function extractEntities(transcript: string): Promise<string> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          'Extract key entities from this conversation transcript.',
          'Identify: people, projects, companies, goals, preferences, and important concepts mentioned.',
          'Format as a structured markdown list grouped by category.',
          '\n\nTranscript:\n',
          transcript,
        ].join(''),
      },
    ],
  });

  return (
    response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text ?? ''
  );
}
