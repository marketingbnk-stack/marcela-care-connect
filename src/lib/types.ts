import type { PipelineStage, LeadSource, Procedure } from "./constants";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  age?: number;
  city?: string;
  source: LeadSource;
  procedure: Procedure;
  stage: PipelineStage;
  created_at: string;
  updated_at: string;
  last_interaction?: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  author: string;
  created_at: string;
}
