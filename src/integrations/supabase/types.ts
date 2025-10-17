export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_leads: {
        Row: {
          ai_insights: Json
          assigned_to: string | null
          city: string | null
          contact_data: Json
          converted_at: string | null
          converted_to_client_id: string | null
          converted_to_supplier_id: string | null
          created_at: string
          created_by: string | null
          id: string
          last_contacted_at: string | null
          notes: string | null
          region: string | null
          score: number
          segment: string
          state: string | null
          status: Database["public"]["Enums"]["lead_status"]
          type: Database["public"]["Enums"]["lead_type"]
          updated_at: string
        }
        Insert: {
          ai_insights?: Json
          assigned_to?: string | null
          city?: string | null
          contact_data?: Json
          converted_at?: string | null
          converted_to_client_id?: string | null
          converted_to_supplier_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_contacted_at?: string | null
          notes?: string | null
          region?: string | null
          score: number
          segment: string
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          type: Database["public"]["Enums"]["lead_type"]
          updated_at?: string
        }
        Update: {
          ai_insights?: Json
          assigned_to?: string | null
          city?: string | null
          contact_data?: Json
          converted_at?: string | null
          converted_to_client_id?: string | null
          converted_to_supplier_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_contacted_at?: string | null
          notes?: string | null
          region?: string | null
          score?: number
          segment?: string
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          type?: Database["public"]["Enums"]["lead_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_leads_converted_to_client_id_fkey"
            columns: ["converted_to_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_leads_converted_to_supplier_id_fkey"
            columns: ["converted_to_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_pricing: {
        Row: {
          active: boolean | null
          completion_price_per_1k: number
          created_at: string | null
          effective_date: string | null
          id: string
          model: string
          prompt_price_per_1k: number
          provider: string
        }
        Insert: {
          active?: boolean | null
          completion_price_per_1k: number
          created_at?: string | null
          effective_date?: string | null
          id?: string
          model: string
          prompt_price_per_1k: number
          provider: string
        }
        Update: {
          active?: boolean | null
          completion_price_per_1k?: number
          created_at?: string | null
          effective_date?: string | null
          id?: string
          model?: string
          prompt_price_per_1k?: number
          provider?: string
        }
        Relationships: []
      }
      ai_negotiation_settings: {
        Row: {
          active: boolean
          category: string
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_negotiation_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_negotiations: {
        Row: {
          ai_analysis: Json | null
          approved_by: string | null
          client_id: string | null
          completed_at: string | null
          conversation_log: Json | null
          created_at: string
          discount_percentage: number | null
          human_approved: boolean | null
          human_feedback: string | null
          id: string
          negotiated_amount: number | null
          negotiation_strategy: Json | null
          original_amount: number
          quote_id: string
          selected_response_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json | null
          approved_by?: string | null
          client_id?: string | null
          completed_at?: string | null
          conversation_log?: Json | null
          created_at?: string
          discount_percentage?: number | null
          human_approved?: boolean | null
          human_feedback?: string | null
          id?: string
          negotiated_amount?: number | null
          negotiation_strategy?: Json | null
          original_amount: number
          quote_id: string
          selected_response_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json | null
          approved_by?: string | null
          client_id?: string | null
          completed_at?: string | null
          conversation_log?: Json | null
          created_at?: string
          discount_percentage?: number | null
          human_approved?: boolean | null
          human_feedback?: string | null
          id?: string
          negotiated_amount?: number | null
          negotiation_strategy?: Json | null
          original_amount?: number
          quote_id?: string
          selected_response_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_negotiations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_negotiations_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_negotiations_selected_response_id_fkey"
            columns: ["selected_response_id"]
            isOneToOne: false
            referencedRelation: "quote_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompts: {
        Row: {
          active: boolean | null
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean | null
          prompt_content: string
          prompt_name: string
          prompt_type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          active?: boolean | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          prompt_content: string
          prompt_name: string
          prompt_type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          active?: boolean | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          prompt_content?: string
          prompt_name?: string
          prompt_type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_proposal_analyses: {
        Row: {
          analysis_data: Json
          analysis_type: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          proposal_id: string | null
          quote_id: string
          supplier_id: string | null
          supplier_name: string | null
        }
        Insert: {
          analysis_data?: Json
          analysis_type: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          proposal_id?: string | null
          quote_id: string
          supplier_id?: string | null
          supplier_name?: string | null
        }
        Update: {
          analysis_data?: Json
          analysis_type?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          proposal_id?: string | null
          quote_id?: string
          supplier_id?: string | null
          supplier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_proposal_analyses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_proposal_analyses_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_proposal_analyses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          aggressiveness: string
          auto_analysis: boolean
          auto_negotiation: boolean
          created_at: string
          enabled: boolean
          id: string
          market_analysis_provider: string
          max_discount_percent: number
          min_negotiation_amount: number
          negotiation_provider: string
          openai_model: string
          perplexity_model: string
          updated_at: string
        }
        Insert: {
          aggressiveness?: string
          auto_analysis?: boolean
          auto_negotiation?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          market_analysis_provider?: string
          max_discount_percent?: number
          min_negotiation_amount?: number
          negotiation_provider?: string
          openai_model?: string
          perplexity_model?: string
          updated_at?: string
        }
        Update: {
          aggressiveness?: string
          auto_analysis?: boolean
          auto_negotiation?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          market_analysis_provider?: string
          max_discount_percent?: number
          min_negotiation_amount?: number
          negotiation_provider?: string
          openai_model?: string
          perplexity_model?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_token_usage: {
        Row: {
          client_id: string
          completion_tokens: number
          cost_usd: number | null
          created_at: string
          feature: string
          id: string
          metadata: Json | null
          model: string
          prompt_tokens: number
          provider: string
          quote_id: string | null
          request_id: string | null
          total_tokens: number
        }
        Insert: {
          client_id: string
          completion_tokens?: number
          cost_usd?: number | null
          created_at?: string
          feature: string
          id?: string
          metadata?: Json | null
          model: string
          prompt_tokens?: number
          provider: string
          quote_id?: string | null
          request_id?: string | null
          total_tokens?: number
        }
        Update: {
          client_id?: string
          completion_tokens?: number
          cost_usd?: number | null
          created_at?: string
          feature?: string
          id?: string
          metadata?: Json | null
          model?: string
          prompt_tokens?: number
          provider?: string
          quote_id?: string | null
          request_id?: string | null
          total_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_token_usage_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_token_usage_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_training_data: {
        Row: {
          actual_output: Json | null
          approved_by: string | null
          created_at: string
          expected_output: Json
          feedback: string | null
          id: string
          input_data: Json
          quote_id: string | null
          success_score: number | null
          training_type: string
        }
        Insert: {
          actual_output?: Json | null
          approved_by?: string | null
          created_at?: string
          expected_output: Json
          feedback?: string | null
          id?: string
          input_data: Json
          quote_id?: string | null
          success_score?: number | null
          training_type: string
        }
        Update: {
          actual_output?: Json | null
          approved_by?: string | null
          created_at?: string
          expected_output?: Json
          feedback?: string | null
          id?: string
          input_data?: Json
          quote_id?: string | null
          success_score?: number | null
          training_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_training_data_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          announcement_group_id: string | null
          attachments: string[]
          client_id: string
          content: string
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          expires_at: string | null
          id: string
          priority: string
          supplier_id: string | null
          supplier_name: string | null
          target_audience: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          announcement_group_id?: string | null
          attachments?: string[]
          client_id: string
          content: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          supplier_id?: string | null
          supplier_name?: string | null
          target_audience?: string
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          announcement_group_id?: string | null
          attachments?: string[]
          client_id?: string
          content?: string
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          supplier_id?: string | null
          supplier_name?: string | null
          target_audience?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_levels: {
        Row: {
          active: boolean
          amount_threshold: number
          approvers: string[]
          client_id: string
          created_at: string
          id: string
          max_amount_threshold: number | null
          name: string
          order_level: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_threshold?: number
          approvers?: string[]
          client_id: string
          created_at?: string
          id?: string
          max_amount_threshold?: number | null
          name: string
          order_level?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_threshold?: number
          approvers?: string[]
          client_id?: string
          created_at?: string
          id?: string
          max_amount_threshold?: number | null
          name?: string
          order_level?: number
          updated_at?: string
        }
        Relationships: []
      }
      approvals: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          comments: string | null
          created_at: string
          id: string
          quote_id: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          quote_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          comments?: string | null
          created_at?: string
          id?: string
          quote_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          panel_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          panel_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          panel_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_audit_logs_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_settings: {
        Row: {
          accent_color: string | null
          client_id: string | null
          company_name: string | null
          created_at: string | null
          custom_css: string | null
          favicon_url: string | null
          footer_text: string | null
          id: string
          login_page_title: string | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          client_id?: string | null
          company_name?: string | null
          created_at?: string | null
          custom_css?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          id?: string
          login_page_title?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          client_id?: string | null
          company_name?: string | null
          created_at?: string | null
          custom_css?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          id?: string
          login_page_title?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branding_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branding_settings_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          client_id: string | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_ai_settings: {
        Row: {
          ai_negotiation_enabled: boolean
          auto_start_analysis: boolean | null
          auto_start_negotiation: boolean | null
          client_id: string
          created_at: string
          custom_prompts: Json | null
          id: string
          max_discount_percentage: number | null
          min_order_value_for_ai: number | null
          negotiation_style: string | null
          updated_at: string
        }
        Insert: {
          ai_negotiation_enabled?: boolean
          auto_start_analysis?: boolean | null
          auto_start_negotiation?: boolean | null
          client_id: string
          created_at?: string
          custom_prompts?: Json | null
          id?: string
          max_discount_percentage?: number | null
          min_order_value_for_ai?: number | null
          negotiation_style?: string | null
          updated_at?: string
        }
        Update: {
          ai_negotiation_enabled?: boolean
          auto_start_analysis?: boolean | null
          auto_start_negotiation?: boolean | null
          client_id?: string
          created_at?: string
          custom_prompts?: Json | null
          id?: string
          max_discount_percentage?: number | null
          min_order_value_for_ai?: number | null
          negotiation_style?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_contract_counters: {
        Row: {
          client_id: string
          created_at: string | null
          current_counter: number
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contract_counters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_delivery_counters: {
        Row: {
          client_id: string
          created_at: string
          current_counter: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          current_counter?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          current_counter?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_delivery_counters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_groups: {
        Row: {
          client_count: number | null
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          client_count?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          client_count?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      client_payment_counters: {
        Row: {
          client_id: string
          created_at: string | null
          current_counter: number
          id: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          current_counter?: number
          id?: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          current_counter?: number
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_payment_counters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_product_counters: {
        Row: {
          client_id: string
          created_at: string | null
          current_counter: number
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_product_counters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_quote_counters: {
        Row: {
          client_id: string
          created_at: string | null
          current_counter: number
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          current_counter?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_quote_counters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_suppliers: {
        Row: {
          associated_at: string | null
          client_id: string
          created_at: string | null
          id: string
          invitation_accepted_at: string | null
          invited_at: string | null
          notes: string | null
          status: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          associated_at?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          invitation_accepted_at?: string | null
          invited_at?: string | null
          notes?: string | null
          status?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          associated_at?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          invitation_accepted_at?: string | null
          invited_at?: string | null
          notes?: string | null
          status?: string | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_suppliers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_usage: {
        Row: {
          categories_count: number
          client_id: string
          created_at: string
          id: string
          last_reset_date: string
          products_in_catalog: number
          quote_responses_this_month: number
          quotes_this_month: number
          storage_used_gb: number
          updated_at: string
          users_count: number
        }
        Insert: {
          categories_count?: number
          client_id: string
          created_at?: string
          id?: string
          last_reset_date?: string
          products_in_catalog?: number
          quote_responses_this_month?: number
          quotes_this_month?: number
          storage_used_gb?: number
          updated_at?: string
          users_count?: number
        }
        Update: {
          categories_count?: number
          client_id?: string
          created_at?: string
          id?: string
          last_reset_date?: string
          products_in_catalog?: number
          quote_responses_this_month?: number
          quotes_this_month?: number
          storage_used_gb?: number
          updated_at?: string
          users_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_usage_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          branding_settings_id: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          cnpj: string
          company_name: string | null
          contacts: Json | null
          created_at: string | null
          documents: Json | null
          email: string
          group_id: string | null
          id: string
          last_access: string | null
          name: string
          notes: string | null
          parent_client_id: string | null
          phone: string | null
          settings: Json | null
          status: string | null
          subscription_plan_id: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          address?: string | null
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          branding_settings_id?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          cnpj: string
          company_name?: string | null
          contacts?: Json | null
          created_at?: string | null
          documents?: Json | null
          email: string
          group_id?: string | null
          id?: string
          last_access?: string | null
          name: string
          notes?: string | null
          parent_client_id?: string | null
          phone?: string | null
          settings?: Json | null
          status?: string | null
          subscription_plan_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          address?: string | null
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          branding_settings_id?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          cnpj?: string
          company_name?: string | null
          contacts?: Json | null
          created_at?: string | null
          documents?: Json | null
          email?: string
          group_id?: string | null
          id?: string
          last_access?: string | null
          name?: string
          notes?: string | null
          parent_client_id?: string | null
          phone?: string | null
          settings?: Json | null
          status?: string | null
          subscription_plan_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_branding_settings_id_fkey"
            columns: ["branding_settings_id"]
            isOneToOne: false
            referencedRelation: "branding_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_parent_client_id_fkey"
            columns: ["parent_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_adjustments: {
        Row: {
          adjustment_date: string
          approved_at: string | null
          approved_by: string | null
          attachments: Json | null
          contract_id: string
          created_at: string | null
          id: string
          index_type: string | null
          index_value: number | null
          justification: string | null
          new_value: number
          percentage: number
          previous_value: number
          requested_by: string | null
          status: string
        }
        Insert: {
          adjustment_date: string
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          contract_id: string
          created_at?: string | null
          id?: string
          index_type?: string | null
          index_value?: number | null
          justification?: string | null
          new_value: number
          percentage: number
          previous_value: number
          requested_by?: string | null
          status?: string
        }
        Update: {
          adjustment_date?: string
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          contract_id?: string
          created_at?: string | null
          id?: string
          index_type?: string | null
          index_value?: number | null
          justification?: string | null
          new_value?: number
          percentage?: number
          previous_value?: number
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_adjustments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_alerts: {
        Row: {
          action_required: string | null
          alert_type: string
          contract_id: string
          created_at: string | null
          due_date: string | null
          id: string
          message: string
          notified_at: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
        }
        Insert: {
          action_required?: string | null
          alert_type: string
          contract_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          message: string
          notified_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title: string
        }
        Update: {
          action_required?: string | null
          alert_type?: string
          contract_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          message?: string
          notified_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_alerts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_history: {
        Row: {
          adjustment_index: string | null
          adjustment_percentage: number | null
          approved_by: string | null
          attachments: Json | null
          changed_by: string | null
          contract_id: string
          created_at: string | null
          created_by: string | null
          description: string
          event_date: string
          event_type: string
          id: string
          new_value: number | null
          old_value: number | null
        }
        Insert: {
          adjustment_index?: string | null
          adjustment_percentage?: number | null
          approved_by?: string | null
          attachments?: Json | null
          changed_by?: string | null
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          description: string
          event_date: string
          event_type: string
          id?: string
          new_value?: number | null
          old_value?: number | null
        }
        Update: {
          adjustment_index?: string | null
          adjustment_percentage?: number | null
          approved_by?: string | null
          attachments?: Json | null
          changed_by?: string | null
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          event_date?: string
          event_type?: string
          id?: string
          new_value?: number | null
          old_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          alert_days_before: number | null
          approver_user_id: string | null
          attachments: Json | null
          auto_renewal: boolean | null
          client_id: string
          contract_number: string
          contract_type: string
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          end_date: string
          id: string
          last_reviewed_at: string | null
          notes: string | null
          payment_frequency: string | null
          payment_terms: string | null
          renewal_date: string | null
          renewal_terms: string | null
          responsible_user_id: string | null
          start_date: string
          status: string
          supplier_id: string | null
          tags: string[] | null
          title: string
          total_value: number
          updated_at: string | null
        }
        Insert: {
          alert_days_before?: number | null
          approver_user_id?: string | null
          attachments?: Json | null
          auto_renewal?: boolean | null
          client_id: string
          contract_number: string
          contract_type: string
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date: string
          id: string
          last_reviewed_at?: string | null
          notes?: string | null
          payment_frequency?: string | null
          payment_terms?: string | null
          renewal_date?: string | null
          renewal_terms?: string | null
          responsible_user_id?: string | null
          start_date: string
          status?: string
          supplier_id?: string | null
          tags?: string[] | null
          title: string
          total_value: number
          updated_at?: string | null
        }
        Update: {
          alert_days_before?: number | null
          approver_user_id?: string | null
          attachments?: Json | null
          auto_renewal?: boolean | null
          client_id?: string
          contract_number?: string
          contract_type?: string
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          end_date?: string
          id?: string
          last_reviewed_at?: string | null
          notes?: string | null
          payment_frequency?: string | null
          payment_terms?: string | null
          renewal_date?: string | null
          renewal_terms?: string | null
          responsible_user_id?: string | null
          start_date?: string
          status?: string
          supplier_id?: string | null
          tags?: string[] | null
          title?: string
          total_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          active: boolean
          budget_annual: number | null
          budget_monthly: number | null
          client_id: string
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          budget_annual?: number | null
          budget_monthly?: number | null
          client_id: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          budget_annual?: number | null
          budget_monthly?: number | null
          client_id?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usages: {
        Row: {
          client_id: string | null
          coupon_id: string
          discount_amount: number
          final_amount: number
          id: string
          original_amount: number
          subscription_plan_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          coupon_id: string
          discount_amount: number
          final_amount: number
          id?: string
          original_amount: number
          subscription_plan_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          coupon_id?: string
          discount_amount?: number
          final_amount?: number
          id?: string
          original_amount?: number
          subscription_plan_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          client_id: string | null
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_discount_amount: number | null
          minimum_purchase_amount: number | null
          name: string
          starts_at: string
          target_audience: string
          target_plans: string[] | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          active?: boolean
          client_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          max_discount_amount?: number | null
          minimum_purchase_amount?: number | null
          name: string
          starts_at?: string
          target_audience?: string
          target_plans?: string[] | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          active?: boolean
          client_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_discount_amount?: number | null
          minimum_purchase_amount?: number | null
          name?: string
          starts_at?: string
          target_audience?: string
          target_plans?: string[] | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_matrix_templates: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
          weights: Json
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          updated_at?: string
          weights?: Json
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "decision_matrix_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          actual_delivery_date: string | null
          client_id: string
          created_at: string
          delivery_address: string
          delivery_method: string | null
          id: string
          local_code: string | null
          notes: string | null
          payment_id: string | null
          quote_id: string
          scheduled_date: string
          status: string
          supplier_id: string
          tracking_code: string | null
          uber_courier_location: Json | null
          uber_courier_name: string | null
          uber_courier_phone: string | null
          uber_delivery_id: string | null
          uber_fee: number | null
          uber_metadata: Json | null
          uber_quote_id: string | null
          uber_status: string | null
          uber_tracking_url: string | null
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          client_id: string
          created_at?: string
          delivery_address: string
          delivery_method?: string | null
          id?: string
          local_code?: string | null
          notes?: string | null
          payment_id?: string | null
          quote_id: string
          scheduled_date: string
          status?: string
          supplier_id: string
          tracking_code?: string | null
          uber_courier_location?: Json | null
          uber_courier_name?: string | null
          uber_courier_phone?: string | null
          uber_delivery_id?: string | null
          uber_fee?: number | null
          uber_metadata?: Json | null
          uber_quote_id?: string | null
          uber_status?: string | null
          uber_tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          client_id?: string
          created_at?: string
          delivery_address?: string
          delivery_method?: string | null
          id?: string
          local_code?: string | null
          notes?: string | null
          payment_id?: string | null
          quote_id?: string
          scheduled_date?: string
          status?: string
          supplier_id?: string
          tracking_code?: string | null
          uber_courier_location?: Json | null
          uber_courier_name?: string | null
          uber_courier_phone?: string | null
          uber_delivery_id?: string | null
          uber_fee?: number | null
          uber_metadata?: Json | null
          uber_quote_id?: string | null
          uber_status?: string | null
          uber_tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_confirmations: {
        Row: {
          confirmation_code: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          delivery_id: string
          expires_at: string
          generated_at: string
          id: string
          is_used: boolean
          updated_at: string
        }
        Insert: {
          confirmation_code: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          delivery_id: string
          expires_at?: string
          generated_at?: string
          id?: string
          is_used?: boolean
          updated_at?: string
        }
        Update: {
          confirmation_code?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          delivery_id?: string
          expires_at?: string
          generated_at?: string
          id?: string
          is_used?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_confirmations_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign_recipients: {
        Row: {
          bounce_type: string | null
          bounced_at: string | null
          campaign_id: string
          click_count: number | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          first_click_at: string | null
          id: string
          ip_address: string | null
          message_id: string | null
          open_count: number | null
          opened_at: string | null
          personalization_data: Json | null
          recipient_email: string
          recipient_id: string | null
          recipient_name: string | null
          recipient_type: string
          send_status: string | null
          unsubscribed_at: string | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id: string
          click_count?: number | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          first_click_at?: string | null
          id?: string
          ip_address?: string | null
          message_id?: string | null
          open_count?: number | null
          opened_at?: string | null
          personalization_data?: Json | null
          recipient_email: string
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type: string
          send_status?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string
          click_count?: number | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          first_click_at?: string | null
          id?: string
          ip_address?: string | null
          message_id?: string | null
          open_count?: number | null
          opened_at?: string | null
          personalization_data?: Json | null
          recipient_email?: string
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type?: string
          send_status?: string | null
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_clicks: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          link_label: string | null
          link_url: string
          recipient_id: string
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          link_label?: string | null
          link_url: string
          recipient_id: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          link_label?: string | null
          link_url?: string
          recipient_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_clicks_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "email_campaign_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          client_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          message_id: string | null
          provider: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          provider?: string | null
          sent_at?: string | null
          status: string
          subject: string
          to_email: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          provider?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_marketing_campaigns: {
        Row: {
          ab_test_percentage: number | null
          ab_testing_enabled: boolean | null
          ab_variant_id: string | null
          ab_winning_variant: string | null
          ai_generated: boolean | null
          ai_metadata: Json | null
          ai_prompt: string | null
          bounce_rate: number | null
          bounced_count: number | null
          campaign_type: string
          click_rate: number | null
          clicked_count: number | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          delivered_count: number | null
          description: string | null
          from_name: string
          html_content: string
          id: string
          name: string
          open_rate: number | null
          opened_count: number | null
          plain_text_content: string | null
          preview_text: string | null
          recipient_count: number | null
          reply_to_email: string | null
          scheduled_send_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          subject_line: string
          target_segment: Json
          timezone: string | null
          unsubscribed_count: number | null
          updated_at: string | null
        }
        Insert: {
          ab_test_percentage?: number | null
          ab_testing_enabled?: boolean | null
          ab_variant_id?: string | null
          ab_winning_variant?: string | null
          ai_generated?: boolean | null
          ai_metadata?: Json | null
          ai_prompt?: string | null
          bounce_rate?: number | null
          bounced_count?: number | null
          campaign_type?: string
          click_rate?: number | null
          clicked_count?: number | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          description?: string | null
          from_name: string
          html_content: string
          id?: string
          name: string
          open_rate?: number | null
          opened_count?: number | null
          plain_text_content?: string | null
          preview_text?: string | null
          recipient_count?: number | null
          reply_to_email?: string | null
          scheduled_send_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject_line: string
          target_segment?: Json
          timezone?: string | null
          unsubscribed_count?: number | null
          updated_at?: string | null
        }
        Update: {
          ab_test_percentage?: number | null
          ab_testing_enabled?: boolean | null
          ab_variant_id?: string | null
          ab_winning_variant?: string | null
          ai_generated?: boolean | null
          ai_metadata?: Json | null
          ai_prompt?: string | null
          bounce_rate?: number | null
          bounced_count?: number | null
          campaign_type?: string
          click_rate?: number | null
          clicked_count?: number | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_count?: number | null
          description?: string | null
          from_name?: string
          html_content?: string
          id?: string
          name?: string
          open_rate?: number | null
          opened_count?: number | null
          plain_text_content?: string | null
          preview_text?: string | null
          recipient_count?: number | null
          reply_to_email?: string | null
          scheduled_send_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject_line?: string
          target_segment?: Json
          timezone?: string | null
          unsubscribed_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_marketing_campaigns_ab_variant_id_fkey"
            columns: ["ab_variant_id"]
            isOneToOne: false
            referencedRelation: "email_marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_marketing_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          active: boolean
          client_id: string | null
          created_at: string
          html_content: string
          id: string
          is_default: boolean | null
          is_global: boolean
          name: string
          plain_text_content: string | null
          subject: string
          template_type: string
          updated_at: string
          variables: Json
        }
        Insert: {
          active?: boolean
          client_id?: string | null
          created_at?: string
          html_content: string
          id?: string
          is_default?: boolean | null
          is_global?: boolean
          name: string
          plain_text_content?: string | null
          subject: string
          template_type?: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          active?: boolean
          client_id?: string | null
          created_at?: string
          html_content?: string
          id?: string
          is_default?: boolean | null
          is_global?: boolean
          name?: string
          plain_text_content?: string | null
          subject?: string
          template_type?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates_library: {
        Row: {
          category: string
          created_at: string | null
          css_styles: string | null
          description: string | null
          html_template: string
          id: string
          is_active: boolean | null
          is_ai_optimized: boolean | null
          is_premium: boolean | null
          name: string
          thumbnail_url: string | null
          updated_at: string | null
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          category: string
          created_at?: string | null
          css_styles?: string | null
          description?: string | null
          html_template: string
          id?: string
          is_active?: boolean | null
          is_ai_optimized?: boolean | null
          is_premium?: boolean | null
          name: string
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          category?: string
          created_at?: string | null
          css_styles?: string | null
          description?: string | null
          html_template?: string
          id?: string
          is_active?: boolean | null
          is_ai_optimized?: boolean | null
          is_premium?: boolean | null
          name?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
          variables?: Json | null
        }
        Relationships: []
      }
      email_unsubscribes: {
        Row: {
          created_at: string | null
          email: string
          id: string
          reason: string | null
          unsubscribed_at: string | null
          unsubscribed_from_campaign_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          reason?: string | null
          unsubscribed_at?: string | null
          unsubscribed_from_campaign_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          reason?: string | null
          unsubscribed_at?: string | null
          unsubscribed_from_campaign_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_unsubscribes_unsubscribed_from_campaign_id_fkey"
            columns: ["unsubscribed_from_campaign_id"]
            isOneToOne: false
            referencedRelation: "email_marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string | null
          currency_from: string
          currency_to: string
          effective_date: string
          id: string
          rate: number
          source: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency_from?: string
          currency_to?: string
          effective_date: string
          id?: string
          rate: number
          source?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency_from?: string
          currency_to?: string
          effective_date?: string
          id?: string
          rate?: number
          source?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      financial_logs: {
        Row: {
          action: string
          automated: boolean | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          automated?: boolean | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          automated?: boolean | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      financial_settings: {
        Row: {
          asaas_billing_type: string | null
          auto_billing_enabled: boolean | null
          auto_issue_nfse: boolean | null
          auto_suspend_enabled: boolean | null
          billing_day: number | null
          boleto_config: Json | null
          boleto_provider: string | null
          created_at: string | null
          days_before_suspension: number | null
          days_grace_period: number | null
          default_billing_cycle: string | null
          due_days: number | null
          id: string
          issue_nfse_with_invoice: boolean | null
          late_fee_percentage: number | null
          nfse_default_observations: string | null
          nfse_municipal_service_code: string | null
          nfse_municipal_service_id: string | null
          nfse_service_description: string | null
          overdue_reminder_channels: Json | null
          overdue_reminder_enabled: boolean | null
          overdue_reminder_schedule: Json | null
          overdue_reminder_stop_after_days: number | null
          reminder_intervals: Json | null
          stripe_webhook_secret: string | null
          updated_at: string | null
        }
        Insert: {
          asaas_billing_type?: string | null
          auto_billing_enabled?: boolean | null
          auto_issue_nfse?: boolean | null
          auto_suspend_enabled?: boolean | null
          billing_day?: number | null
          boleto_config?: Json | null
          boleto_provider?: string | null
          created_at?: string | null
          days_before_suspension?: number | null
          days_grace_period?: number | null
          default_billing_cycle?: string | null
          due_days?: number | null
          id?: string
          issue_nfse_with_invoice?: boolean | null
          late_fee_percentage?: number | null
          nfse_default_observations?: string | null
          nfse_municipal_service_code?: string | null
          nfse_municipal_service_id?: string | null
          nfse_service_description?: string | null
          overdue_reminder_channels?: Json | null
          overdue_reminder_enabled?: boolean | null
          overdue_reminder_schedule?: Json | null
          overdue_reminder_stop_after_days?: number | null
          reminder_intervals?: Json | null
          stripe_webhook_secret?: string | null
          updated_at?: string | null
        }
        Update: {
          asaas_billing_type?: string | null
          auto_billing_enabled?: boolean | null
          auto_issue_nfse?: boolean | null
          auto_suspend_enabled?: boolean | null
          billing_day?: number | null
          boleto_config?: Json | null
          boleto_provider?: string | null
          created_at?: string | null
          days_before_suspension?: number | null
          days_grace_period?: number | null
          default_billing_cycle?: string | null
          due_days?: number | null
          id?: string
          issue_nfse_with_invoice?: boolean | null
          late_fee_percentage?: number | null
          nfse_default_observations?: string | null
          nfse_municipal_service_code?: string | null
          nfse_municipal_service_id?: string | null
          nfse_service_description?: string | null
          overdue_reminder_channels?: Json | null
          overdue_reminder_enabled?: boolean | null
          overdue_reminder_schedule?: Json | null
          overdue_reminder_stop_after_days?: number | null
          reminder_intervals?: Json | null
          stripe_webhook_secret?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      integrations: {
        Row: {
          active: boolean
          api_key_encrypted: string | null
          client_id: string | null
          configuration: Json
          created_at: string
          id: string
          integration_type: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          api_key_encrypted?: string | null
          client_id?: string | null
          configuration?: Json
          created_at?: string
          id?: string
          integration_type: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          api_key_encrypted?: string | null
          client_id?: string | null
          configuration?: Json
          created_at?: string
          id?: string
          integration_type?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          asaas_charge_id: string | null
          boleto_barcode: string | null
          boleto_url: string | null
          client_id: string | null
          created_at: string | null
          currency: string | null
          due_date: string
          id: string
          nfse_id: string | null
          nfse_issued_at: string | null
          nfse_number: string | null
          nfse_status: string | null
          nfse_url: string | null
          paid_at: string | null
          payment_method: string | null
          status: string
          stripe_invoice_id: string | null
          subscription_id: string | null
          supplier_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          asaas_charge_id?: string | null
          boleto_barcode?: string | null
          boleto_url?: string | null
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_date: string
          id?: string
          nfse_id?: string | null
          nfse_issued_at?: string | null
          nfse_number?: string | null
          nfse_status?: string | null
          nfse_url?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          asaas_charge_id?: string | null
          boleto_barcode?: string | null
          boleto_url?: string | null
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_date?: string
          id?: string
          nfse_id?: string | null
          nfse_issued_at?: string | null
          nfse_number?: string | null
          nfse_status?: string | null
          nfse_url?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          supplier_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          client_id: string | null
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          priority: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_logs: {
        Row: {
          campaign_id: string | null
          channel: Database["public"]["Enums"]["outreach_channel"]
          clicked_at: string | null
          converted: boolean | null
          converted_at: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          external_message_id: string | null
          id: string
          lead_id: string
          message_sent: string
          metadata: Json | null
          opened_at: string | null
          responded_at: string | null
          response_text: string | null
          sent_at: string
          subject: string | null
        }
        Insert: {
          campaign_id?: string | null
          channel: Database["public"]["Enums"]["outreach_channel"]
          clicked_at?: string | null
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          lead_id: string
          message_sent: string
          metadata?: Json | null
          opened_at?: string | null
          responded_at?: string | null
          response_text?: string | null
          sent_at?: string
          subject?: string | null
        }
        Update: {
          campaign_id?: string | null
          channel?: Database["public"]["Enums"]["outreach_channel"]
          clicked_at?: string | null
          converted?: boolean | null
          converted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_message_id?: string | null
          id?: string
          lead_id?: string
          message_sent?: string
          metadata?: Json | null
          opened_at?: string | null
          responded_at?: string | null
          response_text?: string | null
          sent_at?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "prospecting_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ai_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      overdue_reminders: {
        Row: {
          client_id: string
          created_at: string | null
          days_overdue: number
          email_error: string | null
          email_message_id: string | null
          email_sent_at: string | null
          id: string
          invoice_amount: number
          invoice_due_date: string
          invoice_id: string
          reminder_day: number
          sent_at: string
          sent_via_email: boolean | null
          sent_via_whatsapp: boolean | null
          subscription_id: string | null
          updated_at: string | null
          whatsapp_error: string | null
          whatsapp_message_id: string | null
          whatsapp_sent_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          days_overdue: number
          email_error?: string | null
          email_message_id?: string | null
          email_sent_at?: string | null
          id?: string
          invoice_amount: number
          invoice_due_date: string
          invoice_id: string
          reminder_day: number
          sent_at?: string
          sent_via_email?: boolean | null
          sent_via_whatsapp?: boolean | null
          subscription_id?: string | null
          updated_at?: string | null
          whatsapp_error?: string | null
          whatsapp_message_id?: string | null
          whatsapp_sent_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          days_overdue?: number
          email_error?: string | null
          email_message_id?: string | null
          email_sent_at?: string | null
          id?: string
          invoice_amount?: number
          invoice_due_date?: string
          invoice_id?: string
          reminder_day?: number
          sent_at?: string
          sent_via_email?: boolean | null
          sent_via_whatsapp?: boolean | null
          subscription_id?: string | null
          updated_at?: string | null
          whatsapp_error?: string | null
          whatsapp_message_id?: string | null
          whatsapp_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "overdue_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overdue_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "overdue_reminders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_disputes: {
        Row: {
          created_at: string | null
          description: string
          evidence: Json | null
          id: string
          opened_by: string
          opened_by_role: string
          payment_id: string
          reason: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          evidence?: Json | null
          id?: string
          opened_by: string
          opened_by_role: string
          payment_id: string
          reason: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          evidence?: Json | null
          id?: string
          opened_by?: string
          opened_by_role?: string
          payment_id?: string
          reason?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_disputes_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          asaas_invoice_url: string | null
          asaas_payment_id: string | null
          auto_release_enabled: boolean | null
          client_id: string
          cost_center_id: string | null
          created_at: string | null
          escrow_release_date: string | null
          id: string
          offline_attachments: string[] | null
          offline_notes: string | null
          payment_method: string | null
          payment_type: string | null
          quote_id: string
          related_payment_id: string | null
          release_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          stripe_session_id: string | null
          supplier_id: string | null
          transaction_id: string | null
          transfer_date: string | null
          transfer_method: string | null
          transfer_notes: string | null
          transfer_status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          auto_release_enabled?: boolean | null
          client_id: string
          cost_center_id?: string | null
          created_at?: string | null
          escrow_release_date?: string | null
          id: string
          offline_attachments?: string[] | null
          offline_notes?: string | null
          payment_method?: string | null
          payment_type?: string | null
          quote_id: string
          related_payment_id?: string | null
          release_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          stripe_session_id?: string | null
          supplier_id?: string | null
          transaction_id?: string | null
          transfer_date?: string | null
          transfer_method?: string | null
          transfer_notes?: string | null
          transfer_status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          asaas_invoice_url?: string | null
          asaas_payment_id?: string | null
          auto_release_enabled?: boolean | null
          client_id?: string
          cost_center_id?: string | null
          created_at?: string | null
          escrow_release_date?: string | null
          id?: string
          offline_attachments?: string[] | null
          offline_notes?: string | null
          payment_method?: string | null
          payment_type?: string | null
          quote_id?: string
          related_payment_id?: string | null
          release_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          stripe_session_id?: string | null
          supplier_id?: string | null
          transaction_id?: string | null
          transfer_date?: string | null
          transfer_method?: string | null
          transfer_notes?: string | null
          transfer_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_related_payment_id_fkey"
            columns: ["related_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_profiles: {
        Row: {
          active: boolean
          client_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          permissions: Json
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          permissions?: Json
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions?: Json
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_profiles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_batches: {
        Row: {
          batch_number: string
          cost_per_unit: number | null
          created_at: string | null
          expiry_date: string | null
          id: string
          location: string | null
          manufacturing_date: string | null
          product_id: string
          quantity: number
          status: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          batch_number: string
          cost_per_unit?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          location?: string | null
          manufacturing_date?: string | null
          product_id: string
          quantity?: number
          status?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          batch_number?: string
          cost_per_unit?: number | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          location?: string | null
          manufacturing_date?: string | null
          product_id?: string
          quantity?: number
          status?: string | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_locations: {
        Row: {
          created_at: string | null
          id: string
          location_code: string | null
          location_name: string
          min_stock: number | null
          product_id: string
          quantity: number | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_code?: string | null
          location_name: string
          min_stock?: number | null
          product_id: string
          quantity?: number | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_code?: string | null
          location_name?: string
          min_stock?: number | null
          product_id?: string
          quantity?: number | null
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_locations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_locations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ai_analysis: Json | null
          average_cost: number | null
          batch_control: boolean | null
          category: string | null
          client_id: string | null
          code: string
          competitor_price_max: number | null
          competitor_price_min: number | null
          created_at: string | null
          description: string | null
          expiry_tracking: boolean | null
          id: string
          last_ai_analysis_at: string | null
          last_cost: number | null
          lead_time_days: number | null
          location_tracking: boolean | null
          market_price_avg: number | null
          max_stock_level: number | null
          min_stock_level: number | null
          name: string
          profit_margin: number | null
          reorder_point: number | null
          reorder_quantity: number | null
          status: string | null
          stock_quantity: number | null
          suggested_price: number | null
          supplier_id: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          average_cost?: number | null
          batch_control?: boolean | null
          category?: string | null
          client_id?: string | null
          code?: string
          competitor_price_max?: number | null
          competitor_price_min?: number | null
          created_at?: string | null
          description?: string | null
          expiry_tracking?: boolean | null
          id?: string
          last_ai_analysis_at?: string | null
          last_cost?: number | null
          lead_time_days?: number | null
          location_tracking?: boolean | null
          market_price_avg?: number | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name: string
          profit_margin?: number | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          status?: string | null
          stock_quantity?: number | null
          suggested_price?: number | null
          supplier_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          average_cost?: number | null
          batch_control?: boolean | null
          category?: string | null
          client_id?: string | null
          code?: string
          competitor_price_max?: number | null
          competitor_price_min?: number | null
          created_at?: string | null
          description?: string | null
          expiry_tracking?: boolean | null
          id?: string
          last_ai_analysis_at?: string | null
          last_cost?: number | null
          lead_time_days?: number | null
          location_tracking?: boolean | null
          market_price_avg?: number | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string
          profit_margin?: number | null
          reorder_point?: number | null
          reorder_quantity?: number | null
          status?: string | null
          stock_quantity?: number | null
          suggested_price?: number | null
          supplier_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          avatar_url: string | null
          client_id: string | null
          company_name: string | null
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          name: string
          onboarding_completed: boolean | null
          role: string
          supplier_id: string | null
          tenant_type: string | null
          tour_completed: boolean | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          avatar_url?: string | null
          client_id?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          id: string
          last_login?: string | null
          name: string
          onboarding_completed?: boolean | null
          role?: string
          supplier_id?: string | null
          tenant_type?: string | null
          tour_completed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          avatar_url?: string | null
          client_id?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          name?: string
          onboarding_completed?: boolean | null
          role?: string
          supplier_id?: string | null
          tenant_type?: string | null
          tour_completed?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      prospecting_campaigns: {
        Row: {
          ai_generated_content: Json
          channel: Database["public"]["Enums"]["outreach_channel"]
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          max_leads: number | null
          metrics: Json
          name: string
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          target_filters: Json | null
          target_region: string | null
          target_segment: string
          target_type: Database["public"]["Enums"]["lead_type"]
          updated_at: string
        }
        Insert: {
          ai_generated_content?: Json
          channel: Database["public"]["Enums"]["outreach_channel"]
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          max_leads?: number | null
          metrics?: Json
          name: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_filters?: Json | null
          target_region?: string | null
          target_segment: string
          target_type: Database["public"]["Enums"]["lead_type"]
          updated_at?: string
        }
        Update: {
          ai_generated_content?: Json
          channel?: Database["public"]["Enums"]["outreach_channel"]
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          max_leads?: number | null
          metrics?: Json
          name?: string
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          target_filters?: Json | null
          target_region?: string | null
          target_segment?: string
          target_type?: Database["public"]["Enums"]["lead_type"]
          updated_at?: string
        }
        Relationships: []
      }
      quote_conversations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_message_at: string | null
          quote_id: string
          status: string
          supplier_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          quote_id: string
          status?: string
          supplier_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          quote_id?: string
          status?: string
          supplier_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          client_id: string | null
          cost_center_id: string | null
          created_at: string | null
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          quote_id: string | null
          total: number | null
          unit_price: number | null
        }
        Insert: {
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          quantity: number
          quote_id?: string | null
          total?: number | null
          unit_price?: number | null
        }
        Update: {
          client_id?: string | null
          cost_center_id?: string | null
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          quote_id?: string | null
          total?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_messages: {
        Row: {
          ai_analysis: Json | null
          attachments: string[] | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          ai_analysis?: Json | null
          attachments?: string[] | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          ai_analysis?: Json | null
          attachments?: string[] | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "quote_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_responses: {
        Row: {
          created_at: string | null
          delivery_time: number | null
          id: string
          items: Json | null
          notes: string | null
          payment_terms: string | null
          quote_id: string | null
          shipping_cost: number | null
          status: string | null
          supplier_id: string
          supplier_name: string
          total_amount: number
          warranty_months: number | null
        }
        Insert: {
          created_at?: string | null
          delivery_time?: number | null
          id?: string
          items?: Json | null
          notes?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          shipping_cost?: number | null
          status?: string | null
          supplier_id: string
          supplier_name: string
          total_amount: number
          warranty_months?: number | null
        }
        Update: {
          created_at?: string | null
          delivery_time?: number | null
          id?: string
          items?: Json | null
          notes?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          shipping_cost?: number | null
          status?: string | null
          supplier_id?: string
          supplier_name?: string
          total_amount?: number
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_responses_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_responses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_supplier_status: {
        Row: {
          client_id: string | null
          created_at: string | null
          declined_reason: string | null
          id: string
          last_reminder_sent_at: string | null
          proposal_received_at: string | null
          quote_id: string
          status: string
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          declined_reason?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          proposal_received_at?: string | null
          quote_id: string
          status?: string
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          declined_reason?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          proposal_received_at?: string | null
          quote_id?: string
          status?: string
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_supplier_status_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_suppliers: {
        Row: {
          created_at: string | null
          id: string
          quote_id: string
          supplier_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          quote_id: string
          supplier_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          quote_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_suppliers_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_tokens: {
        Row: {
          access_count: number
          client_id: string | null
          created_at: string
          expires_at: string
          full_token: string
          id: string
          quote_id: string
          short_code: string
          supplier_id: string | null
          used_at: string | null
        }
        Insert: {
          access_count?: number
          client_id?: string | null
          created_at?: string
          expires_at?: string
          full_token: string
          id?: string
          quote_id: string
          short_code: string
          supplier_id?: string | null
          used_at?: string | null
        }
        Update: {
          access_count?: number
          client_id?: string | null
          created_at?: string
          expires_at?: string
          full_token?: string
          id?: string
          quote_id?: string
          short_code?: string
          supplier_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_tokens_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_tokens_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_visits: {
        Row: {
          attachments: Json | null
          client_id: string
          confirmation_notes: string | null
          confirmed_by: string | null
          confirmed_date: string | null
          created_at: string | null
          id: string
          notes: string | null
          previous_date: string | null
          quote_id: string
          requested_date: string
          reschedule_count: number | null
          reschedule_reason: string | null
          scheduled_date: string
          status: string
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          client_id: string
          confirmation_notes?: string | null
          confirmed_by?: string | null
          confirmed_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          previous_date?: string | null
          quote_id: string
          requested_date?: string
          reschedule_count?: number | null
          reschedule_reason?: string | null
          scheduled_date: string
          status?: string
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          client_id?: string
          confirmation_notes?: string | null
          confirmed_by?: string | null
          confirmed_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          previous_date?: string | null
          quote_id?: string
          requested_date?: string
          reschedule_count?: number | null
          reschedule_reason?: string | null
          scheduled_date?: string
          status?: string
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_visits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_visits_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_visits_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          advance_payment_percentage: number | null
          advance_payment_required: boolean | null
          client_id: string
          client_name: string
          cost_center_id: string | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          items_count: number | null
          local_code: string
          on_behalf_of_client_id: string | null
          requires_visit: boolean | null
          responses_count: number | null
          selected_supplier_ids: string[] | null
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
          supplier_scope: string | null
          suppliers_sent_count: number | null
          title: string
          total: number | null
          updated_at: string | null
          visit_deadline: string | null
        }
        Insert: {
          advance_payment_percentage?: number | null
          advance_payment_required?: boolean | null
          client_id: string
          client_name: string
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id: string
          items_count?: number | null
          local_code: string
          on_behalf_of_client_id?: string | null
          requires_visit?: boolean | null
          responses_count?: number | null
          selected_supplier_ids?: string[] | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_scope?: string | null
          suppliers_sent_count?: number | null
          title: string
          total?: number | null
          updated_at?: string | null
          visit_deadline?: string | null
        }
        Update: {
          advance_payment_percentage?: number | null
          advance_payment_required?: boolean | null
          client_id?: string
          client_name?: string
          cost_center_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          items_count?: number | null
          local_code?: string
          on_behalf_of_client_id?: string | null
          requires_visit?: boolean | null
          responses_count?: number | null
          selected_supplier_ids?: string[] | null
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          supplier_scope?: string | null
          suppliers_sent_count?: number | null
          title?: string
          total?: number | null
          updated_at?: string | null
          visit_deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_on_behalf_of_client_id_fkey"
            columns: ["on_behalf_of_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_decision_matrices: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          proposals: Json
          quote_id: string
          quote_title: string
          updated_at: string
          weights: Json
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          proposals?: Json
          quote_id: string
          quote_title: string
          updated_at?: string
          weights?: Json
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          proposals?: Json
          quote_id?: string
          quote_title?: string
          updated_at?: string
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "saved_decision_matrices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_decision_matrices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          client_id: string | null
          columns: Json
          created_at: string
          created_by: string
          description: string | null
          filters: Json
          id: string
          is_public: boolean | null
          name: string
          report_type: string
          schedule: Json | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          columns?: Json
          created_at?: string
          created_by: string
          description?: string | null
          filters?: Json
          id?: string
          is_public?: boolean | null
          name: string
          report_type: string
          schedule?: Json | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          columns?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          filters?: Json
          id?: string
          is_public?: boolean | null
          name?: string
          report_type?: string
          schedule?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          details: Json | null
          id: string
          message: string
          product_id: string
          severity: string
          status: string | null
          supplier_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          message: string
          product_id: string
          severity: string
          status?: string | null
          supplier_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          message?: string
          product_id?: string
          severity?: string
          status?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          current_plan_id: string | null
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_plan_id?: string | null
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_plan_id?: string | null
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active_clients: number | null
          allow_branding: boolean | null
          allow_custom_domain: boolean | null
          child_clients_limit: number | null
          clients_subscribed: number | null
          created_at: string | null
          custom_color: string | null
          description: string | null
          display_name: string
          enabled_modules: Json | null
          features: Json | null
          id: string
          is_popular: boolean | null
          max_categories_per_supplier: number | null
          max_products_in_catalog: number | null
          max_quote_responses_per_month: number | null
          max_quotes: number
          max_quotes_per_month: number | null
          max_storage_gb: number
          max_suppliers: number
          max_suppliers_per_quote: number | null
          max_users: number
          max_users_per_client: number | null
          monthly_price: number
          name: string
          status: string | null
          suppliers_subscribed: number | null
          target_audience: string | null
          total_revenue: number | null
          updated_at: string | null
          yearly_price: number
        }
        Insert: {
          active_clients?: number | null
          allow_branding?: boolean | null
          allow_custom_domain?: boolean | null
          child_clients_limit?: number | null
          clients_subscribed?: number | null
          created_at?: string | null
          custom_color?: string | null
          description?: string | null
          display_name: string
          enabled_modules?: Json | null
          features?: Json | null
          id: string
          is_popular?: boolean | null
          max_categories_per_supplier?: number | null
          max_products_in_catalog?: number | null
          max_quote_responses_per_month?: number | null
          max_quotes?: number
          max_quotes_per_month?: number | null
          max_storage_gb?: number
          max_suppliers?: number
          max_suppliers_per_quote?: number | null
          max_users?: number
          max_users_per_client?: number | null
          monthly_price?: number
          name: string
          status?: string | null
          suppliers_subscribed?: number | null
          target_audience?: string | null
          total_revenue?: number | null
          updated_at?: string | null
          yearly_price?: number
        }
        Update: {
          active_clients?: number | null
          allow_branding?: boolean | null
          allow_custom_domain?: boolean | null
          child_clients_limit?: number | null
          clients_subscribed?: number | null
          created_at?: string | null
          custom_color?: string | null
          description?: string | null
          display_name?: string
          enabled_modules?: Json | null
          features?: Json | null
          id?: string
          is_popular?: boolean | null
          max_categories_per_supplier?: number | null
          max_products_in_catalog?: number | null
          max_quote_responses_per_month?: number | null
          max_quotes?: number
          max_quotes_per_month?: number | null
          max_storage_gb?: number
          max_suppliers?: number
          max_suppliers_per_quote?: number | null
          max_users?: number
          max_users_per_client?: number | null
          monthly_price?: number
          name?: string
          status?: string | null
          suppliers_subscribed?: number | null
          target_audience?: string | null
          total_revenue?: number | null
          updated_at?: string | null
          yearly_price?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          billing_cycle: string
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          client_id: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          supplier_id: string | null
          trial_end: string | null
          updated_at: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          client_id?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start?: string
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          supplier_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_cycle?: string
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          client_id?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          supplier_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_ratings: {
        Row: {
          client_id: string
          comments: string | null
          communication_rating: number | null
          created_at: string
          delivery_id: string | null
          delivery_rating: number | null
          id: string
          payment_id: string | null
          price_rating: number | null
          quality_rating: number | null
          quote_id: string
          rater_id: string
          rating: number
          supplier_id: string
          updated_at: string
          user_id: string | null
          would_recommend: boolean | null
        }
        Insert: {
          client_id: string
          comments?: string | null
          communication_rating?: number | null
          created_at?: string
          delivery_id?: string | null
          delivery_rating?: number | null
          id?: string
          payment_id?: string | null
          price_rating?: number | null
          quality_rating?: number | null
          quote_id: string
          rater_id: string
          rating: number
          supplier_id: string
          updated_at?: string
          user_id?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          client_id?: string
          comments?: string | null
          communication_rating?: number | null
          created_at?: string
          delivery_id?: string | null
          delivery_rating?: number | null
          id?: string
          payment_id?: string | null
          price_rating?: number | null
          quality_rating?: number | null
          quote_id?: string
          rater_id?: string
          rating?: number
          supplier_id?: string
          updated_at?: string
          user_id?: string | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ratings_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_transfers: {
        Row: {
          amount: number
          asaas_transfer_id: string | null
          bank_account: Json
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          notes: string | null
          processed_at: string | null
          requested_at: string
          status: string
          supplier_id: string
          transfer_method: string
          updated_at: string
        }
        Insert: {
          amount: number
          asaas_transfer_id?: string | null
          bank_account: Json
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          supplier_id: string
          transfer_method: string
          updated_at?: string
        }
        Update: {
          amount?: number
          asaas_transfer_id?: string | null
          bank_account?: Json
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
          supplier_id?: string
          transfer_method?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_transfers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: Json | null
          asaas_wallet_id: string | null
          bank_data: Json | null
          business_info: Json | null
          certification_date: string | null
          certification_expires_at: string | null
          certification_status: string | null
          city: string | null
          client_id: string | null
          cnpj: string
          completed_orders: number | null
          created_at: string | null
          document_number: string | null
          document_type: string
          email: string
          id: string
          invited_by_clients: string[] | null
          is_certified: boolean | null
          last_invitation_sent: string | null
          name: string
          phone: string | null
          rating: number | null
          region: string | null
          registration_completed_at: string | null
          registration_status: string | null
          specialties: string[] | null
          state: string | null
          status: string | null
          subscription_plan_id: string | null
          type: string | null
          updated_at: string | null
          visibility_scope: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: Json | null
          asaas_wallet_id?: string | null
          bank_data?: Json | null
          business_info?: Json | null
          certification_date?: string | null
          certification_expires_at?: string | null
          certification_status?: string | null
          city?: string | null
          client_id?: string | null
          cnpj: string
          completed_orders?: number | null
          created_at?: string | null
          document_number?: string | null
          document_type?: string
          email: string
          id?: string
          invited_by_clients?: string[] | null
          is_certified?: boolean | null
          last_invitation_sent?: string | null
          name: string
          phone?: string | null
          rating?: number | null
          region?: string | null
          registration_completed_at?: string | null
          registration_status?: string | null
          specialties?: string[] | null
          state?: string | null
          status?: string | null
          subscription_plan_id?: string | null
          type?: string | null
          updated_at?: string | null
          visibility_scope?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: Json | null
          asaas_wallet_id?: string | null
          bank_data?: Json | null
          business_info?: Json | null
          certification_date?: string | null
          certification_expires_at?: string | null
          certification_status?: string | null
          city?: string | null
          client_id?: string | null
          cnpj?: string
          completed_orders?: number | null
          created_at?: string | null
          document_number?: string | null
          document_type?: string
          email?: string
          id?: string
          invited_by_clients?: string[] | null
          is_certified?: boolean | null
          last_invitation_sent?: string | null
          name?: string
          phone?: string | null
          rating?: number | null
          region?: string | null
          registration_completed_at?: string | null
          registration_status?: string | null
          specialties?: string[] | null
          state?: string | null
          status?: string | null
          subscription_plan_id?: string | null
          type?: string | null
          updated_at?: string | null
          visibility_scope?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers_backup: {
        Row: {
          address: Json | null
          business_info: Json | null
          certification_date: string | null
          certification_expires_at: string | null
          city: string | null
          client_id: string | null
          cnpj: string | null
          completed_orders: number | null
          created_at: string | null
          email: string | null
          id: string | null
          is_certified: boolean | null
          name: string | null
          phone: string | null
          rating: number | null
          region: string | null
          specialties: string[] | null
          state: string | null
          status: string | null
          subscription_plan_id: string | null
          type: string | null
          updated_at: string | null
          visibility_scope: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: Json | null
          business_info?: Json | null
          certification_date?: string | null
          certification_expires_at?: string | null
          city?: string | null
          client_id?: string | null
          cnpj?: string | null
          completed_orders?: number | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_certified?: boolean | null
          name?: string | null
          phone?: string | null
          rating?: number | null
          region?: string | null
          specialties?: string[] | null
          state?: string | null
          status?: string | null
          subscription_plan_id?: string | null
          type?: string | null
          updated_at?: string | null
          visibility_scope?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: Json | null
          business_info?: Json | null
          certification_date?: string | null
          certification_expires_at?: string | null
          city?: string | null
          client_id?: string | null
          cnpj?: string | null
          completed_orders?: number | null
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_certified?: boolean | null
          name?: string | null
          phone?: string | null
          rating?: number | null
          region?: string | null
          specialties?: string[] | null
          state?: string | null
          status?: string | null
          subscription_plan_id?: string | null
          type?: string | null
          updated_at?: string | null
          visibility_scope?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          category: string | null
          client_id: string
          client_name: string | null
          created_at: string | null
          created_by: string
          created_by_name: string | null
          description: string
          id: string
          priority: string
          status: string
          subject: string
          supplier_id: string | null
          supplier_name: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          category?: string | null
          client_id: string
          client_name?: string | null
          created_at?: string | null
          created_by: string
          created_by_name?: string | null
          description: string
          id?: string
          priority?: string
          status?: string
          subject: string
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          category?: string | null
          client_id?: string
          client_name?: string | null
          created_at?: string | null
          created_by?: string
          created_by_name?: string | null
          description?: string
          id?: string
          priority?: string
          status?: string
          subject?: string
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachments: string[]
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          sender_id: string
          sender_name: string | null
          ticket_id: string
        }
        Insert: {
          attachments?: string[]
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          sender_id: string
          sender_name?: string | null
          ticket_id: string
        }
        Update: {
          attachments?: string[]
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          sender_id?: string
          sender_name?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_memberships: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_group_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_system_group: boolean | null
          name: string
          permission_profile_id: string | null
          permissions: string[] | null
          updated_at: string
          user_count: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system_group?: boolean | null
          name: string
          permission_profile_id?: string | null
          permissions?: string[] | null
          updated_at?: string
          user_count?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system_group?: boolean | null
          name?: string
          permission_profile_id?: string | null
          permissions?: string[] | null
          updated_at?: string
          user_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_permission_profile_id_fkey"
            columns: ["permission_profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          avatar_url: string | null
          client_id: string | null
          company_name: string | null
          created_at: string | null
          display_name: string | null
          id: string
          notifications: Json
          phone: string | null
          preferences: Json
          two_factor_enabled: boolean | null
          two_factor_method: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          notifications?: Json
          phone?: string | null
          preferences?: Json
          two_factor_enabled?: boolean | null
          two_factor_method?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          client_id?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          notifications?: Json
          phone?: string | null
          preferences?: Json
          two_factor_enabled?: boolean | null
          two_factor_method?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          client_id: string | null
          created_at: string
          email: string
          force_password_change: boolean | null
          id: string
          last_access: string | null
          name: string
          permission_profile_id: string | null
          phone: string | null
          role: string
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          email: string
          force_password_change?: boolean | null
          id?: string
          last_access?: string | null
          name: string
          permission_profile_id?: string | null
          phone?: string | null
          role?: string
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          email?: string
          force_password_change?: boolean | null
          id?: string
          last_access?: string | null
          name?: string
          permission_profile_id?: string | null
          phone?: string | null
          role?: string
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_permission_profile_id_fkey"
            columns: ["permission_profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_settings: {
        Row: {
          auto_confirm_after_days: number | null
          auto_disqualify_on_overdue: boolean | null
          client_id: string
          created_at: string | null
          id: string
          max_reschedule_attempts: number
          notify_before_visit_days: number | null
          notify_on_overdue: boolean | null
          overdue_tolerance_days: number
          updated_at: string | null
        }
        Insert: {
          auto_confirm_after_days?: number | null
          auto_disqualify_on_overdue?: boolean | null
          client_id: string
          created_at?: string | null
          id?: string
          max_reschedule_attempts?: number
          notify_before_visit_days?: number | null
          notify_on_overdue?: boolean | null
          overdue_tolerance_days?: number
          updated_at?: string | null
        }
        Update: {
          auto_confirm_after_days?: number | null
          auto_disqualify_on_overdue?: boolean | null
          client_id?: string
          created_at?: string | null
          id?: string
          max_reschedule_attempts?: number
          notify_before_visit_days?: number | null
          notify_on_overdue?: boolean | null
          overdue_tolerance_days?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          active: boolean
          client_id: string | null
          created_at: string
          id: string
          is_default: boolean | null
          is_global: boolean
          message_content: string
          name: string
          subject: string | null
          template_type: string
          updated_at: string
          variables: Json
        }
        Insert: {
          active?: boolean
          client_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_global?: boolean
          message_content: string
          name: string
          subject?: string | null
          template_type?: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          active?: boolean
          client_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_global?: boolean
          message_content?: string
          name?: string
          subject?: string | null
          template_type?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ai_usage_summary: {
        Row: {
          client_id: string | null
          client_name: string | null
          feature: string | null
          month: string | null
          provider: string | null
          request_count: number | null
          total_completion_tokens: number | null
          total_cost_usd: number | null
          total_prompt_tokens: number | null
          total_tokens: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_token_usage_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals_with_details: {
        Row: {
          approved_at: string | null
          approver_active: boolean | null
          approver_email: string | null
          approver_id: string | null
          approver_name: string | null
          comments: string | null
          created_at: string | null
          id: string | null
          quote_client_id: string | null
          quote_id: string | null
          quote_status: string | null
          quote_title: string | null
          quote_total: number | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["quote_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_offline_payment: {
        Args: { p_approved: boolean; p_notes?: string; p_payment_id: string }
        Returns: Json
      }
      associate_supplier_to_client: {
        Args: { p_client_id?: string; p_supplier_id: string }
        Returns: string
      }
      check_approval_required: {
        Args: { p_amount: number; p_client_id: string; p_quote_id: string }
        Returns: Json
      }
      check_overdue_accounts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_quote_deadlines_for_suppliers: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      check_user_email_exists: {
        Args: { user_email: string }
        Returns: boolean
      }
      clean_invalid_approvers: {
        Args: Record<PropertyKey, never>
        Returns: {
          level_id: string
          level_name: string
          removed_approvers: string[]
          valid_approvers_count: number
        }[]
      }
      create_default_cost_centers: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_action_url?: string
          p_message: string
          p_metadata?: Json
          p_priority?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      current_user_account_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_user_can_see_quote: {
        Args: { quote_id_param: string }
        Returns: boolean
      }
      find_or_create_supplier_by_cnpj: {
        Args: {
          p_cnpj: string
          p_email?: string
          p_name?: string
          p_phone?: string
        }
        Returns: {
          certification_status: string
          existing_name: string
          is_new: boolean
          supplier_id: string
        }[]
      }
      generate_contract_alerts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_delivery_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_friendly_payment_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_accessible_client_ids: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_client_suppliers: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: Json
          associated_at: string
          association_status: string
          certification_status: string
          cnpj: string
          completed_orders: number
          email: string
          id: string
          name: string
          phone: string
          rating: number
          specialties: string[]
          status: string
          website: string
          whatsapp: string
        }[]
      }
      get_cost_center_hierarchy: {
        Args: { p_client_id: string }
        Returns: {
          budget_annual: number
          budget_monthly: number
          code: string
          description: string
          id: string
          level: number
          name: string
          parent_id: string
          path: string
        }[]
      }
      get_cost_center_spending: {
        Args: {
          p_client_id: string
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          budget_annual: number
          budget_monthly: number
          budget_variance_annual: number
          budget_variance_monthly: number
          cost_center_code: string
          cost_center_id: string
          cost_center_name: string
          payment_count: number
          quote_count: number
          total_spent: number
        }[]
      }
      get_current_user_client_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_plan: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_clients: number | null
          allow_branding: boolean | null
          allow_custom_domain: boolean | null
          child_clients_limit: number | null
          clients_subscribed: number | null
          created_at: string | null
          custom_color: string | null
          description: string | null
          display_name: string
          enabled_modules: Json | null
          features: Json | null
          id: string
          is_popular: boolean | null
          max_categories_per_supplier: number | null
          max_products_in_catalog: number | null
          max_quote_responses_per_month: number | null
          max_quotes: number
          max_quotes_per_month: number | null
          max_storage_gb: number
          max_suppliers: number
          max_suppliers_per_quote: number | null
          max_users: number
          max_users_per_client: number | null
          monthly_price: number
          name: string
          status: string | null
          suppliers_subscribed: number | null
          target_audience: string | null
          total_revenue: number | null
          updated_at: string | null
          yearly_price: number
        }
      }
      get_current_user_supplier_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_default_supplier_plan_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_or_create_client_usage: {
        Args: { client_uuid: string }
        Returns: {
          categories_count: number
          client_id: string
          created_at: string
          id: string
          last_reset_date: string
          products_in_catalog: number
          quote_responses_this_month: number
          quotes_this_month: number
          storage_used_gb: number
          updated_at: string
          users_count: number
        }
      }
      get_or_create_user_settings: {
        Args: { user_uuid: string }
        Returns: {
          avatar_url: string | null
          client_id: string | null
          company_name: string | null
          created_at: string | null
          display_name: string | null
          id: string
          notifications: Json
          phone: string | null
          preferences: Json
          two_factor_enabled: boolean | null
          two_factor_method: string | null
          updated_at: string | null
          user_id: string
        }
      }
      get_supplier_average_rating: {
        Args: { supplier_uuid: string }
        Returns: {
          avg_communication: number
          avg_delivery: number
          avg_price: number
          avg_quality: number
          avg_rating: number
          recommendation_rate: number
          total_ratings: number
        }[]
      }
      get_user_created_at: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_enabled_modules: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      has_role_text: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
      initialize_client_data: {
        Args: { client_uuid: string }
        Returns: undefined
      }
      initialize_user_profile: {
        Args: { user_email: string; user_id: string; user_name?: string }
        Returns: string
      }
      invite_supplier_certification: {
        Args: { p_message?: string; p_supplier_id: string }
        Returns: Json
      }
      is_first_user_of_client: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      link_user_to_client: {
        Args: { target_client_id: string; user_id: string }
        Returns: boolean
      }
      mark_payment_as_manually_received: {
        Args: { p_notes?: string; p_payment_id: string }
        Returns: Json
      }
      next_contract_id_by_client: {
        Args: { p_client_id: string; prefix?: string }
        Returns: string
      }
      next_delivery_id_by_client: {
        Args: { p_client_id: string; prefix?: string }
        Returns: string
      }
      next_local_quote_code_by_client: {
        Args: { p_client_id: string; prefix?: string }
        Returns: string
      }
      next_payment_id_by_client: {
        Args: { p_client_id: string; prefix?: string }
        Returns: string
      }
      next_product_code: {
        Args: { prefix?: string }
        Returns: string
      }
      next_product_id_by_client: {
        Args: { p_client_id: string; prefix?: string }
        Returns: string
      }
      next_quote_id_by_client: {
        Args: { p_client_id: string; prefix?: string }
        Returns: string
      }
      next_ticket_id: {
        Args: { prefix?: string }
        Returns: string
      }
      normalize_cnpj: {
        Args: { cnpj_in: string }
        Returns: string
      }
      notify_client_users: {
        Args: {
          p_action_url?: string
          p_client_id: string
          p_message: string
          p_metadata?: Json
          p_priority?: string
          p_title: string
          p_type?: string
        }
        Returns: undefined
      }
      reset_monthly_usage: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      run_automatic_billing: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      search_supplier_by_cnpj: {
        Args: { search_cnpj: string }
        Returns: {
          address: Json
          certification_status: string
          cnpj: string
          email: string
          id: string
          is_associated: boolean
          name: string
          phone: string
          specialties: string[]
          status: string
          website: string
          whatsapp: string
        }[]
      }
      send_automatic_reminders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      suggest_suppliers_for_quote: {
        Args: {
          _categories: string[]
          _client_city: string
          _client_region: string
          _client_state: string
          _max_suppliers?: number
        }
        Returns: {
          city: string
          is_certified: boolean
          match_score: number
          name: string
          rating: number
          region: string
          specialties: string[]
          state: string
          supplier_id: string
          visibility_scope: string
        }[]
      }
      trigger_scheduled_email_campaigns: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      trigger_send_overdue_reminders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_has_all_modules_access: {
        Args: { _module_keys: string[] }
        Returns: boolean
      }
      user_has_any_module_access: {
        Args: { _module_keys: string[] }
        Returns: boolean
      }
      user_has_module_access: {
        Args: { _module_key: string }
        Returns: boolean
      }
      validate_approval_level_approvers: {
        Args: { p_level_id: string }
        Returns: {
          approver_email: string
          approver_id: string
          approver_name: string
          is_active: boolean
          is_valid: boolean
        }[]
      }
      validate_coupon: {
        Args: {
          coupon_code: string
          plan_id?: string
          purchase_amount?: number
          user_uuid?: string
        }
        Returns: {
          coupon_id: string
          discount_type: string
          discount_value: number
          error_message: string
          final_discount: number
          max_discount_amount: number
          valid: boolean
        }[]
      }
      validate_supplier_status_for_association: {
        Args: { p_supplier_id: string }
        Returns: Json
      }
    }
    Enums: {
      account_status: "active" | "inactive" | "suspended" | "trial"
      app_role:
        | "super_admin"
        | "admin_cliente"
        | "solicitante"
        | "aprovador_n1"
        | "aprovador_n2"
        | "aprovador_n3"
        | "financeiro"
        | "suporte_cliente"
        | "fornecedor"
        | "manager"
        | "collaborator"
      campaign_status: "draft" | "active" | "paused" | "completed" | "cancelled"
      client_type: "direct" | "administradora" | "condominio_vinculado"
      lead_status: "new" | "contacted" | "qualified" | "converted" | "lost"
      lead_type: "client" | "supplier"
      outreach_channel: "whatsapp" | "email" | "phone" | "linkedin"
      supplier_status: "pending" | "approved" | "suspended" | "rejected"
      user_status: "active" | "inactive" | "pending" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "inactive", "suspended", "trial"],
      app_role: [
        "super_admin",
        "admin_cliente",
        "solicitante",
        "aprovador_n1",
        "aprovador_n2",
        "aprovador_n3",
        "financeiro",
        "suporte_cliente",
        "fornecedor",
        "manager",
        "collaborator",
      ],
      campaign_status: ["draft", "active", "paused", "completed", "cancelled"],
      client_type: ["direct", "administradora", "condominio_vinculado"],
      lead_status: ["new", "contacted", "qualified", "converted", "lost"],
      lead_type: ["client", "supplier"],
      outreach_channel: ["whatsapp", "email", "phone", "linkedin"],
      supplier_status: ["pending", "approved", "suspended", "rejected"],
      user_status: ["active", "inactive", "pending", "suspended"],
    },
  },
} as const
