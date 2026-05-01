'use client';

import { useState } from 'react';
import type { AgentConfig } from '@/agents.config';

interface Props {
  agents: AgentConfig[];
  onSelect: (agent: AgentConfig) => void;
}

export default function LandingPage({ agents, onSelect }: Props) {
  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100dvh', background: '#f0f1f7' }}>

      {/* ── Top bar ─────────────────────────────────────── */}
      <header
        className="shrink-0 flex items-center justify-between px-6 border-b"
        style={{
          height: '56px',
          background: 'rgba(240,241,247,0.95)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(0,0,0,0.07)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}
          >
            P
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight leading-tight"
              style={{ fontFamily: 'var(--font-heading,Syne)', color: '#0f0f1a' }}>
              Personalised AI Agents
              <span className="font-normal ml-1" style={{ color: 'rgba(15,15,26,0.4)' }}>
                with Persistence Memory
              </span>
            </p>
            <p className="text-[11px] tracking-widest uppercase font-semibold"
              style={{ color: 'rgba(15,15,26,0.4)', letterSpacing: '0.08em' }}>
              Applied AI for Managers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
            style={{ boxShadow: '0 0 6px #10b981' }} />
          Persistent Memory Active
        </div>
      </header>

      {/* ── Agent grid ──────────────────────────────────── */}
      <main className="flex-1 min-h-0 p-3 w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full">
          {agents.map((agent, i) => (
            <AgentCard key={agent.id} agent={agent} index={i} onClick={() => onSelect(agent)} />
          ))}
        </div>
      </main>
    </div>
  );
}

/* ─── SVG Illustrations (decorative overlays) ─────────── */

function AcademicsIllustration() {
  return (
    <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%' }}>
      {/* Open book */}
      <g opacity="0.9" className="anim-float" style={{ transformOrigin: '200px 150px' }}>
        <path d="M120 180 Q200 155 280 180 L280 240 Q200 215 120 240 Z" fill="rgba(255,255,255,0.18)" />
        <path d="M200 155 L200 240" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
        <path d="M120 180 Q200 155 280 180" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" />
        <line x1="130" y1="193" x2="194" y2="185" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="130" y1="202" x2="194" y2="194" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="130" y1="211" x2="194" y2="203" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="206" y1="185" x2="270" y2="193" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="206" y1="194" x2="270" y2="202" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="206" y1="203" x2="270" y2="211" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round" />
        {/* Stacked books below */}
        <rect x="110" y="240" width="180" height="20" rx="4" fill="rgba(255,255,255,0.15)" />
        <rect x="118" y="258" width="164" height="18" rx="4" fill="rgba(255,255,255,0.12)" />
      </g>
      {/* Graduation cap */}
      <g className="anim-float-slow" style={{ transformOrigin: '200px 100px', animationDelay: '0.5s' }}>
        <polygon points="160,105 200,80 240,105 200,130" fill="rgba(255,255,255,0.3)" />
        <rect x="196" y="105" width="8" height="3" fill="rgba(255,255,255,0.5)" />
        <line x1="235" y1="105" x2="235" y2="125" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="235" cy="127" r="4" fill="rgba(255,255,255,0.4)" />
      </g>
      {/* Floating math symbols */}
      <text x="48" y="130" fill="rgba(255,255,255,0.5)" fontSize="32" fontFamily="serif" className="anim-float-slow" style={{ animationDelay: '0.8s' }}>∑</text>
      <text x="320" y="110" fill="rgba(255,255,255,0.4)" fontSize="26" fontFamily="serif" className="anim-float-slow" style={{ animationDelay: '1.4s' }}>π</text>
      <text x="55" y="230" fill="rgba(255,255,255,0.35)" fontSize="22" fontFamily="serif" className="anim-float-slow" style={{ animationDelay: '1s' }}>∫</text>
      <text x="310" y="200" fill="rgba(255,255,255,0.38)" fontSize="18" fontFamily="serif" className="anim-float-slow" style={{ animationDelay: '1.9s' }}>E=mc²</text>
      {/* Stars */}
      {[[60,70],[340,80],[40,270],[360,250]].map(([x,y],i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <circle r="3" fill="rgba(255,255,255,0.55)" />
          <line x1="-7" y1="0" x2="7" y2="0" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="0" y1="-7" x2="0" y2="7" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        </g>
      ))}
    </svg>
  );
}

function FinanceIllustration() {
  return (
    <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%' }}>
      {/* Rising bar chart */}
      <g className="anim-float" style={{ transformOrigin: '200px 180px' }}>
        <rect x="70" y="200" width="40" height="65" rx="6" fill="rgba(255,255,255,0.18)" />
        <rect x="125" y="168" width="40" height="97" rx="6" fill="rgba(255,255,255,0.24)" />
        <rect x="180" y="138" width="40" height="127" rx="6" fill="rgba(255,255,255,0.3)" />
        <rect x="235" y="100" width="40" height="165" rx="6" fill="rgba(255,255,255,0.38)" />
        <rect x="290" y="68" width="40" height="197" rx="6" fill="rgba(255,255,255,0.46)" />
        <line x1="58" y1="265" x2="345" y2="265" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
        {/* Trend line */}
        <polyline points="90,212 145,180 200,150 255,112 310,80"
          stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {[[90,212],[145,180],[200,150],[255,112],[310,80]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="white" fillOpacity="0.9" />
        ))}
        {/* Up arrow */}
        <path d="M328 62 L340 48 L352 62" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="340" y1="48" x2="340" y2="75" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      {/* Coin */}
      <g className="anim-float-slow" style={{ animationDelay: '0.5s', transformOrigin: '62px 100px' }}>
        <circle cx="62" cy="100" r="28" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
        <circle cx="62" cy="100" r="18" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        <text x="54" y="106" fill="rgba(255,255,255,0.65)" fontSize="16" fontWeight="bold">$</text>
      </g>
      {/* Percent badge */}
      <g className="anim-float-slow" style={{ animationDelay: '1.2s', transformOrigin: '355px 80px' }}>
        <circle cx="355" cy="80" r="22" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
        <text x="346" y="87" fill="rgba(255,255,255,0.6)" fontSize="14" fontWeight="bold">%</text>
      </g>
      {[[50,240],[370,200],[200,30]].map(([x,y],i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <circle r="3" fill="rgba(255,255,255,0.6)" />
          <line x1="-6" y1="0" x2="6" y2="0" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <line x1="0" y1="-6" x2="0" y2="6" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        </g>
      ))}
    </svg>
  );
}

function LifestyleIllustration() {
  return (
    <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%' }}>
      {/* Sun / mandala center */}
      <g className="anim-float" style={{ transformOrigin: '200px 155px' }}>
        <circle cx="200" cy="155" r="60" fill="rgba(255,255,255,0.12)" />
        <circle cx="200" cy="155" r="40" fill="rgba(255,255,255,0.18)" />
        <circle cx="200" cy="155" r="20" fill="rgba(255,255,255,0.32)" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          return (
            <line key={i}
              x1={200 + Math.cos(angle) * 65} y1={155 + Math.sin(angle) * 65}
              x2={200 + Math.cos(angle) * 88} y2={155 + Math.sin(angle) * 88}
              stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" />
          );
        })}
      </g>
      {/* Heart */}
      <g className="anim-float-slow" style={{ animationDelay: '0.6s', transformOrigin: '200px 68px' }}>
        <path d="M200 80 C194 70 180 65 175 74 C170 83 175 93 200 106 C225 93 230 83 225 74 C220 65 206 70 200 80 Z"
          fill="rgba(255,255,255,0.5)" />
      </g>
      {/* Leaves */}
      <g className="anim-float-slow" style={{ animationDelay: '0.3s', transformOrigin: '80px 210px' }}>
        <path d="M80 210 Q55 188 66 158 Q94 172 80 210 Z" fill="rgba(255,255,255,0.32)" />
        <path d="M80 210 Q105 188 94 158 Q66 172 80 210 Z" fill="rgba(255,255,255,0.22)" />
        <line x1="80" y1="210" x2="80" y2="163" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <g className="anim-float-slow" style={{ animationDelay: '1.1s', transformOrigin: '320px 200px' }}>
        <path d="M320 200 Q298 180 308 153 Q334 164 320 200 Z" fill="rgba(255,255,255,0.28)" />
        <path d="M320 200 Q342 180 332 153 Q306 164 320 200 Z" fill="rgba(255,255,255,0.2)" />
        <line x1="320" y1="200" x2="320" y2="157" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      {/* Sparkles */}
      {[[55,85],[350,90],[48,270],[355,270],[200,258]].map(([x,y],i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <path d="M0,-7 L1.7,-1.7 L7,0 L1.7,1.7 L0,7 L-1.7,1.7 L-7,0 L-1.7,-1.7 Z"
            fill="rgba(255,255,255,0.55)" />
        </g>
      ))}
      {/* Wave */}
      <path d="M40 275 Q100 258 160 268 Q220 278 280 262 Q330 250 365 265"
        stroke="rgba(255,255,255,0.28)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function ResearchIllustration() {
  const nodes: [number, number][] = [
    [200, 145], [128, 98], [272, 98], [78, 178], [322, 178],
    [128, 230], [272, 230], [200, 62],
  ];
  const edges: [number, number][] = [
    [0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,2],[1,3],[2,4],[3,5],[4,6],[1,7],[2,7],
  ];
  return (
    <svg viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%' }}>
      <g className="anim-float" style={{ transformOrigin: '200px 145px' }}>
        {edges.map(([a,b],i) => (
          <line key={i}
            x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}
            stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
        ))}
        {nodes.map(([x,y],i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={i===0?22:13}
              fill={i===0?'rgba(255,255,255,0.38)':'rgba(255,255,255,0.22)'} />
            <circle cx={x} cy={y} r={i===0?12:6}
              fill={i===0?'rgba(255,255,255,0.72)':'rgba(255,255,255,0.5)'} />
          </g>
        ))}
      </g>
      {/* Magnifying glass */}
      <g className="anim-float-slow" style={{ animationDelay: '0.7s', transformOrigin: '330px 62px' }}>
        <circle cx="330" cy="62" r="26" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" fill="rgba(255,255,255,0.1)" />
        <circle cx="330" cy="62" r="16" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        <line x1="349" y1="81" x2="368" y2="100" stroke="rgba(255,255,255,0.6)" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      {/* DNA */}
      <g className="anim-float-slow" style={{ animationDelay: '1.2s', transformOrigin: '58px 148px' }}>
        {[0,1,2,3,4].map(i => (
          <g key={i}>
            <line x1="42" y1={105+i*18} x2="74" y2={113+i*18} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="42" cy={105+i*18} r="4.5" fill="rgba(255,255,255,0.42)" />
            <circle cx="74" cy={113+i*18} r="4.5" fill="rgba(255,255,255,0.35)" />
          </g>
        ))}
      </g>
      {/* Data scatter */}
      {[[230,258],[258,248],[280,262],[302,250],[326,256]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="4.5" fill="rgba(255,255,255,0.42)" />
      ))}
      <polyline points="230,258 258,248 280,262 302,250 326,256"
        stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {[[370,220],[48,258],[200,285]].map(([x,y],i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <path d="M0,-6 L1.5,-1.5 L6,0 L1.5,1.5 L0,6 L-1.5,1.5 L-6,0 L-1.5,-1.5 Z"
            fill="rgba(255,255,255,0.5)" />
        </g>
      ))}
    </svg>
  );
}

const ILLUSTRATIONS: Record<string, () => JSX.Element> = {
  'agent-1': AcademicsIllustration,
  'agent-2': FinanceIllustration,
  'agent-3': LifestyleIllustration,
  'agent-4': ResearchIllustration,
};

/* ─── Agent Card ─────────────────────────────────────────────── */

function AgentCard({ agent, index, onClick }: {
  agent: AgentConfig;
  index: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Illustration = ILLUSTRATIONS[agent.id];

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="anim-fade-up relative overflow-hidden rounded-2xl text-left w-full h-full"
      style={{
        animationDelay: `${index * 0.07}s`,
        background: agent.gradient,
        transform: hovered ? 'translateY(-4px) scale(1.015)' : 'translateY(0) scale(1)',
        boxShadow: hovered
          ? `0 24px 60px rgba(${agent.colorRgb},0.45), 0 0 0 1px rgba(255,255,255,0.15) inset`
          : `0 6px 24px rgba(${agent.colorRgb},0.25)`,
        transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s',
      }}
    >
      {/* Illustration — positioned right/center as decoration */}
      <div className="absolute inset-0 flex items-center justify-end pr-2 pointer-events-none">
        <div style={{ width: '70%', height: '85%', opacity: hovered ? 0.95 : 0.75, transition: 'opacity 0.3s' }}>
          {Illustration && <Illustration />}
        </div>
      </div>

      {/* Left-side gradient fade so text is legible */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)`,
        }}
      />

      {/* Top shimmer on hover */}
      <div
        className="absolute top-0 inset-x-0 h-px transition-opacity duration-300"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* Content — left-anchored, bottom-anchored */}
      <div className="relative h-full flex flex-col justify-between p-5">
        {/* Top: number tag */}
        <div
          className="self-start px-2.5 py-1 rounded-lg text-xs font-bold"
          style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)' }}
        >
          {String(index + 1).padStart(2, '0')}
        </div>

        {/* Bottom: name + desc + cta */}
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-2xl">{agent.icon}</span>
            <h2
              className="text-2xl font-extrabold leading-tight text-white"
              style={{ fontFamily: 'var(--font-heading,Syne)', textShadow: '0 1px 8px rgba(0,0,0,0.2)' }}
            >
              {agent.name}
            </h2>
          </div>

          <p
            className="text-sm leading-relaxed mb-4 max-w-[55%]"
            style={{ color: 'rgba(255,255,255,0.78)', textShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
          >
            {agent.description}
          </p>

          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300"
            style={{
              background: hovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.2)',
              color: hovered ? agent.color : '#ffffff',
              backdropFilter: 'blur(8px)',
              boxShadow: hovered ? `0 4px 16px rgba(${agent.colorRgb},0.3)` : 'none',
            }}
          >
            Start conversation
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 6.5h9M7.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
}
