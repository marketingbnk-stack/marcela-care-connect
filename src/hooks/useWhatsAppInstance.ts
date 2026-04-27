import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useWhatsAppInstance() {
  const [loading, setLoading] = useState(false);

  const call = async (action: "status" | "qrcode" | "disconnect") => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-instance", { body: { action } });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getStatus: () => call("status"),
    getQrCode: () => call("qrcode"),
    disconnect: () => call("disconnect"),
  };
}
