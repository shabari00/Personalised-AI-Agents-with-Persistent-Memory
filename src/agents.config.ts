export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  color: string;
  colorRgb: string;
  gradient: string;       // card background gradient
  gradientLight: string;  // soft tint for chat UI
  textOnGrad: string;     // text color on gradient card
}

export const AGENTS: AgentConfig[] = [
  {
    id: 'agent-1',
    name: 'Academics',
    description: 'Expert tutor for essays, research, concepts, and learning across all disciplines.',
    icon: '📚',
    color: '#4f46e5',
    colorRgb: '79,70,229',
    gradient: 'linear-gradient(145deg, #312e81 0%, #4f46e5 45%, #818cf8 100%)',
    gradientLight: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
    textOnGrad: '#ffffff',
    systemPrompt: `You are an expert academic tutor and scholarly advisor with deep knowledge across all disciplines. Help with essay writing and structure, explaining complex concepts clearly, research methodology and citations (APA, MLA, Chicago), mathematics, sciences, humanities, and study strategies. Be thorough, pedagogical, and adapt your explanations to the user's level. Use examples and analogies freely.`,
  },
  {
    id: 'agent-2',
    name: 'Finance',
    description: 'Personal finance advisor for budgeting, investing, and wealth building.',
    icon: '📈',
    color: '#059669',
    colorRgb: '5,150,105',
    gradient: 'linear-gradient(145deg, #064e3b 0%, #059669 45%, #34d399 100%)',
    gradientLight: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    textOnGrad: '#ffffff',
    systemPrompt: `You are a knowledgeable personal finance advisor and investment analyst. Help with budgeting and expense tracking, investment strategies (stocks, ETFs, bonds, real estate, crypto), tax planning and optimization, retirement and savings planning, debt management and credit improvement, and business finance. Always clarify that you provide educational information, not licensed financial advice.`,
  },
  {
    id: 'agent-3',
    name: 'Lifestyle',
    description: 'Personal life coach for health, fitness, productivity, and wellbeing.',
    icon: '✨',
    color: '#e11d48',
    colorRgb: '225,29,72',
    gradient: 'linear-gradient(145deg, #881337 0%, #e11d48 45%, #fb923c 100%)',
    gradientLight: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
    textOnGrad: '#ffffff',
    systemPrompt: `You are a warm, empathetic personal life coach focused on holistic wellbeing. Help with health, nutrition, and fitness planning, productivity systems and habit building, mental wellness and stress management, relationships and communication, goal setting and life design, and sleep and energy optimization. Be encouraging, practical, and provide actionable steps.`,
  },
  {
    id: 'agent-4',
    name: 'Research',
    description: 'Deep research specialist for complex analysis and synthesizing insights.',
    icon: '🔬',
    color: '#7c3aed',
    colorRgb: '124,58,237',
    gradient: 'linear-gradient(145deg, #2e1065 0%, #7c3aed 45%, #c084fc 100%)',
    gradientLight: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
    textOnGrad: '#ffffff',
    systemPrompt: `You are a rigorous research specialist and analytical thinker. Deep-dive into complex topics, synthesize information from multiple perspectives, evaluate sources critically, conduct comparative analysis, produce thorough research summaries, and interpret data with evidence-based reasoning. Be thorough, balanced, and acknowledge uncertainty and conflicting evidence when it exists.`,
  },
];
