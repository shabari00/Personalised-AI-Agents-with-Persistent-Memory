export interface ActiveSession {
  agentId: string;
  sessionId: string;
  sessionNumber: number;
  started: string;
  memoryContext: string;
  ragSources: string[];
  transcript: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// Persist across Next.js HMR reloads in dev by hanging off globalThis
const g = global as typeof globalThis & { _sessions?: Map<string, ActiveSession> };
if (!g._sessions) g._sessions = new Map<string, ActiveSession>();
const sessions = g._sessions;

export function getSession(sessionId: string): ActiveSession | undefined {
  return sessions.get(sessionId);
}

export function createSession(session: ActiveSession): void {
  sessions.set(session.sessionId, session);
}

export function appendMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.transcript.push({ role, content });
  return true;
}

export function setRagSources(sessionId: string, sources: string[]): void {
  const session = sessions.get(sessionId);
  if (session) session.ragSources = sources;
}

export function deleteSession(sessionId: string): ActiveSession | undefined {
  const session = sessions.get(sessionId);
  sessions.delete(sessionId);
  return session;
}
