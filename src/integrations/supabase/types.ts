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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clan_settings: {
        Row: {
          bg_competencia: string | null
          bg_guerra: string | null
          bg_versus: string | null
          discord_url: string | null
          id: number
          updated_at: string
          whatsapp_url: string | null
        }
        Insert: {
          bg_competencia?: string | null
          bg_guerra?: string | null
          bg_versus?: string | null
          discord_url?: string | null
          id?: number
          updated_at?: string
          whatsapp_url?: string | null
        }
        Update: {
          bg_competencia?: string | null
          bg_guerra?: string | null
          bg_versus?: string | null
          discord_url?: string | null
          id?: number
          updated_at?: string
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      event_mvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_mvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_mvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          background_url: string | null
          base_timezone: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_time: string | null
          id: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Insert: {
          background_url?: string | null
          base_timezone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_time?: string | null
          id?: string
          title: string
          type: Database["public"]["Enums"]["event_type"]
        }
        Update: {
          background_url?: string | null
          base_timezone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_time?: string | null
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["event_type"]
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          background_url: string | null
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          max_members: number
          name: string
        }
        Insert: {
          background_url?: string | null
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          max_members?: number
          name: string
        }
        Update: {
          background_url?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          max_members?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_path: string | null
          content: string | null
          created_at: string
          group_id: string
          id: string
          sticker_path: string | null
          user_id: string
        }
        Insert: {
          audio_path?: string | null
          content?: string | null
          created_at?: string
          group_id: string
          id?: string
          sticker_path?: string | null
          user_id: string
        }
        Update: {
          audio_path?: string | null
          content?: string | null
          created_at?: string
          group_id?: string
          id?: string
          sticker_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          ff_id: string | null
          ff_nick: string
          game_profile_url: string | null
          hidden_fields: string[]
          id: string
          phone: string
          real_name: string
          timezone: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          ff_id?: string | null
          ff_nick: string
          game_profile_url?: string | null
          hidden_fields?: string[]
          id: string
          phone: string
          real_name: string
          timezone?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          ff_id?: string | null
          ff_nick?: string
          game_profile_url?: string | null
          hidden_fields?: string[]
          id?: string
          phone?: string
          real_name?: string
          timezone?: string | null
        }
        Relationships: []
      }
      raffle_registrations: {
        Row: {
          created_at: string
          event_id: string
          ff_id: string
          ff_nick: string
          id: string
          real_name: string
          updated_at: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          event_id: string
          ff_id: string
          ff_nick: string
          id?: string
          real_name: string
          updated_at?: string
          user_id: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          event_id?: string
          ff_id?: string
          ff_nick?: string
          id?: string
          real_name?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          allowed: boolean
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      site_texts: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      stickers: {
        Row: {
          created_at: string
          id: string
          image_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_path: string
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_game_profile_url: { Args: { _user_id: string }; Returns: string }
      get_group_member_profiles: {
        Args: { _group_id: string }
        Returns: {
          avatar_url: string
          ff_nick: string
          id: string
        }[]
      }
      get_member: {
        Args: { _id: string }
        Returns: {
          avatar_url: string
          ff_id: string
          ff_nick: string
          hidden_fields: string[]
          id: string
          is_admin: boolean
          phone: string
          real_name: string
        }[]
      }
      get_mvp_ranking: {
        Args: never
        Returns: {
          avatar_url: string
          competencia: number
          ff_nick: string
          guerra: number
          total: number
          user_id: string
          versus: number
        }[]
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      list_members: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          ff_id: string
          ff_nick: string
          hidden_fields: string[]
          id: string
          is_admin: boolean
          real_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "member" | "lider" | "lider_interno" | "decano"
      event_type: "guerra" | "competencia" | "versus" | "sorteo"
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
      app_role: ["admin", "member", "lider", "lider_interno", "decano"],
      event_type: ["guerra", "competencia", "versus", "sorteo"],
    },
  },
} as const
