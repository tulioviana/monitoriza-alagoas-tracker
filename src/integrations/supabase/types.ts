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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          target_id: string | null
          target_table: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          admin_user_id: string | null
          amount: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          admin_user_id?: string | null
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          admin_user_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      establishments: {
        Row: {
          address_json: Json
          cnpj: string
          nome_fantasia: string | null
          razao_social: string
        }
        Insert: {
          address_json: Json
          cnpj: string
          nome_fantasia?: string | null
          razao_social: string
        }
        Update: {
          address_json?: Json
          cnpj?: string
          nome_fantasia?: string | null
          razao_social?: string
        }
        Relationships: []
      }
      monitoring_preferences: {
        Row: {
          created_at: string
          enable_notifications: boolean
          max_items_per_user: number
          price_change_threshold: number | null
          update_frequency_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enable_notifications?: boolean
          max_items_per_user?: number
          price_change_threshold?: number | null
          update_frequency_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enable_notifications?: boolean
          max_items_per_user?: number
          price_change_threshold?: number | null
          update_frequency_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          api_response_metadata: Json | null
          created_at: string
          declared_price: number | null
          establishment_address: Json | null
          establishment_cnpj: string | null
          establishment_name: string | null
          fetch_date: string
          id: number
          price_change_percent: number | null
          sale_price: number
          tracked_item_id: number
        }
        Insert: {
          api_response_metadata?: Json | null
          created_at?: string
          declared_price?: number | null
          establishment_address?: Json | null
          establishment_cnpj?: string | null
          establishment_name?: string | null
          fetch_date?: string
          id?: never
          price_change_percent?: number | null
          sale_price: number
          tracked_item_id: number
        }
        Update: {
          api_response_metadata?: Json | null
          created_at?: string
          declared_price?: number | null
          establishment_address?: Json | null
          establishment_cnpj?: string | null
          establishment_name?: string | null
          fetch_date?: string
          id?: never
          price_change_percent?: number | null
          sale_price?: number
          tracked_item_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_history_tracked_item_id_fkey"
            columns: ["tracked_item_id"]
            isOneToOne: false
            referencedRelation: "tracked_items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          app_name: string | null
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          plan: Database["public"]["Enums"]["user_plan"]
        }
        Insert: {
          app_name?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          plan?: Database["public"]["Enums"]["user_plan"]
        }
        Update: {
          app_name?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          plan?: Database["public"]["Enums"]["user_plan"]
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          item_type: string
          search_criteria: Json
          searched_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_type: string
          search_criteria: Json
          searched_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: string
          search_criteria?: Json
          searched_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_execution_logs: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          execution_details: Json | null
          execution_type: string
          function_name: string
          id: number
          items_failed: number | null
          items_processed: number | null
          items_successful: number | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_details?: Json | null
          execution_type?: string
          function_name: string
          id?: number
          items_failed?: number | null
          items_processed?: number | null
          items_successful?: number | null
          started_at?: string
          status: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_details?: Json | null
          execution_type?: string
          function_name?: string
          id?: number
          items_failed?: number | null
          items_processed?: number | null
          items_successful?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          auto_update_enabled: boolean
          created_at: string
          id: string
          max_items: number | null
          search_radius: number | null
          update_frequency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_update_enabled?: boolean
          created_at?: string
          id?: string
          max_items?: number | null
          search_radius?: number | null
          update_frequency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_update_enabled?: boolean
          created_at?: string
          id?: string
          max_items?: number | null
          search_radius?: number | null
          update_frequency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracked_items: {
        Row: {
          created_at: string
          establishment_cnpj: string | null
          establishment_name: string | null
          id: number
          is_active: boolean
          item_type: string
          last_price: number | null
          last_updated_at: string | null
          nickname: string
          price_trend: string | null
          search_criteria: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          establishment_cnpj?: string | null
          establishment_name?: string | null
          id?: never
          is_active?: boolean
          item_type: string
          last_price?: number | null
          last_updated_at?: string | null
          nickname: string
          price_trend?: string | null
          search_criteria: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          establishment_cnpj?: string | null
          establishment_name?: string | null
          id?: never
          is_active?: boolean
          item_type?: string
          last_price?: number | null
          last_updated_at?: string | null
          nickname?: string
          price_trend?: string | null
          search_criteria?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          created_at: string
          current_balance: number
          total_consumed: number
          total_purchased: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          total_consumed?: number
          total_purchased?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          total_consumed?: number
          total_purchased?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_credits: {
        Args: {
          p_admin_user_id?: string
          p_amount: number
          p_description?: string
          p_transaction_type?: Database["public"]["Enums"]["transaction_type"]
          p_user_id: string
        }
        Returns: boolean
      }
      admin_add_credits: {
        Args: {
          p_amount: number
          p_description?: string
          p_target_user_id: string
        }
        Returns: boolean
      }
      assign_admin_to_email: {
        Args: { target_email: string }
        Returns: undefined
      }
      calculate_price_trend: {
        Args: { p_new_price: number; p_tracked_item_id: number }
        Returns: string
      }
      cleanup_execution_logs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_search_history: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      consume_credit: {
        Args: {
          p_description?: string
          p_reference_id?: string
          p_user_id: string
        }
        Returns: boolean
      }
      ensure_admin_role: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_items_needing_update: {
        Args: Record<PropertyKey, never>
        Returns: {
          item_id: number
          item_type: string
          nickname: string
          search_criteria: Json
          update_frequency_minutes: number
          user_id: string
        }[]
      }
      get_user_credits: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_admin: {
        Args: { check_user_id: string }
        Returns: boolean
      }
      search_user_by_id: {
        Args: { admin_user_id?: string; user_uuid: string }
        Returns: {
          current_balance: number
          email: string
          full_name: string
          id: string
        }[]
      }
      search_users_by_email: {
        Args: { admin_user_id?: string; search_email: string }
        Returns: {
          current_balance: number
          email: string
          full_name: string
          id: string
        }[]
      }
      search_users_by_name: {
        Args: { admin_user_id?: string; search_name: string }
        Returns: {
          current_balance: number
          email: string
          full_name: string
          id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      transaction_type:
        | "purchase"
        | "consumption"
        | "admin_adjustment"
        | "refund"
        | "bonus"
      user_plan: "lite" | "pro"
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
      app_role: ["admin", "user"],
      transaction_type: [
        "purchase",
        "consumption",
        "admin_adjustment",
        "refund",
        "bonus",
      ],
      user_plan: ["lite", "pro"],
    },
  },
} as const
