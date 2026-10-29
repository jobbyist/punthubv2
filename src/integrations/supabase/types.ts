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
      reward_settings: {
        Row: { enabled: boolean; key: string; updated_at: string; updated_by: string | null }
        Insert: { enabled?: boolean; key: string; updated_at?: string; updated_by?: string | null }
        Update: { enabled?: boolean; key?: string; updated_at?: string; updated_by?: string | null }
        Relationships: []
      }
      point_rules: {
        Row: { active: boolean; cap_per_day: number | null; cap_per_month: number | null; code: string; points: number; sort: number; title: string; updated_at: string }
        Insert: { active?: boolean; cap_per_day?: number | null; cap_per_month?: number | null; code: string; points: number; sort?: number; title: string; updated_at?: string }
        Update: { active?: boolean; cap_per_day?: number | null; cap_per_month?: number | null; code?: string; points?: number; sort?: number; title?: string; updated_at?: string }
        Relationships: []
      }
      referral_milestones: {
        Row: { active: boolean; bonus_points: number; threshold: number; title: string }
        Insert: { active?: boolean; bonus_points: number; threshold: number; title: string }
        Update: { active?: boolean; bonus_points?: number; threshold?: number; title?: string }
        Relationships: []
      }
      puntpoints_ledger: {
        Row: { admin_id: string | null; created_at: string; id: string; kind: string; points: number; reason: string | null; ref_id: string | null; rule_code: string | null; seq: number; user_id: string }
        Insert: { admin_id?: string | null; created_at?: string; id?: string; kind: string; points: number; reason?: string | null; ref_id?: string | null; rule_code?: string | null; seq?: number; user_id: string }
        Update: { admin_id?: string | null; created_at?: string; id?: string; kind?: string; points?: number; reason?: string | null; ref_id?: string | null; rule_code?: string | null; seq?: number; user_id?: string }
        Relationships: []
      }
      rewards: {
        Row: { active: boolean; code: string; created_at: string; description: string | null; id: string; kind: string; points_cost: number; requires_approval: boolean; sponsor: string | null; stock: number | null; title: string }
        Insert: { active?: boolean; code: string; created_at?: string; description?: string | null; id?: string; kind: string; points_cost: number; requires_approval?: boolean; sponsor?: string | null; stock?: number | null; title: string }
        Update: { active?: boolean; code?: string; created_at?: string; description?: string | null; id?: string; kind?: string; points_cost?: number; requires_approval?: boolean; sponsor?: string | null; stock?: number | null; title?: string }
        Relationships: []
      }
      reward_codes: {
        Row: { code: string; created_at: string; id: string; redemption_id: string | null; reward_id: string }
        Insert: { code: string; created_at?: string; id?: string; redemption_id?: string | null; reward_id: string }
        Update: { code?: string; created_at?: string; id?: string; redemption_id?: string | null; reward_id?: string }
        Relationships: []
      }
      redemptions: {
        Row: { admin_id: string | null; created_at: string; id: string; note: string | null; points: number; reward_id: string; status: string; updated_at: string; user_id: string; voucher_code: string | null }
        Insert: { admin_id?: string | null; created_at?: string; id?: string; note?: string | null; points: number; reward_id: string; status?: string; updated_at?: string; user_id: string; voucher_code?: string | null }
        Update: { admin_id?: string | null; created_at?: string; id?: string; note?: string | null; points?: number; reward_id?: string; status?: string; updated_at?: string; user_id?: string; voucher_code?: string | null }
        Relationships: []
      }
      launch_email_sends: {
        Row: { detail: string | null; email: string; sent_at: string; status: string; wave: number }
        Insert: { detail?: string | null; email: string; sent_at?: string; status?: string; wave: number }
        Update: { detail?: string | null; email?: string; sent_at?: string; status?: string; wave?: number }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          body: string
          created_at: string
          dedupe_key: string
          done_at: string | null
          done_by: string | null
          id: string
          kind: string
          sms_body: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          dedupe_key: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          kind: string
          sms_body?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          dedupe_key?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          kind?: string
          sms_body?: string | null
          title?: string
        }
        Relationships: []
      }
      breach_register: {
        Row: {
          contained_at: string | null
          created_at: string
          data_types: string | null
          description: string
          discovered_at: string
          id: string
          outcome: string | null
          regulator_notified_at: string | null
          subjects_affected: number | null
          subjects_notified_at: string | null
        }
        Insert: {
          contained_at?: string | null
          created_at?: string
          data_types?: string | null
          description: string
          discovered_at: string
          id?: string
          outcome?: string | null
          regulator_notified_at?: string | null
          subjects_affected?: number | null
          subjects_notified_at?: string | null
        }
        Update: {
          contained_at?: string | null
          created_at?: string
          data_types?: string | null
          description?: string
          discovered_at?: string
          id?: string
          outcome?: string | null
          regulator_notified_at?: string | null
          subjects_affected?: number | null
          subjects_notified_at?: string | null
        }
        Relationships: []
      }
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
      consent_records: {
        Row: {
          anon_id: string | null
          created_at: string
          granted: boolean
          id: string
          notice_version: string
          purpose: string
          seq: number
          source: string
          user_id: string | null
        }
        Insert: {
          anon_id?: string | null
          created_at?: string
          granted: boolean
          id?: string
          notice_version: string
          purpose: string
          seq?: never
          source: string
          user_id?: string | null
        }
        Update: {
          anon_id?: string | null
          created_at?: string
          granted?: boolean
          id?: string
          notice_version?: string
          purpose?: string
          seq?: never
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      early_access: {
        Row: {
          created_at: string
          email: string
          founding_reserved: boolean
          id: string
          marketing_consent: boolean
          name: string
          phone: string | null
          plan: string
          referral_code: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          founding_reserved?: boolean
          id?: string
          marketing_consent?: boolean
          name: string
          phone?: string | null
          plan: string
          referral_code?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          founding_reserved?: boolean
          id?: string
          marketing_consent?: boolean
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
      notice_versions: {
        Row: {
          effective_at: string
          id: string
          kind: string
          url: string
          version: string
        }
        Insert: {
          effective_at: string
          id?: string
          kind: string
          url: string
          version: string
        }
        Update: {
          effective_at?: string
          id?: string
          kind?: string
          url?: string
          version?: string
        }
        Relationships: []
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
      privacy_requests: {
        Row: {
          closed_at: string | null
          details: string | null
          due_at: string
          email: string
          id: string
          kind: string
          notes: string | null
          received_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          closed_at?: string | null
          details?: string | null
          due_at?: string
          email: string
          id?: string
          kind: string
          notes?: string | null
          received_at?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          closed_at?: string | null
          details?: string | null
          due_at?: string
          email?: string
          id?: string
          kind?: string
          notes?: string | null
          received_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "privacy_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privacy_requests_user_id_fkey"
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
          language: string
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
          language?: string
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
          language?: string
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
      referral_rewards: {
        Row: {
          created_at: string
          id: string
          qualifying_prediction_id: string
          referred_credits: number
          referred_id: string
          referrer_credits: number
          referrer_id: string
          status: string
          vested_at: string | null
          vests_at: string
          reversed_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          qualifying_prediction_id: string
          referred_credits?: number
          referred_id: string
          referrer_credits?: number
          referrer_id: string
          status?: string
          vested_at?: string | null
          vests_at?: string
          reversed_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          qualifying_prediction_id?: string
          referred_credits?: number
          referred_id?: string
          referrer_credits?: number
          referrer_id?: string
          status?: string
          vested_at?: string | null
          vests_at?: string
          reversed_at?: string | null
        }
        Relationships: []
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
      waitlist_invites: {
        Row: { detail: string | null; email: string; sent_at: string; status: string }
        Insert: { detail?: string | null; email: string; sent_at?: string; status?: string }
        Update: { detail?: string | null; email?: string; sent_at?: string; status?: string }
        Relationships: []
      }
      waitlist_unsubscribes: {
        Row: { created_at: string; email: string }
        Insert: { created_at?: string; email: string }
        Update: { created_at?: string; email?: string }
        Relationships: []
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
      current_consents: {
        Row: {
          created_at: string | null
          granted: boolean | null
          notice_version: string | null
          purpose: string | null
          source: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      admin_settle_prediction: {
        Args: { p_prediction: string; p_reason: string; p_result: string }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "settlement_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mfa_ok: { Args: never; Returns: boolean }
      claim_reserved_founding: { Args: { p_user: string }; Returns: number }
      reward_setting: { Args: { p_key: string }; Returns: boolean }
      member_may_redeem: { Args: { p_user: string }; Returns: boolean }
      award_points: { Args: { p_points?: number; p_ref: string; p_rule: string; p_user: string }; Returns: number }
      sync_my_points: { Args: never; Returns: number }
      my_puntpoints: { Args: never; Returns: number }
      rewards_status: { Args: never; Returns: { points_enabled: boolean; rewards_enabled: boolean }[] }
      point_rules_public: { Args: never; Returns: { cap_per_day: number | null; cap_per_month: number | null; code: string; points: number; title: string }[] }
      vest_referrals: { Args: never; Returns: number }
      my_referral_overview: { Args: never; Returns: { next_threshold: number | null; next_title: string | null; pending: number; qualified: number; reversed: number; signed_up: number; vested: number }[] }
      list_rewards: { Args: never; Returns: { code: string; description: string | null; id: string; in_stock: boolean; kind: string; points_cost: number; sponsor: string | null; title: string }[] }
      redeem_reward: { Args: { p_reward: string }; Returns: { admin_id: string | null; created_at: string; id: string; note: string | null; points: number; reward_id: string; status: string; updated_at: string; user_id: string; voucher_code: string | null } }
      admin_fulfil_redemption: { Args: { p_note?: string; p_redemption: string }; Returns: { admin_id: string | null; created_at: string; id: string; note: string | null; points: number; reward_id: string; status: string; updated_at: string; user_id: string; voucher_code: string | null } }
      admin_cancel_redemption: { Args: { p_reason: string; p_redemption: string }; Returns: { admin_id: string | null; created_at: string; id: string; note: string | null; points: number; reward_id: string; status: string; updated_at: string; user_id: string; voucher_code: string | null } }
      admin_adjust_points: { Args: { p_points: number; p_reason: string; p_user: string }; Returns: number }
      admin_referral_review: { Args: never; Returns: { burst: boolean; created_at: string; id: string; referred: string; referrer: string; status: string; vests_at: string }[] }
      admin_reverse_referral: { Args: { p_reason: string; p_referral: string }; Returns: undefined }
      launch_recipients: {
        Args: { p_wave: number }
        Returns: { recipient_email: string; recipient_name: string }[]
      }
      launch_audience: {
        Args: never
        Returns: {
          email_address: string
          full_name: string
          joined_at: string
          marketing_ok: boolean
          phone_number: string
          reserved: boolean
          signed_up: boolean
          unsubscribed: boolean
        }[]
      }
      founding_spots_held: { Args: never; Returns: number }
      write_chain_head: {
        Args: { p_day: string }
        Returns: { head_day: string; head_hash: string; head_pick_count: number }[]
      }
      apply_auto_settlements: { Args: { p_rows: Json }; Returns: number }
      anonymise_account: {
        Args: { p_email: string; p_user: string }
        Returns: undefined
      }
      complete_signup: {
        Args: {
          p_birth_year: number
          p_language: string
          p_marketing_email: boolean
          p_marketing_whatsapp: boolean
          p_ref: string
          p_username: string
        }
        Returns: number
      }
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
      export_my_data: { Args: never; Returns: Json }
      founding_spots_taken: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      my_referral_counts: {
        Args: never
        Returns: { joined: number; signed_up: number }[]
      }
      pending_settlements: {
        Args: never
        Returns: {
          away_score: number
          line: number
          market: string
          odds: number
          prediction_id: string
          selection: string
          sport: string
          status: string
          home_score: number
        }[]
      }
      record_consent: {
        Args: {
          p_granted: boolean
          p_notice_version: string
          p_purpose: string
          p_source: string
        }
        Returns: undefined
      }
      username_available: { Args: { p_username: string }; Returns: boolean }
      submit_privacy_request: {
        Args: { p_details: string; p_email: string; p_kind: string }
        Returns: string
      }
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
