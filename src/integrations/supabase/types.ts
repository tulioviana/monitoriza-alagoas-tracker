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
      competitor_price_history: {
        Row: {
          competitor_tracking_id: number
          created_at: string
          declared_price: number | null
          establishment_cnpj: string
          fetch_date: string
          id: number
          product_description: string
          product_ean: string | null
          sale_date: string
          sale_price: number
        }
        Insert: {
          competitor_tracking_id: number
          created_at?: string
          declared_price?: number | null
          establishment_cnpj: string
          fetch_date?: string
          id?: number
          product_description: string
          product_ean?: string | null
          sale_date: string
          sale_price: number
        }
        Update: {
          competitor_tracking_id?: number
          created_at?: string
          declared_price?: number | null
          establishment_cnpj?: string
          fetch_date?: string
          id?: number
          product_description?: string
          product_ean?: string | null
          sale_date?: string
          sale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_competitor_price_history_competitor_tracking"
            columns: ["competitor_tracking_id"]
            isOneToOne: false
            referencedRelation: "competitor_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_tracking: {
        Row: {
          competitor_cnpj: string
          competitor_name: string | null
          created_at: string
          id: number
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          competitor_cnpj: string
          competitor_name?: string | null
          created_at?: string
          id?: number
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          competitor_cnpj?: string
          competitor_name?: string | null
          created_at?: string
          id?: number
          is_active?: boolean
          updated_at?: string
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
      price_history: {
        Row: {
          declared_price: number | null
          establishment_cnpj: string
          fetch_date: string
          id: number
          sale_date: string
          sale_price: number
          tracked_item_id: number
        }
        Insert: {
          declared_price?: number | null
          establishment_cnpj: string
          fetch_date?: string
          id?: number
          sale_date: string
          sale_price: number
          tracked_item_id: number
        }
        Update: {
          declared_price?: number | null
          establishment_cnpj?: string
          fetch_date?: string
          id?: number
          sale_date?: string
          sale_price?: number
          tracked_item_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_history_establishment_cnpj_fkey"
            columns: ["establishment_cnpj"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["cnpj"]
          },
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
          created_at: string
          full_name: string
          id: string
        }
        Insert: {
          app_name?: string | null
          created_at?: string
          full_name: string
          id: string
        }
        Update: {
          app_name?: string | null
          created_at?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      tracked_items: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          item_type: Database["public"]["Enums"]["item_type"]
          nickname: string
          search_criteria: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          item_type: Database["public"]["Enums"]["item_type"]
          nickname: string
          search_criteria: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          item_type?: Database["public"]["Enums"]["item_type"]
          nickname?: string
          search_criteria?: Json
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_cron_jobs: {
        Args: Record<PropertyKey, never>
        Returns: {
          jobname: string
          schedule: string
          active: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      item_type: "produto" | "combustivel"
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
      item_type: ["produto", "combustivel"],
    },
  },
} as const
