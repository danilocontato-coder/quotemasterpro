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
        Relationships: []
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
        Relationships: []
      }
      categories: {
        Row: {
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
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
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
          phone: string | null
          settings: Json | null
          status: string | null
          subscription_plan_id: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          address?: string | null
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
          phone?: string | null
          settings?: Json | null
          status?: string | null
          subscription_plan_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          address?: string | null
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
          phone?: string | null
          settings?: Json | null
          status?: string | null
          subscription_plan_id?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
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
        Relationships: []
      }
      deliveries: {
        Row: {
          actual_delivery_date: string | null
          client_id: string
          created_at: string
          delivery_address: string
          id: string
          notes: string | null
          quote_id: string
          scheduled_date: string
          status: string
          supplier_id: string
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          client_id: string
          created_at?: string
          delivery_address: string
          id?: string
          notes?: string | null
          quote_id: string
          scheduled_date: string
          status?: string
          supplier_id: string
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          client_id?: string
          created_at?: string
          delivery_address?: string
          id?: string
          notes?: string | null
          quote_id?: string
          scheduled_date?: string
          status?: string
          supplier_id?: string
          tracking_code?: string | null
          updated_at?: string
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
      notifications: {
        Row: {
          action_url: string | null
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
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string | null
          escrow_release_date: string | null
          id: string
          quote_id: string
          status: string | null
          stripe_session_id: string | null
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string | null
          escrow_release_date?: string | null
          id: string
          quote_id: string
          status?: string | null
          stripe_session_id?: string | null
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string | null
          escrow_release_date?: string | null
          id?: string
          quote_id?: string
          status?: string | null
          stripe_session_id?: string | null
          supplier_id?: string
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
            foreignKeyName: "payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          client_id: string | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          stock_quantity: number | null
          supplier_id: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          client_id?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          stock_quantity?: number | null
          supplier_id?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          client_id?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          stock_quantity?: number | null
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
      quote_items: {
        Row: {
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
      quote_responses: {
        Row: {
          created_at: string | null
          delivery_time: number | null
          id: string
          items: Json | null
          notes: string | null
          payment_terms: string | null
          quote_id: string | null
          status: string | null
          supplier_id: string
          supplier_name: string
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          delivery_time?: number | null
          id?: string
          items?: Json | null
          notes?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          status?: string | null
          supplier_id: string
          supplier_name: string
          total_amount: number
        }
        Update: {
          created_at?: string | null
          delivery_time?: number | null
          id?: string
          items?: Json | null
          notes?: string | null
          payment_terms?: string | null
          quote_id?: string | null
          status?: string | null
          supplier_id?: string
          supplier_name?: string
          total_amount?: number
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
      quotes: {
        Row: {
          client_id: string
          client_name: string
          created_at: string | null
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          items_count: number | null
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
        }
        Insert: {
          client_id: string
          client_name: string
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id: string
          items_count?: number | null
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
        }
        Update: {
          client_id?: string
          client_name?: string
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          items_count?: number | null
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
            foreignKeyName: "quotes_supplier_id_fkey"
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
          clients_subscribed: number | null
          created_at: string | null
          custom_color: string | null
          description: string | null
          display_name: string
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
          clients_subscribed?: number | null
          created_at?: string | null
          custom_color?: string | null
          description?: string | null
          display_name: string
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
          clients_subscribed?: number | null
          created_at?: string | null
          custom_color?: string | null
          description?: string | null
          display_name?: string
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
      suppliers: {
        Row: {
          address: Json | null
          business_info: Json | null
          certification_date: string | null
          certification_expires_at: string | null
          city: string | null
          client_id: string | null
          cnpj: string
          completed_orders: number | null
          created_at: string | null
          email: string
          id: string
          is_certified: boolean | null
          name: string
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
          cnpj: string
          completed_orders?: number | null
          created_at?: string | null
          email: string
          id?: string
          is_certified?: boolean | null
          name: string
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
          cnpj?: string
          completed_orders?: number | null
          created_at?: string | null
          email?: string
          id?: string
          is_certified?: boolean | null
          name?: string
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
        Relationships: [
          {
            foreignKeyName: "suppliers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_subscription_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
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
      user_settings: {
        Row: {
          avatar_url: string | null
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
        Relationships: []
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
      whatsapp_templates: {
        Row: {
          active: boolean
          client_id: string | null
          created_at: string
          id: string
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
      [_ in never]: never
    }
    Functions: {
      check_user_email_exists: {
        Args: { user_email: string }
        Returns: boolean
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
      get_current_user_client_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_supplier_id: {
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
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
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
      link_user_to_client: {
        Args: { target_client_id: string; user_id: string }
        Returns: boolean
      }
      next_product_code: {
        Args: { prefix?: string }
        Returns: string
      }
      next_quote_id: {
        Args: { prefix?: string }
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
      ],
      supplier_status: ["pending", "approved", "suspended", "rejected"],
      user_status: ["active", "inactive", "pending", "suspended"],
    },
  },
} as const
