'use client';

import { useState } from 'react';
import { AGENTS, type AgentConfig } from '@/agents.config';
import LandingPage from './LandingPage';
import ChatPanel from './ChatPanel';

export default function AppShell() {
  const [activeAgent, setActiveAgent] = useState<AgentConfig | null>(null);

  if (activeAgent) {
    return (
      <ChatPanel
        agent={activeAgent}
        onBack={() => setActiveAgent(null)}
      />
    );
  }

  return <LandingPage agents={AGENTS} onSelect={setActiveAgent} />;
}
