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
  next_step?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  referrer?: string | null;
  landing_page?: string | null;
}

export interface PipelineNextStep {
  id: string;
  stage: string;
  step_order: number;
  title: string;
  description?: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  author: string;
  created_at: string;
}
