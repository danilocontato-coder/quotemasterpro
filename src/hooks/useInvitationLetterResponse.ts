import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SupplierInvitation {
  id: string;
  invitation_letter_id: string;
  supplier_id: string;
  sent_at: string | null;
  viewed_at: string | null;
  response_status: "pending" | "accepted" | "declined" | "no_interest";
  response_date: string | null;
  response_notes: string | null;
  response_attachment_url: string | null;
  response_token: string | null;
  token_expires_at: string | null;
  invitation_letters?: {
    id: string;
    letter_number: string;
    title: string;
    description: string | null;
    deadline: string;
    status: string;
    quote_id: string;
    attachments: any[];
  };
}

export interface SubmitResponseInput {
  invitation_letter_supplier_id: string;
  response_status: "accepted" | "declined" | "no_interest";
  response_notes?: string;
  response_attachment_url?: string;
}

// Get invitations for current supplier
export function useSupplierInvitations() {
  return useQuery({
    queryKey: ["supplier-invitations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitation_letter_suppliers")
        .select(
          `
          *,
          invitation_letters (
            id,
            letter_number,
            title,
            description,
            deadline,
            status,
            quote_id,
            attachments
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SupplierInvitation[];
    },
  });
}

// Get invitation by token (public access)
export function useInvitationByToken(token: string | undefined) {
  return useQuery({
    queryKey: ["invitation-by-token", token],
    queryFn: async () => {
      if (!token) throw new Error("Token is required");

      const { data, error } = await supabase
        .from("invitation_letter_suppliers")
        .select(
          `
          *,
          invitation_letters (
            id,
            letter_number,
            title,
            description,
            deadline,
            status,
            quote_id,
            attachments,
            clients (
              id,
              company_name,
              cnpj,
              contacts
            )
          ),
          suppliers (
            id,
            company_name
          )
        `
        )
        .eq("response_token", token)
        .single();

      if (error) throw error;

      // Check if token is expired
      if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
        throw new Error("Token expirado");
      }

      return data;
    },
    enabled: !!token,
    retry: false,
  });
}

// Submit supplier response
export function useSubmitInvitationResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitResponseInput) => {
      const { data, error } = await supabase
        .from("invitation_letter_suppliers")
        .update({
          response_status: input.response_status,
          response_notes: input.response_notes,
          response_attachment_url: input.response_attachment_url,
          response_date: new Date().toISOString(),
        })
        .eq("id", input.invitation_letter_supplier_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invitations"] });
      toast({
        title: "Sucesso",
        description: "Resposta enviada com sucesso",
      });
    },
    onError: (error: any) => {
      console.error("Error submitting response:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar resposta",
        variant: "destructive",
      });
    },
  });
}

// Mark invitation as viewed
export function useMarkInvitationViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase
        .from("invitation_letter_suppliers")
        .update({ viewed_at: new Date().toISOString() })
        .eq("id", invitationId)
        .is("viewed_at", null)
        .select()
        .single();

      if (error && error.code !== "PGRST116") throw error; // Ignore "no rows updated" error
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["invitation-by-token"] });
    },
  });
}
