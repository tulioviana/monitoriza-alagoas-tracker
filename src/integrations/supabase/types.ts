export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
        }
        Insert: {
          app_name?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
        }
        Update: {
          app_name?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
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
      sync_execution_log: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          executed_at: string
          execution_type: string
          id: number
          request_id: string | null
          response_body: string | null
          status: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string
          execution_type?: string
          id?: number
          request_id?: string | null
          response_body?: string | null
          status: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          executed_at?: string
          execution_type?: string
          id?: number
          request_id?: string | null
          response_body?: string | null
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
      assign_admin_to_email: {
        Args: { target_email: string }
        Returns: undefined
      }
      calculate_price_trend: {
        Args: { p_tracked_item_id: number; p_new_price: number }
        Returns: string
      }
      cleanup_old_search_history: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_items_needing_update: {
        Args: Record<PropertyKey, never>
        Returns: {
          item_id: number
          user_id: string
          item_type: string
          search_criteria: Json
          nickname: string
          update_frequency_minutes: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
