// ===== PIPE 1 — Funil de Leads =====
export const PIPE1_STAGES = [
  { id: "novo_lead", label: "Novo Lead", color: "bg-blue-lighter text-primary" },
  { id: "contato_feito", label: "Contato Feito", color: "bg-blue-100 text-blue-medium" },
  { id: "consulta_agendada", label: "Consulta Agendada", color: "bg-amber-100 text-amber-700" },
  { id: "consulta_realizada", label: "Consulta Realizada", color: "bg-coral-lighter text-coral" },
] as const;

// ===== PIPE 2 — Funil de Vendas =====
export const PIPE2_STAGES = [
  { id: "plano_apresentado", label: "Plano Apresentado", color: "bg-indigo-100 text-indigo-700" },
  { id: "aguardando_decisao", label: "Aguardando Decisão", color: "bg-yellow-100 text-yellow-700" },
  { id: "procedimento_fechado", label: "Procedimento Fechado", color: "bg-emerald-100 text-emerald-700" },
  { id: "cirurgia_agendada", label: "Cirurgia Agendada", color: "bg-purple-100 text-purple-700" },
  { id: "cirurgia_realizada", label: "Cirurgia Realizada", color: "bg-green-100 text-green-700" },
  { id: "pos_procedimento", label: "Pós-Procedimento", color: "bg-teal-100 text-teal-700" },
] as const;

// ===== Etapas especiais =====
export const SPECIAL_STAGES = [
  { id: "fornecedor", label: "Fornecedor", color: "bg-orange-100 text-orange-700 border-orange-300" },
] as const;

// All stages combined (for selectors, etc.)
export const PIPELINE_STAGES = [...PIPE1_STAGES, ...PIPE2_STAGES, ...SPECIAL_STAGES] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number]["id"];

// Legacy kept for compatibility
export const PIPE1_IDS = PIPE1_STAGES.map(s => s.id) as unknown as readonly string[];
export const PIPE2_IDS = PIPE2_STAGES.map(s => s.id) as unknown as readonly string[];

export const LEAD_SOURCES = [
  "Instagram Ads",
  "Google Ads",
  "Indicação",
  "Site",
  "Orgânico",
  "Evento",
  "Outro",
] as const;

export type LeadSource = typeof LEAD_SOURCES[number];

export const PROCEDURES = [
  "Mamoplastia",
  "Abdominoplastia",
  "Rinoplastia",
  "Lipoaspiração",
  "Blefaroplastia",
  "Lifting Facial",
  "Prótese de Glúteo",
  "Otoplastia",
  "Outro",
] as const;

export type Procedure = typeof PROCEDURES[number];

export const SOURCE_COLORS: Record<string, string> = {
  "Instagram Ads": "bg-pink-100 text-pink-700 border-pink-200",
  "Google Ads": "bg-blue-100 text-blue-700 border-blue-200",
  "Indicação": "bg-green-100 text-green-700 border-green-200",
  "Site": "bg-purple-100 text-purple-700 border-purple-200",
  "Orgânico": "bg-amber-100 text-amber-700 border-amber-200",
  "Evento": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Outro": "bg-gray-100 text-gray-700 border-gray-200",
};
