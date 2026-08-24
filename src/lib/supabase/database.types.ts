export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cafe_info: {
        Row: {
          address: string | null
          announcement_en: string | null
          announcement_fr: string | null
          gst_rate: number
          hours: Json
          id: string
          max_advance_order_days: number | null
          ordering_enabled: boolean
          phone: string | null
          pickup_lead_time: number | null
          qst_rate: number
          singleton: boolean
          timezone: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          announcement_en?: string | null
          announcement_fr?: string | null
          gst_rate?: number
          hours?: Json
          id?: string
          max_advance_order_days?: number | null
          ordering_enabled?: boolean
          phone?: string | null
          pickup_lead_time?: number | null
          qst_rate?: number
          singleton?: boolean
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          announcement_en?: string | null
          announcement_fr?: string | null
          gst_rate?: number
          hours?: Json
          id?: string
          max_advance_order_days?: number | null
          ordering_enabled?: boolean
          phone?: string | null
          pickup_lead_time?: number | null
          qst_rate?: number
          singleton?: boolean
          timezone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name_en: string
          name_fr: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name_en: string
          name_fr: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name_en?: string
          name_fr?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          available: boolean
          category_id: string
          created_at: string | null
          description_en: string
          description_fr: string
          id: string
          image_url: string | null
          name_en: string
          name_fr: string
          price: number
          sort_order: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          available?: boolean
          category_id: string
          created_at?: string | null
          description_en?: string
          description_fr?: string
          id?: string
          image_url?: string | null
          name_en: string
          name_fr: string
          price: number
          sort_order?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          available?: boolean
          category_id?: string
          created_at?: string | null
          description_en?: string
          description_fr?: string
          id?: string
          image_url?: string | null
          name_en?: string
          name_fr?: string
          price?: number
          sort_order?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      modifier_options: {
        Row: {
          available: boolean
          id: string
          modifier_id: string
          name_en: string
          name_fr: string
          price_adjustment: number
          sort_order: number | null
        }
        Insert: {
          available?: boolean
          id?: string
          modifier_id: string
          name_en: string
          name_fr: string
          price_adjustment?: number
          sort_order?: number | null
        }
        Update: {
          available?: boolean
          id?: string
          modifier_id?: string
          name_en?: string
          name_fr?: string
          price_adjustment?: number
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modifier_options_modifier_id_fkey"
            columns: ["modifier_id"]
            isOneToOne: false
            referencedRelation: "modifiers"
            referencedColumns: ["id"]
          },
        ]
      }
      modifiers: {
        Row: {
          id: string
          max_selections: number
          menu_item_id: string
          min_selections: number
          name_en: string
          name_fr: string
          sort_order: number | null
        }
        Insert: {
          id?: string
          max_selections?: number
          menu_item_id: string
          min_selections?: number
          name_en: string
          name_fr: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          max_selections?: number
          menu_item_id?: string
          min_selections?: number
          name_en?: string
          name_fr?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modifiers_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          lifecycle_contract_version: number | null
          line_position: number | null
          line_total: number | null
          menu_item_id: string | null
          menu_item_name: string
          modifier_total: number | null
          modifiers: Json | null
          order_id: string
          price: number
          quantity: number
          unit_price: number | null
        }
        Insert: {
          id?: string
          lifecycle_contract_version?: number | null
          line_position?: number | null
          line_total?: number | null
          menu_item_id?: string | null
          menu_item_name: string
          modifier_total?: number | null
          modifiers?: Json | null
          order_id: string
          price: number
          quantity: number
          unit_price?: number | null
        }
        Update: {
          id?: string
          lifecycle_contract_version?: number | null
          line_position?: number | null
          line_total?: number | null
          menu_item_id?: string | null
          menu_item_name?: string
          modifier_total?: number | null
          modifiers?: Json | null
          order_id?: string
          price?: number
          quantity?: number
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_rate_buckets: {
        Row: {
          expires_at: string
          id: string
          key_hash: string
          purpose: string
          request_count: number
          window_seconds: number
          window_start: string
        }
        Insert: {
          expires_at: string
          id?: string
          key_hash: string
          purpose: string
          request_count: number
          window_seconds: number
          window_start: string
        }
        Update: {
          expires_at?: string
          id?: string
          key_hash?: string
          purpose?: string
          request_count?: number
          window_seconds?: number
          window_start?: string
        }
        Relationships: []
      }
      order_status_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          order_id: string
          status_version: number
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          order_id: string
          status_version: number
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          order_id?: string
          status_version?: number
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_name: string
          customer_phone: string
          fingerprint_version: number | null
          gst_rate: number | null
          id: string
          idempotency_key: string | null
          lifecycle_contract_version: number | null
          locale: string | null
          notes: string | null
          order_number: string
          pickup_mode: string | null
          pickup_time: string | null
          promised_pickup_at: string | null
          qst_rate: number | null
          receipt_id: string | null
          request_fingerprint: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          status_version: number | null
          subtotal: number
          tax_gst: number
          tax_qst: number
          total: number
          tracking_expires_at: string | null
          tracking_revoked_at: string | null
          tracking_token_hash: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name: string
          customer_phone: string
          fingerprint_version?: number | null
          gst_rate?: number | null
          id?: string
          idempotency_key?: string | null
          lifecycle_contract_version?: number | null
          locale?: string | null
          notes?: string | null
          order_number: string
          pickup_mode?: string | null
          pickup_time?: string | null
          promised_pickup_at?: string | null
          qst_rate?: number | null
          receipt_id?: string | null
          request_fingerprint?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          status_version?: number | null
          subtotal: number
          tax_gst: number
          tax_qst: number
          total: number
          tracking_expires_at?: string | null
          tracking_revoked_at?: string | null
          tracking_token_hash?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string
          customer_phone?: string
          fingerprint_version?: number | null
          gst_rate?: number | null
          id?: string
          idempotency_key?: string | null
          lifecycle_contract_version?: number | null
          locale?: string | null
          notes?: string | null
          order_number?: string
          pickup_mode?: string | null
          pickup_time?: string | null
          promised_pickup_at?: string | null
          qst_rate?: number | null
          receipt_id?: string | null
          request_fingerprint?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          status_version?: number | null
          subtotal?: number
          tax_gst?: number
          tax_qst?: number
          total?: number
          tracking_expires_at?: string | null
          tracking_revoked_at?: string | null
          tracking_token_hash?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_lifecycle_test_order_v1: {
        Args: { p_order_id: string }
        Returns: string
      }
      consume_order_rate_limit_v1: {
        Args: {
          p_key_hash: string
          p_limit: number
          p_purpose: string
          p_window_seconds: number
        }
        Returns: Json
      }
      create_menu_item_graph_v1: {
        Args: { p_item: Json; p_menu_item_id: string; p_modifiers: Json }
        Returns: string
      }
      create_order_v1: {
        Args: {
          p_customer_name: string
          p_customer_phone: string
          p_idempotency_key: string
          p_items: Json
          p_locale: string
          p_notes: string
          p_pickup_mode: string
          p_scheduled_pickup_local: string
          p_tracking_token_hash: string
        }
        Returns: Json
      }
      get_lifecycle_environment_sentinel: {
        Args: never
        Returns: {
          bootstrap_checksum: string
          environment: string
        }[]
      }
      get_order_status_v1: {
        Args: { p_tracking_token_hash: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      prune_order_rate_buckets_v1: { Args: never; Returns: number }
      recover_order_v1: {
        Args: { p_idempotency_key: string; p_tracking_token_hash: string }
        Returns: Json
      }
      save_menu_item_graph_v1: {
        Args: { p_item: Json; p_menu_item_id: string; p_modifiers: Json }
        Returns: string
      }
      transition_order_status_v1: {
        Args: {
          p_expected_status: Database["public"]["Enums"]["order_status"]
          p_expected_version: number
          p_new_status: Database["public"]["Enums"]["order_status"]
          p_order_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      order_status: "new" | "preparing" | "ready" | "picked_up" | "cancelled"
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
      order_status: ["new", "preparing", "ready", "picked_up", "cancelled"],
    },
  },
} as const
