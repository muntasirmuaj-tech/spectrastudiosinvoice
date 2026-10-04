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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          archived: boolean
          company: string | null
          created_at: string
          email: string | null
          id: string
          is_demo: boolean
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          archived?: boolean
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_demo?: boolean
          name: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          archived?: boolean
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client_id: string | null
          client_snapshot: Json
          created_at: string
          discount_type: string
          discount_value: number
          due_date: string
          id: string
          internal_notes: string | null
          invoice_date: string
          is_draft: boolean
          items: Json
          notes: string | null
          number: string
          owner_id: string
          status_override: string | null
          tax_rate: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_snapshot?: Json
          created_at?: string
          discount_type?: string
          discount_value?: number
          due_date?: string
          id?: string
          internal_notes?: string | null
          invoice_date?: string
          is_draft?: boolean
          items?: Json
          notes?: string | null
          number: string
          owner_id?: string
          status_override?: string | null
          tax_rate?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_snapshot?: Json
          created_at?: string
          discount_type?: string
          discount_value?: number
          due_date?: string
          id?: string
          internal_notes?: string | null
          invoice_date?: string
          is_draft?: boolean
          items?: Json
          notes?: string | null
          number?: string
          owner_id?: string
          status_override?: string | null
          tax_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string
          notes: string | null
          owner_id: string
          paid_on: string
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string
          notes?: string | null
          owner_id?: string
          paid_on?: string
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          owner_id?: string
          paid_on?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          archived: boolean
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          name: string
          owner_id: string
          rate: number
        }
        Insert: {
          archived?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name: string
          owner_id?: string
          rate?: number
        }
        Update: {
          archived?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          owner_id?: string
          rate?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          address: string | null
          business_name: string
          business_type: string
          currency_symbol: string
          default_due_days: number
          default_note: string
          email: string | null
          invoice_prefix: string
          logo_url: string | null
          next_number: number
          owner_id: string
          payment_methods: Json
          phone: string | null
          tax_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string
          business_type?: string
          currency_symbol?: string
          default_due_days?: number
          default_note?: string
          email?: string | null
          invoice_prefix?: string
          logo_url?: string | null
          next_number?: number
          owner_id?: string
          payment_methods?: Json
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          business_type?: string
          currency_symbol?: string
          default_due_days?: number
          default_note?: string
          email?: string | null
          invoice_prefix?: string
          logo_url?: string | null
          next_number?: number
          owner_id?: string
          payment_methods?: Json
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_workspace: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
