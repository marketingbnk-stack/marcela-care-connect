import type { Lead, LeadNote } from "./types";

export const mockLeads: Lead[] = [
  {
    id: "1", name: "Ana Silva", phone: "5511999001122", email: "ana@email.com",
    age: 34, city: "São Paulo", source: "Instagram Ads", procedure: "Mamoplastia",
    stage: "novo_lead", created_at: "2026-04-12T10:00:00Z", updated_at: "2026-04-12T10:00:00Z",
  },
  {
    id: "2", name: "Carla Oliveira", phone: "5511998887766", email: "carla@email.com",
    age: 28, city: "Campinas", source: "Google Ads", procedure: "Rinoplastia",
    stage: "contato_feito", created_at: "2026-04-10T09:00:00Z", updated_at: "2026-04-11T14:00:00Z",
    last_interaction: "2026-04-11T14:00:00Z",
  },
  {
    id: "3", name: "Fernanda Costa", phone: "5511997776655", email: "fer@email.com",
    age: 42, city: "São Paulo", source: "Indicação", procedure: "Abdominoplastia",
    stage: "consulta_agendada", created_at: "2026-04-08T08:00:00Z", updated_at: "2026-04-10T11:00:00Z",
    last_interaction: "2026-04-10T11:00:00Z",
  },
  {
    id: "4", name: "Juliana Mendes", phone: "5511996665544", email: "ju@email.com",
    age: 31, city: "Santos", source: "Site", procedure: "Lipoaspiração",
    stage: "consulta_realizada", created_at: "2026-04-05T07:00:00Z", updated_at: "2026-04-09T16:00:00Z",
    last_interaction: "2026-04-09T16:00:00Z",
  },
  {
    id: "5", name: "Mariana Souza", phone: "5511995554433", email: "mari@email.com",
    age: 37, city: "São Paulo", source: "Orgânico", procedure: "Mamoplastia",
    stage: "procedimento_agendado", created_at: "2026-04-01T06:00:00Z", updated_at: "2026-04-08T10:00:00Z",
    last_interaction: "2026-04-08T10:00:00Z",
  },
  {
    id: "6", name: "Beatriz Lima", phone: "5511994443322", email: "bia@email.com",
    age: 45, city: "Jundiaí", source: "Evento", procedure: "Lifting Facial",
    stage: "realizado", created_at: "2026-03-20T05:00:00Z", updated_at: "2026-04-07T09:00:00Z",
    last_interaction: "2026-04-07T09:00:00Z",
  },
  {
    id: "7", name: "Patrícia Ferreira", phone: "5511993332211", email: "pat@email.com",
    age: 29, city: "São Paulo", source: "Instagram Ads", procedure: "Rinoplastia",
    stage: "novo_lead", created_at: "2026-04-13T12:00:00Z", updated_at: "2026-04-13T12:00:00Z",
  },
  {
    id: "8", name: "Luciana Alves", phone: "5511992221100",
    age: 33, city: "Guarulhos", source: "Indicação", procedure: "Blefaroplastia",
    stage: "contato_feito", created_at: "2026-04-11T15:00:00Z", updated_at: "2026-04-12T09:00:00Z",
    last_interaction: "2026-04-12T09:00:00Z",
  },
];

export const mockNotes: LeadNote[] = [
  { id: "n1", lead_id: "1", content: "Entrou pelo anúncio de mamoplastia no Instagram. Demonstrou interesse.", author: "Equipe", created_at: "2026-04-12T10:05:00Z" },
  { id: "n2", lead_id: "2", content: "Primeiro contato via WhatsApp. Agendou retorno para sexta.", author: "Equipe", created_at: "2026-04-11T14:00:00Z" },
  { id: "n3", lead_id: "3", content: "Consulta agendada para 15/04 às 14h.", author: "Equipe", created_at: "2026-04-10T11:00:00Z" },
  { id: "n4", lead_id: "4", content: "Consulta realizada. Paciente decidiu por lipo HD.", author: "Dra. Marcela", created_at: "2026-04-09T16:00:00Z" },
];
