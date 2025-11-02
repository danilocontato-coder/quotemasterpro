import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface InvitationLetter {
  id: string;
  letter_number: string;
  quote_id: string;
  client_id: string;
  title: string;
  description: string | null;
  deadline: string;
  status: "draft" | "sent" | "cancelled";
  attachments: any[];
  metadata: any;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  created_by: string | null;
}

export interface InvitationLetterSupplier {
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
  created_at: string;
  updated_at: string;
}

export interface InvitationLetterWithStats extends InvitationLetter {
  invitation_letter_suppliers?: InvitationLetterSupplier[];
  suppliers?: InvitationLetterSupplier[];
  stats?: {
    total_suppliers: number;
    sent_count: number;
    viewed_count: number;
    responded_count: number;
    accepted_count: number;
    declined_count: number;
    pending_count: number;
  };
}

export interface CreateInvitationLetterInput {
  quote_id: string;
  client_id: string;
  title: string;
  description?: string;
  deadline: string;
  supplier_ids: string[];
  attachments?: any[];
}

export interface UpdateInvitationLetterInput {
  id: string;
  title?: string;
  description?: string;
  deadline?: string;
  attachments?: any[];
}

// Fetch all invitation letters
export function useInvitationLetters() {
  return useQuery({
    queryKey: ["invitation-letters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitation_letters")
        .select(`
          *,
          invitation_letter_suppliers (
            id,
            supplier_id,
            sent_at,
            viewed_at,
            response_status,
            response_date
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InvitationLetterWithStats[];
    },
  });
}

// Fetch single invitation letter with details
export function useInvitationLetter(id: string | undefined) {
  return useQuery({
    queryKey: ["invitation-letter", id],
    queryFn: async () => {
      if (!id) throw new Error("ID is required");

      const { data, error } = await supabase
        .from("invitation_letters")
        .select(`
          *,
          invitation_letter_suppliers (
            *,
            suppliers (
              id,
              company_name,
              contacts
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Get stats
      const { data: statsData } = await supabase.rpc(
        "get_invitation_letter_stats",
        { p_letter_id: id }
      );

      return {
        ...data,
        stats: statsData?.[0] || null,
      } as InvitationLetterWithStats;
    },
    enabled: !!id,
  });
}

// Create invitation letter
export function useCreateInvitationLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInvitationLetterInput) => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create invitation letter
      const { data: letter, error: letterError } = await supabase
        .from("invitation_letters")
        .insert({
          quote_id: input.quote_id,
          client_id: input.client_id,
          title: input.title,
          description: input.description,
          deadline: input.deadline,
          status: "draft",
          attachments: input.attachments || [],
          created_by: user.id,
        })
        .select()
        .single();

      if (letterError) throw letterError;

      // Create supplier associations
      if (input.supplier_ids.length > 0) {
        const supplierRecords = input.supplier_ids.map((supplierId) => ({
          invitation_letter_id: letter.id,
          supplier_id: supplierId,
        }));

        const { error: suppliersError } = await supabase
          .from("invitation_letter_suppliers")
          .insert(supplierRecords);

        if (suppliersError) throw suppliersError;
      }

      return letter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitation-letters"] });
      toast({
        title: "Sucesso",
        description: "Carta convite criada com sucesso",
      });
    },
    onError: (error: any) => {
      console.error("Error creating invitation letter:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar carta convite",
        variant: "destructive",
      });
    },
  });
}

// Update invitation letter
export function useUpdateInvitationLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateInvitationLetterInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("invitation_letters")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invitation-letters"] });
      queryClient.invalidateQueries({
        queryKey: ["invitation-letter", variables.id],
      });
      toast({
        title: "Sucesso",
        description: "Carta convite atualizada com sucesso",
      });
    },
    onError: (error: any) => {
      console.error("Error updating invitation letter:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar carta convite",
        variant: "destructive",
      });
    },
  });
}

// Send invitation letter (update status to 'sent')
export function useSendInvitationLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (letterId: string) => {
      const { data, error } = await supabase
        .from("invitation_letters")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", letterId)
        .select()
        .single();

      if (error) throw error;

      // Update suppliers sent_at
      const { error: suppliersError } = await supabase
        .from("invitation_letter_suppliers")
        .update({ sent_at: new Date().toISOString() })
        .eq("invitation_letter_id", letterId)
        .is("sent_at", null);

      if (suppliersError) throw suppliersError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitation-letters"] });
      toast({
        title: "Sucesso",
        description: "Carta convite enviada com sucesso",
      });
    },
    onError: (error: any) => {
      console.error("Error sending invitation letter:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar carta convite",
        variant: "destructive",
      });
    },
  });
}

// Cancel invitation letter
export function useCancelInvitationLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (letterId: string) => {
      const { data, error } = await supabase
        .from("invitation_letters")
        .update({ status: "cancelled" })
        .eq("id", letterId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitation-letters"] });
      toast({
        title: "Sucesso",
        description: "Carta convite cancelada com sucesso",
      });
    },
    onError: (error: any) => {
      console.error("Error cancelling invitation letter:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar carta convite",
        variant: "destructive",
      });
    },
  });
}

// Delete invitation letter
export function useDeleteInvitationLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (letterId: string) => {
      const { error } = await supabase
        .from("invitation_letters")
        .delete()
        .eq("id", letterId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitation-letters"] });
      toast({
        title: "Sucesso",
        description: "Carta convite excluída com sucesso",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting invitation letter:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir carta convite",
        variant: "destructive",
      });
    },
  });
}

// Get suppliers for a specific invitation letter
export function useInvitationLetterSuppliers(letterId: string | undefined) {
  return useQuery({
    queryKey: ["invitation-letter-suppliers", letterId],
    queryFn: async () => {
      if (!letterId) throw new Error("Letter ID is required");

      const { data, error } = await supabase
        .from("invitation_letter_suppliers")
        .select(
          `
          *,
          suppliers (
            id,
            company_name,
            contacts,
            legal_entity_type
          )
        `
        )
        .eq("invitation_letter_id", letterId);

      if (error) throw error;
      return data;
    },
    enabled: !!letterId,
  });
}
