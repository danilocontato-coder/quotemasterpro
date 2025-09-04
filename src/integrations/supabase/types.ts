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
      approval_levels: {
        Row: {
          active: boolean
          amount_threshold: number
          approvers: string[]
          client_id: string
          created_at: string
          id: string
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
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
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
          code: string
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
          name: string
          role: string
          supplier_id: string | null
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
          name: string
          role?: string
          supplier_id?: string | null
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
          name?: string
          role?: string
          supplier_id?: string | null
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
          notes: string | null
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
          notes?: string | null
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
          notes?: string | null
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
          status: string | null
          supplier_id: string | null
          supplier_name: string | null
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
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
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
          status?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
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
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          features: Json | null
          id: string
          is_popular: boolean | null
          max_quotes: number
          max_storage_gb: number
          max_suppliers: number
          max_users: number
          monthly_price: number
          name: string
          status: string | null
          target_audience: string | null
          updated_at: string | null
          yearly_price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          features?: Json | null
          id: string
          is_popular?: boolean | null
          max_quotes?: number
          max_storage_gb?: number
          max_suppliers?: number
          max_users?: number
          monthly_price?: number
          name: string
          status?: string | null
          target_audience?: string | null
          updated_at?: string | null
          yearly_price?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          is_popular?: boolean | null
          max_quotes?: number
          max_storage_gb?: number
          max_suppliers?: number
          max_users?: number
          monthly_price?: number
          name?: string
          status?: string | null
          target_audience?: string | null
          updated_at?: string | null
          yearly_price?: number
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: Json | null
          business_info: Json | null
          city: string | null
          client_id: string | null
          cnpj: string
          completed_orders: number | null
          created_at: string | null
          email: string
          id: string
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
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: Json | null
          business_info?: Json | null
          city?: string | null
          client_id?: string | null
          cnpj: string
          completed_orders?: number | null
          created_at?: string | null
          email: string
          id?: string
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
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: Json | null
          business_info?: Json | null
          city?: string | null
          client_id?: string | null
          cnpj?: string
          completed_orders?: number | null
          created_at?: string | null
          email?: string
          id?: string
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
      current_user_account_id: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      validate_user_creation: {
        Args: { user_email: string; user_role: string }
        Returns: boolean
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
