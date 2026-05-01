'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AgentConfig } from '@/agents.config';
import type { SessionListItem } from '@/lib/vault';

interface FileAttachment {
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: FileAttachment[];
  ragSources?: string[];
  timestamp?: number;
}

interface Props {
  agent: AgentConfig;
  onBack: () => void;
}

const STORAGE_PREFIX = 'paiap-';

function loadHistory(agentId: string): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${agentId}`);
    return raw ? (JSON.parse(raw) as Message[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(agentId: string, messages: Message[]) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${agentId}`, JSON.stringify(messages));
  } catch {}
}

export default function ChatPanel({ agent, onBack }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionNumber, setSessionNumber] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>(() => loadHistory(agent.id));
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileAttachment[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [pastSessions, setPastSessions] = useState<SessionListItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeRagSources, setActiveRagSources] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const startingRef = useRef(false);
  const endedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) saveHistory(agent.id, messages);
  }, [messages, agent.id]);

  const loadPastSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${agent.id}/sessions`);
      const data = (await res.json()) as { sessions: SessionListItem[] };
      setPastSessions(data.sessions ?? []);
    } catch {}
  }, [agent.id]);

  const startSession = useCallback(async () => {
    if (startingRef.current || sessionStarted) return;
    startingRef.current = true;
    try {
      const res = await fetch(`/api/agents/${agent.id}/sessions`, { method: 'POST' });
      const data = (await res.json()) as {
        sessionId: string;
        sessionNumber: number;
        contextPreview: string;
      };
      setSessionId(data.sessionId);
      setSessionNumber(data.sessionNumber);
      sessionIdRef.current = data.sessionId;
      setSessionStarted(true);
      loadPastSessions();
    } catch (err) {
      console.error('[ChatPanel] startSession failed:', err);
    } finally {
      startingRef.current = false;
    }
  }, [agent.id, sessionStarted, loadPastSessions]);

  // Proper awaitable end — used when clicking Back
  const endSession = useCallback(async (sid: string) => {
    if (endedRef.current) return;
    endedRef.current = true;
    try {
      await fetch(`/api/agents/${agent.id}/sessions/${sid}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        keepalive: true,
      });
    } catch (err) {
      console.error('[ChatPanel] endSession failed:', err);
    }
  }, [agent.id]);

  // Beacon-only fallback for hard page unload
  const endSessionBeacon = useCallback((sid: string) => {
    if (endedRef.current) return;
    endedRef.current = true;
    navigator.sendBeacon(
      `/api/agents/${agent.id}/sessions/${sid}/end`,
      new Blob([JSON.stringify({})], { type: 'application/json' }),
    );
  }, [agent.id]);

  // Back button handler — save first, then navigate
  const handleBack = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (sid && !endedRef.current) {
      setIsSaving(true);
      await endSession(sid);
      setIsSaving(false);
    }
    onBack();
  }, [endSession, onBack]);

  useEffect(() => {
    startSession();
    return () => {
      // On unmount via navigation (not back button), fire beacon as fallback
      const sid = sessionIdRef.current;
      if (sid && !endedRef.current) endSessionBeacon(sid);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onUnload = () => {
      const sid = sessionIdRef.current;
      if (sid && !endedRef.current) endSessionBeacon(sid);
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [endSessionBeacon]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      if (file.type.startsWith('image/')) {
        reader.onload = () => {
          setPendingFiles((prev) => [
            ...prev,
            { name: file.name, type: file.type, size: file.size, dataUrl: reader.result as string },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = () => {
          const text = reader.result as string;
          setPendingFiles((prev) => [
            ...prev,
            { name: file.name, type: file.type, size: file.size },
          ]);
          setInput((prev) =>
            prev ? `${prev}\n\n[File: ${file.name}]\n${text}` : `[File: ${file.name}]\n${text}`,
          );
        };
        reader.readAsText(file);
      }
    });
    e.target.value = '';
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !sessionId || isStreaming) return;

    const userMsg: Message = {
      role: 'user',
      content: text,
      files: pendingFiles.length > 0 ? [...pendingFiles] : undefined,
      timestamp: Date.now(),
    };

    setInput('');
    setPendingFiles([]);
    setActiveRagSources([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '', timestamp: Date.now() }]);
    setIsStreaming(true);

    let capturedSources: string[] = [];

    try {
      const res = await fetch(`/api/agents/${agent.id}/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          const data = part.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data) as
              | { type: 'ctx'; sources: string[] }
              | { text: string };

            if ('type' in parsed && parsed.type === 'ctx') {
              capturedSources = parsed.sources;
              setActiveRagSources(parsed.sources);
            } else if ('text' in parsed) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + parsed.text };
                }
                return updated;
              });
            }
          } catch {}
        }
      }

      if (capturedSources.length > 0) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, ragSources: capturedSources };
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('[ChatPanel] sendMessage error:', err);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          updated[updated.length - 1] = { ...last, content: '_(error — could not reach the agent)_' };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, sessionId, isStreaming, agent.id, pendingFiles]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(`${STORAGE_PREFIX}${agent.id}`);
  };

  const canSend = Boolean(sessionId) && !isStreaming && input.trim().length > 0;
  const sessionLabel = sessionNumber != null ? `Session ${String(sessionNumber).padStart(3, '0')}` : null;

  return (
    <div className="flex h-screen" style={{ background: '#f2f3f8' }}>

      {/* ── Sidebar ─────────────────────────────────────── */}
      {sidebarOpen && (
        <aside
          className="w-60 shrink-0 flex flex-col border-r"
          style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#ffffff' }}
        >
          {/* Sidebar header strip with agent gradient */}
          <div
            className="px-4 py-4 flex items-center justify-between"
            style={{ background: agent.gradient }}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">{agent.icon}</span>
              <div>
                <p
                  className="text-sm font-bold text-white leading-tight"
                  style={{ fontFamily: 'var(--font-heading, Syne)' }}
                >
                  {agent.name}
                </p>
                {sessionLabel && (
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {sessionLabel}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
            >
              ✕
            </button>
          </div>

          {/* Sessions list */}
          <div
            className="px-3 py-2 border-b"
            style={{ borderColor: 'rgba(0,0,0,0.06)' }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'rgba(15,15,26,0.35)' }}
            >
              Past Sessions
            </p>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {/* Current */}
            {sessionLabel && (
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-1 rounded-xl"
                style={{ background: agent.gradientLight }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: '#10b981', boxShadow: '0 0 6px #10b981' }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: agent.color }}>
                    {sessionLabel}
                  </p>
                  <p className="text-[10px]" style={{ color: 'rgba(15,15,26,0.4)' }}>Current</p>
                </div>
              </div>
            )}

            {pastSessions.length === 0 ? (
              <p className="text-[11px] px-4 py-3" style={{ color: 'rgba(15,15,26,0.3)' }}>
                No past sessions yet
              </p>
            ) : (
              pastSessions.map((s) => (
                <div
                  key={s.sessionId}
                  className="flex items-center gap-2.5 px-3 py-2.5 mx-2 my-0.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: 'rgba(15,15,26,0.2)' }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'rgba(15,15,26,0.65)' }}>
                      {s.sessionNumber != null
                        ? `Session ${String(s.sessionNumber).padStart(3, '0')}`
                        : s.sessionId.slice(0, 16)}
                    </p>
                    {s.date && (
                      <p className="text-[10px]" style={{ color: 'rgba(15,15,26,0.35)' }}>{s.date}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      {/* ── Main ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <header
          className="shrink-0 border-b"
          style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#ffffff' }}
        >
          {/* Gradient accent bar */}
          <div className="h-1 w-full" style={{ background: agent.gradient }} />

          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                  style={{ color: 'rgba(15,15,26,0.4)', background: 'rgba(0,0,0,0.04)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                >
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <rect x="1" y="3" width="13" height="1.5" rx="0.75" fill="currentColor" />
                    <rect x="1" y="7" width="13" height="1.5" rx="0.75" fill="currentColor" />
                    <rect x="1" y="11" width="13" height="1.5" rx="0.75" fill="currentColor" />
                  </svg>
                </button>
              )}

              <button
                onClick={handleBack}
                disabled={isSaving}
                className="flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-60"
                style={{ color: 'rgba(15,15,26,0.45)', background: 'rgba(0,0,0,0.04)' }}
                onMouseEnter={(e) => { if (!isSaving) { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.color = '#0f0f1a'; }}}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = 'rgba(15,15,26,0.45)'; }}
              >
                {isSaving ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 13 13" className="animate-spin" fill="none">
                      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 8" />
                    </svg>
                    Saving…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M9 2.5L4.5 7 9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Agents
                  </>
                )}
              </button>

              <div className="w-px h-5" style={{ background: 'rgba(0,0,0,0.1)' }} />

              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: agent.gradient }}
                >
                  {agent.icon}
                </div>
                <div>
                  <p
                    className="font-bold text-sm leading-tight"
                    style={{ fontFamily: 'var(--font-heading, Syne)', color: agent.color }}
                  >
                    {agent.name}
                  </p>
                  {sessionLabel && (
                    <p className="text-[11px] leading-tight" style={{ color: 'rgba(15,15,26,0.4)' }}>
                      {sessionLabel}
                    </p>
                  )}
                </div>
              </div>

              {/* RAG badge */}
              {activeRagSources.length > 0 && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium anim-scale-in"
                  style={{
                    background: agent.gradientLight,
                    color: agent.color,
                    border: `1px solid rgba(${agent.colorRgb},0.25)`,
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M5.5 3v3l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  Memory · {activeRagSources.length} session{activeRagSources.length > 1 ? 's' : ''}
                </div>
              )}
            </div>

            <button
              onClick={clearHistory}
              className="text-xs px-3 py-1.5 rounded-lg border transition-all duration-200"
              style={{ color: 'rgba(15,15,26,0.4)', borderColor: 'rgba(0,0,0,0.1)', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#e11d48'; e.currentTarget.style.borderColor = 'rgba(225,29,72,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(15,15,26,0.4)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; }}
            >
              Clear history
            </button>
          </div>
        </header>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-5 py-8"
          style={{ background: '#f2f3f8' }}
        >
          <div className="max-w-2xl mx-auto space-y-5">
            {messages.length === 0 && (
              <div className="text-center pt-14 anim-fade-in">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5 shadow-lg"
                  style={{ background: agent.gradient }}
                >
                  {agent.icon}
                </div>
                <h3
                  className="text-2xl font-bold mb-2"
                  style={{ fontFamily: 'var(--font-heading, Syne)', color: '#0f0f1a' }}
                >
                  {agent.name}
                  {sessionLabel && (
                    <span className="ml-2 text-base font-normal" style={{ color: 'rgba(15,15,26,0.35)' }}>
                      · {sessionLabel}
                    </span>
                  )}
                </h3>
                <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: 'rgba(15,15,26,0.45)' }}>
                  {agent.description}
                </p>
                {!sessionId && (
                  <p className="text-xs mt-3" style={{ color: 'rgba(15,15,26,0.3)' }}>Starting session…</p>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col anim-msg-in ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 mr-2.5 mt-0.5 shadow-sm"
                      style={{ background: agent.gradient }}
                    >
                      {agent.icon}
                    </div>
                  )}
                  <div
                    className="max-w-[76%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm"
                    style={
                      msg.role === 'user'
                        ? {
                            background: agent.gradient,
                            color: '#ffffff',
                            borderBottomRightRadius: '5px',
                          }
                        : {
                            background: '#ffffff',
                            color: '#0f0f1a',
                            borderBottomLeftRadius: '5px',
                            border: '1px solid rgba(0,0,0,0.07)',
                            whiteSpace: 'pre-wrap',
                          }
                    }
                  >
                    {msg.files && msg.files.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2.5">
                        {msg.files.map((f, fi) =>
                          f.dataUrl ? (
                            <img key={fi} src={f.dataUrl} alt={f.name} className="max-h-36 rounded-lg object-cover" />
                          ) : (
                            <div
                              key={fi}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                              style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}
                            >
                              📄 {f.name}
                            </div>
                          ),
                        )}
                      </div>
                    )}

                    {msg.content || (
                      msg.role === 'assistant' && (
                        <span className="anim-blink" style={{ color: agent.color }}>▌</span>
                      )
                    )}
                  </div>
                </div>

                {/* RAG source tag */}
                {msg.role === 'assistant' && msg.ragSources && msg.ragSources.length > 0 && (
                  <div
                    className="flex items-center gap-1.5 ml-11 mt-1.5 px-2 py-0.5 rounded-md text-[10px]"
                    style={{
                      background: agent.gradientLight,
                      color: agent.color,
                      border: `1px solid rgba(${agent.colorRgb},0.2)`,
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" strokeWidth="1" />
                      <path d="M2.5 4.5h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                    </svg>
                    Used: {msg.ragSources.join(', ')}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div
          className="shrink-0 px-5 py-4 border-t"
          style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#ffffff' }}
        >
          <div className="max-w-2xl mx-auto">
            {/* Pending files */}
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {pendingFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg text-xs"
                    style={{
                      background: agent.gradientLight,
                      border: `1px solid rgba(${agent.colorRgb},0.25)`,
                      color: agent.color,
                    }}
                  >
                    {f.dataUrl ? (
                      <img src={f.dataUrl} alt="" className="w-5 h-5 rounded object-cover" />
                    ) : <span>📄</span>}
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button
                      onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="ml-0.5 px-1 opacity-50 hover:opacity-100 text-base leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              className="flex items-end gap-2 rounded-2xl p-2 border transition-all duration-200"
              style={{ background: '#f8f9fc', borderColor: `rgba(${agent.colorRgb},0.3)` }}
            >
              {/* Attach */}
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
                className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 mb-0.5"
                style={{ color: 'rgba(15,15,26,0.35)', background: 'transparent' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = agent.color;
                  e.currentTarget.style.background = agent.gradientLight;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(15,15,26,0.35)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.5 8.5l-5 5A3.5 3.5 0 013.5 8.5l5.5-5.5A2 2 0 0112 5.5L7 10.5a.5.5 0 01-.707-.707L11 5"
                    stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px';
                }}
                onKeyDown={handleKeyDown}
                placeholder={sessionId ? `Message ${agent.name}… (Enter to send)` : 'Starting session…'}
                disabled={!sessionId || isStreaming}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm leading-relaxed focus:outline-none disabled:opacity-40"
                style={{
                  color: '#0f0f1a',
                  maxHeight: '180px',
                  fontFamily: 'var(--font-body, Space Grotesk, sans-serif)',
                }}
              />

              {/* Send */}
              <button
                onClick={sendMessage}
                disabled={!canSend}
                className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 mb-0.5 disabled:opacity-30"
                style={{ background: canSend ? agent.gradient : 'rgba(0,0,0,0.06)', color: canSend ? '#ffffff' : 'rgba(15,15,26,0.3)' }}
              >
                {isStreaming ? (
                  <span className="w-3 h-3 rounded-sm" style={{ background: 'currentColor', opacity: 0.7 }} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 11.5V2.5M3 6.5L7 2.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>

            <p className="text-center text-[11px] mt-2" style={{ color: 'rgba(15,15,26,0.28)' }}>
              Shift+Enter for new line · conversations saved automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
