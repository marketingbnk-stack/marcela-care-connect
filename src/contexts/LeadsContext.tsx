import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Lead, LeadNote } from "@/lib/types";
import type { PipelineStage } from "@/lib/constants";
import { mockLeads, mockNotes } from "@/lib/mock-data";

interface LeadsContextType {
  leads: Lead[];
  notes: LeadNote[];
  addLead: (lead: Omit<Lead, "id" | "created_at" | "updated_at">) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  moveLead: (id: string, stage: PipelineStage) => void;
  addNote: (leadId: string, content: string, author: string) => void;
  getLeadNotes: (leadId: string) => LeadNote[];
}

const LeadsContext = createContext<LeadsContextType | null>(null);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [notes, setNotes] = useState<LeadNote[]>(mockNotes);

  const addLead = useCallback((lead: Omit<Lead, "id" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    setLeads(prev => [...prev, { ...lead, id: crypto.randomUUID(), created_at: now, updated_at: now }]);
  }, []);

  const updateLead = useCallback((id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l));
  }, []);

  const moveLead = useCallback((id: string, stage: PipelineStage) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage, updated_at: new Date().toISOString() } : l));
  }, []);

  const addNote = useCallback((leadId: string, content: string, author: string) => {
    setNotes(prev => [...prev, { id: crypto.randomUUID(), lead_id: leadId, content, author, created_at: new Date().toISOString() }]);
  }, []);

  const getLeadNotes = useCallback((leadId: string) => {
    return notes.filter(n => n.lead_id === leadId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [notes]);

  return (
    <LeadsContext.Provider value={{ leads, notes, addLead, updateLead, moveLead, addNote, getLeadNotes }}>
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}
