import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Lead, LeadNote } from "@/lib/types";
import type { PipelineStage } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadsContextType {
  leads: Lead[];
  notes: LeadNote[];
  loading: boolean;
  addLead: (lead: Omit<Lead, "id" | "created_at" | "updated_at">) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  moveLead: (id: string, stage: PipelineStage) => void;
  addNote: (leadId: string, content: string, author: string) => void;
  getLeadNotes: (leadId: string) => LeadNote[];
  refreshLeads: () => void;
}

const LeadsContext = createContext<LeadsContextType | null>(null);

export function LeadsProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
      return;
    }
    setLeads((data || []) as Lead[]);
    setLoading(false);
  }, []);

  const fetchNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from("lead_notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      return;
    }
    setNotes((data || []) as LeadNote[]);
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchNotes();
  }, [fetchLeads, fetchNotes]);

  const addLead = useCallback(async (lead: Omit<Lead, "id" | "created_at" | "updated_at">) => {
    const { error } = await supabase.from("leads").insert({
      name: lead.name,
      phone: lead.phone,
      email: lead.email || null,
      age: lead.age || null,
      city: lead.city || null,
      source: lead.source,
      procedure: lead.procedure,
      stage: lead.stage,
    });

    if (error) {
      toast.error("Erro ao cadastrar lead: " + error.message);
      return;
    }
    toast.success("Lead cadastrado!");
    fetchLeads();
  }, [fetchLeads]);

  const updateLead = useCallback(async (id: string, updates: Partial<Lead>) => {
    const { error } = await supabase.from("leads").update(updates).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar lead: " + error.message);
      return;
    }
    fetchLeads();
  }, [fetchLeads]);

  const moveLead = useCallback(async (id: string, stage: PipelineStage) => {
    const { error } = await supabase.from("leads").update({ stage }).eq("id", id);
    if (error) {
      toast.error("Erro ao mover lead: " + error.message);
      return;
    }
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage, updated_at: new Date().toISOString() } : l));
  }, []);

  const addNote = useCallback(async (leadId: string, content: string, author: string) => {
    const { error } = await supabase.from("lead_notes").insert({
      lead_id: leadId,
      content,
      author,
    });

    if (error) {
      toast.error("Erro ao adicionar nota: " + error.message);
      return;
    }
    fetchNotes();
  }, [fetchNotes]);

  const getLeadNotes = useCallback((leadId: string) => {
    return notes.filter(n => n.lead_id === leadId).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notes]);

  return (
    <LeadsContext.Provider value={{ leads, notes, loading, addLead, updateLead, moveLead, addNote, getLeadNotes, refreshLeads: fetchLeads }}>
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) throw new Error("useLeads must be used within LeadsProvider");
  return ctx;
}
