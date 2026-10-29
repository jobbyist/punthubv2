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
      chain_heads: {
        Row: {
          created_at: string
          day: string
          hash: string
          last_prediction_id: string
          pick_count: number
        }
        Insert: {
          created_at?: string
          day: string
          hash: string
          last_prediction_id: string
          pick_count: number
        }
        Update: {
          created_at?: string
          day?: string
          hash?: string
          last_prediction_id?: string
          pick_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chain_heads_last_prediction_id_fkey"
            columns: ["last_prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chain_heads_last_prediction_id_fkey"
            columns: ["last_prediction_id"]
            isOneToOne: false
            referencedRelation: "visible_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      early_access: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          plan: string
          referral_code: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          plan: string
          referral_code?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          plan?: string
          referral_code?: string | null
          status?: string
        }
        Relationships: []
      }
      fixtures: {
        Row: {
          away: string
          away_score: number | null
          competition: string
          home: string
          home_score: number | null
          id: string
          kickoff_at: string
          provider: string
          provider_ref: string
          sport: string
          status: string
          updated_at: string
        }
        Insert: {
          away: string
          away_score?: number | null
          competition: string
          home: string
          home_score?: number | null
          id?: string
          kickoff_at: string
          provider: string
          provider_ref: string
          sport: string
          status?: string
          updated_at?: string
        }
        Update: {
          away?: string
          away_score?: number | null
          competition?: string
          home?: string
          home_score?: number | null
          id?: string
          kickoff_at?: string
          provider?: string
          provider_ref?: string
          sport?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hidden_predictions: {
        Row: {
          admin_id: string
          created_at: string
          prediction_id: string
          reason: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          prediction_id: string
          reason: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          prediction_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_predictions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_predictions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_predictions_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: true
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_predictions_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: true
            referencedRelation: "visible_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          confidence: number
          created_at: string
          fixture_id: string
          hash: string
          id: string
          line: number | null
          market: string
          odds: number
          prev_hash: string
          reasoning: string | null
          selection: string
          seq: number
          user_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          fixture_id: string
          hash: string
          id?: string
          line?: number | null
          market: string
          odds: number
          prev_hash: string
          reasoning?: string | null
          selection: string
          seq?: never
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          fixture_id?: string
          hash?: string
          id?: string
          line?: number | null
          market?: string
          odds?: number
          prev_hash?: string
          reasoning?: string | null
          selection?: string
          seq?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_year: number | null
          created_at: string
          display_name: string
          founding_number: number | null
          id: string
          is_18_attested: boolean
          is_banned: boolean
          marketing_opt_in: boolean
          popia_consent_at: string
          posting_paused_until: string | null
          referral_code: string | null
          referred_by: string | null
          role: string
          username: string
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          display_name: string
          founding_number?: number | null
          id: string
          is_18_attested: boolean
          is_banned?: boolean
          marketing_opt_in?: boolean
          popia_consent_at: string
          posting_paused_until?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string
          username: string
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          display_name?: string
          founding_number?: number | null
          id?: string
          is_18_attested?: boolean
          is_banned?: boolean
          marketing_opt_in?: boolean
          popia_consent_at?: string
          posting_paused_until?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          prediction_id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          prediction_id: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          prediction_id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "visible_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_events: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          prediction_id: string
          reason: string | null
          result: string
          seq: number
          source: string
          units: number
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          prediction_id: string
          reason?: string | null
          result: string
          seq?: never
          source: string
          units: number
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          prediction_id?: string
          reason?: string | null
          result?: string
          seq?: never
          source?: string
          units?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlement_events_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_events_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_events_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_events_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "visible_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      prediction_results: {
        Row: {
          prediction_id: string | null
          result: string | null
          settled_at: string | null
          source: string | null
          units: number | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_events_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_events_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "visible_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          founding_number: number | null
          id: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          founding_number?: number | null
          id?: string | null
          username?: never
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          founding_number?: number | null
          id?: string | null
          username?: never
        }
        Relationships: []
      }
      tipster_stats: {
        Row: {
          form_last_10: string | null
          picks: number | null
          roi: number | null
          settled: number | null
          units: number | null
          user_id: string | null
          username: string | null
          win_rate: number | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visible_predictions: {
        Row: {
          confidence: number | null
          created_at: string | null
          fixture_id: string | null
          hash: string | null
          id: string | null
          line: number | null
          market: string | null
          odds: number | null
          prev_hash: string | null
          reasoning: string | null
          selection: string | null
          seq: number | null
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          fixture_id?: string | null
          hash?: string | null
          id?: string | null
          line?: number | null
          market?: string | null
          odds?: number | null
          prev_hash?: string | null
          reasoning?: string | null
          selection?: string | null
          seq?: number | null
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          fixture_id?: string | null
          hash?: string | null
          id?: string | null
          line?: number | null
          market?: string | null
          odds?: number | null
          prev_hash?: string | null
          reasoning?: string | null
          selection?: string | null
          seq?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_leaderboard: {
        Row: {
          eligible: boolean | null
          last_pick_at: string | null
          picks_settled: number | null
          rank: number | null
          roi: number | null
          units: number | null
          user_id: string | null
          username: string | null
          week_start: string | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_prediction: {
        Args: {
          p_confidence: number
          p_fixture_id: string
          p_line: number
          p_market: string
          p_odds: number
          p_reasoning: string
          p_selection: string
        }
        Returns: {
          confidence: number
          created_at: string
          fixture_id: string
          hash: string
          id: string
          line: number | null
          market: string
          odds: number
          prev_hash: string
          reasoning: string | null
          selection: string
          seq: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "predictions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: never; Returns: boolean }
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
