export const PIPELINE_STAGES = [
  { id: "novo_lead", label: "Novo Lead", color: "bg-blue-lighter text-primary" },
  { id: "contato_feito", label: "Contato Feito", color: "bg-blue-100 text-blue-medium" },
  { id: "consulta_agendada", label: "Consulta Agendada", color: "bg-amber-100 text-amber-700" },
  { id: "consulta_realizada", label: "Consulta Realizada", color: "bg-coral-lighter text-coral" },
  { id: "procedimento_agendado", label: "Procedimento Agendado", color: "bg-purple-100 text-purple-700" },
  { id: "realizado", label: "Realizado", color: "bg-green-100 text-green-700" },
  { id: "fornecedor", label: "Fornecedor", color: "bg-orange-100 text-orange-700" },
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number]["id"];

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
