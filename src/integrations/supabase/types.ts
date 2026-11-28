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
      account_warnings: {
        Row: {
          acknowledged_at: string | null
          admin_id: string | null
          created_at: string
          id: string
          message: string
          reason: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          admin_id?: string | null
          created_at?: string
          id?: string
          message: string
          reason: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          admin_id?: string | null
          created_at?: string
          id?: string
          message?: string
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_warnings_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          detail: Json
          id: number
          target: string | null
          target_user: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          detail?: Json
          id?: never
          target?: string | null
          target_user?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          detail?: Json
          id?: never
          target?: string | null
          target_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_user_fkey"
            columns: ["target_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "admin_notifications_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_ad_events: {
        Row: {
          created_at: string
          creative_id: string | null
          id: number
          kind: string
          partner_id: string
          placement: string
        }
        Insert: {
          created_at?: string
          creative_id?: string | null
          id?: never
          kind: string
          partner_id: string
          placement: string
        }
        Update: {
          created_at?: string
          creative_id?: string | null
          id?: never
          kind?: string
          partner_id?: string
          placement?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_ad_events_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "affiliate_creatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_ad_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "affiliate_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_creatives: {
        Row: {
          active: boolean
          approved_at: string | null
          body: string | null
          created_at: string
          cta_label: string
          ends_at: string | null
          format: string
          headline: string
          id: string
          image_url: string | null
          name: string
          partner_id: string
          placements: string[]
          starts_at: string | null
          terms_line: string | null
          tracking_link: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          approved_at?: string | null
          body?: string | null
          created_at?: string
          cta_label?: string
          ends_at?: string | null
          format?: string
          headline: string
          id?: string
          image_url?: string | null
          name: string
          partner_id: string
          placements?: string[]
          starts_at?: string | null
          terms_line?: string | null
          tracking_link?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          approved_at?: string | null
          body?: string | null
          created_at?: string
          cta_label?: string
          ends_at?: string | null
          format?: string
          headline?: string
          id?: string
          image_url?: string | null
          name?: string
          partner_id?: string
          placements?: string[]
          starts_at?: string | null
          terms_line?: string | null
          tracking_link?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_creatives_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "affiliate_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_partner_events: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          partner_id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          partner_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_partner_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_partner_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "affiliate_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_partners: {
        Row: {
          applied_at: string | null
          approved_at: string | null
          category: string
          commission_summary: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string
          dashboard_url: string | null
          id: string
          licence_checked_at: string | null
          licence_notes: string | null
          min_payout_zar: number | null
          name: string
          network: string | null
          notes: string | null
          responded_at: string | null
          response_due_at: string | null
          slug: string
          status: string
          terms_accepted_at: string | null
          tracking_link: string | null
          updated_at: string
          updated_by: string | null
          website_url: string | null
          went_live_at: string | null
        }
        Insert: {
          applied_at?: string | null
          approved_at?: string | null
          category?: string
          commission_summary?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          dashboard_url?: string | null
          id?: string
          licence_checked_at?: string | null
          licence_notes?: string | null
          min_payout_zar?: number | null
          name: string
          network?: string | null
          notes?: string | null
          responded_at?: string | null
          response_due_at?: string | null
          slug: string
          status?: string
          terms_accepted_at?: string | null
          tracking_link?: string | null
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
          went_live_at?: string | null
        }
        Update: {
          applied_at?: string | null
          approved_at?: string | null
          category?: string
          commission_summary?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          dashboard_url?: string | null
          id?: string
          licence_checked_at?: string | null
          licence_notes?: string | null
          min_payout_zar?: number | null
          name?: string
          network?: string | null
          notes?: string | null
          responded_at?: string | null
          response_due_at?: string | null
          slug?: string
          status?: string
          terms_accepted_at?: string | null
          tracking_link?: string | null
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
          went_live_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_partners_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_community_activity: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string
          duel_id: string | null
          id: string
          persona_key: string
          post_id: string | null
          target_post_id: string | null
        }
        Insert: {
          activity_date: string
          activity_type: string
          created_at?: string
          duel_id?: string | null
          id?: string
          persona_key: string
          post_id?: string | null
          target_post_id?: string | null
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          duel_id?: string | null
          id?: string
          persona_key?: string
          post_id?: string | null
          target_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_community_activity_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_community_activity_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_community_activity_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_community_runs: {
        Row: {
          activity_date: string
          completed_at: string | null
          duels_created: number
          error: string | null
          posts_created: number
          replies_created: number
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          activity_date: string
          completed_at?: string | null
          duels_created?: number
          error?: string | null
          posts_created?: number
          replies_created?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          activity_date?: string
          completed_at?: string | null
          duels_created?: number
          error?: string | null
          posts_created?: number
          replies_created?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_duel_challenges: {
        Row: {
          created_at: string
          duel_id: string
          fixture_id: string
          persona_key: string
        }
        Insert: {
          created_at?: string
          duel_id: string
          fixture_id: string
          persona_key: string
        }
        Update: {
          created_at?: string
          duel_id?: string
          fixture_id?: string
          persona_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_duel_challenges_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: true
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_duel_challenges_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_sports_wallets: {
        Row: {
          allocated_points: number
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allocated_points?: number
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allocated_points?: number
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_sports_wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_pass_claims: {
        Row: {
          amount_cents: number | null
          claimed_at: string
          hold_expires_at: string | null
          paid_at: string | null
          payment_reference: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          claimed_at?: string
          hold_expires_at?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          claimed_at?: string
          hold_expires_at?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      annual_pass_offline_payments: {
        Row: {
          amount_cents: number | null
          bank_reference: string | null
          created_at: string
          id: string
          linked_at: string | null
          note: string | null
          paid_on: string
          payer_label: string
          recorded_by: string | null
          user_id: string | null
          voided_at: string | null
        }
        Insert: {
          amount_cents?: number | null
          bank_reference?: string | null
          created_at?: string
          id?: string
          linked_at?: string | null
          note?: string | null
          paid_on?: string
          payer_label: string
          recorded_by?: string | null
          user_id?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_cents?: number | null
          bank_reference?: string | null
          created_at?: string
          id?: string
          linked_at?: string | null
          note?: string | null
          paid_on?: string
          payer_label?: string
          recorded_by?: string | null
          user_id?: string | null
          voided_at?: string | null
        }
        Relationships: []
      }
      api_budgets: {
        Row: {
          family: string
          monthly_usd: number
          note: string | null
          updated_at: string
        }
        Insert: {
          family: string
          monthly_usd: number
          note?: string | null
          updated_at?: string
        }
        Update: {
          family?: string
          monthly_usd?: number
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      api_call_events: {
        Row: {
          attempt_id: string
          claimed_at: string
          competition: string | null
          completed_at: string | null
          consumer: string | null
          estimated_cost_usd: number | null
          feature: string
          id: number
          job_run_id: string | null
          metadata: Json
          operation: string | null
          provider: string
          reason_code: string | null
          status: string
        }
        Insert: {
          attempt_id?: string
          claimed_at?: string
          competition?: string | null
          completed_at?: string | null
          consumer?: string | null
          estimated_cost_usd?: number | null
          feature?: string
          id?: never
          job_run_id?: string | null
          metadata?: Json
          operation?: string | null
          provider: string
          reason_code?: string | null
          status?: string
        }
        Update: {
          attempt_id?: string
          claimed_at?: string
          competition?: string | null
          completed_at?: string | null
          consumer?: string | null
          estimated_cost_usd?: number | null
          feature?: string
          id?: never
          job_run_id?: string | null
          metadata?: Json
          operation?: string | null
          provider?: string
          reason_code?: string | null
          status?: string
        }
        Relationships: []
      }
      api_provider_backoff: {
        Row: {
          blocked_until: string
          competition: string | null
          created_at: string
          feature: string | null
          job_run_id: string | null
          metadata: Json
          reason_code: string
          scope: string
          scope_key: string
          updated_at: string
        }
        Insert: {
          blocked_until: string
          competition?: string | null
          created_at?: string
          feature?: string | null
          job_run_id?: string | null
          metadata?: Json
          reason_code: string
          scope: string
          scope_key: string
          updated_at?: string
        }
        Update: {
          blocked_until?: string
          competition?: string | null
          created_at?: string
          feature?: string | null
          job_run_id?: string | null
          metadata?: Json
          reason_code?: string
          scope?: string
          scope_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_quota_limits: {
        Row: {
          daily_cap: number
          monthly_cap: number
          note: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          daily_cap: number
          monthly_cap: number
          note?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          daily_cap?: number
          monthly_cap?: number
          note?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_spend_period_limits: {
        Row: {
          family: string
          limit_usd: number
          note: string | null
          period_end: string
          period_start: string
          updated_at: string
        }
        Insert: {
          family: string
          limit_usd: number
          note?: string | null
          period_end: string
          period_start: string
          updated_at?: string
        }
        Update: {
          family?: string
          limit_usd?: number
          note?: string | null
          period_end?: string
          period_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_spend_period_limits_family_fkey"
            columns: ["family"]
            isOneToOne: true
            referencedRelation: "api_budgets"
            referencedColumns: ["family"]
          },
        ]
      }
      api_unit_prices: {
        Row: {
          note: string | null
          provider: string
          updated_at: string
          usd_per_unit: number
        }
        Insert: {
          note?: string | null
          provider: string
          updated_at?: string
          usd_per_unit: number
        }
        Update: {
          note?: string | null
          provider?: string
          updated_at?: string
          usd_per_unit?: number
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bet_slip_legs: {
        Row: {
          away: string | null
          competition: string | null
          fixture_id: string | null
          home: string | null
          id: string
          market: string | null
          odds: number | null
          position: number
          prediction_id: string | null
          raw_market: string | null
          raw_selection: string | null
          selection: string | null
          slip_id: string
        }
        Insert: {
          away?: string | null
          competition?: string | null
          fixture_id?: string | null
          home?: string | null
          id?: string
          market?: string | null
          odds?: number | null
          position: number
          prediction_id?: string | null
          raw_market?: string | null
          raw_selection?: string | null
          selection?: string | null
          slip_id: string
        }
        Update: {
          away?: string | null
          competition?: string | null
          fixture_id?: string | null
          home?: string | null
          id?: string
          market?: string | null
          odds?: number | null
          position?: number
          prediction_id?: string | null
          raw_market?: string | null
          raw_selection?: string | null
          selection?: string | null
          slip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bet_slip_legs_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bet_slip_legs_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bet_slip_legs_slip_id_fkey"
            columns: ["slip_id"]
            isOneToOne: false
            referencedRelation: "bet_slips"
            referencedColumns: ["id"]
          },
        ]
      }
      bet_slips: {
        Row: {
          bet_type: string
          bookmaker: string | null
          created_at: string
          id: string
          image_expires_at: string | null
          image_path: string | null
          import_provider: string | null
          import_ref: string | null
          note: string | null
          potential_return: number | null
          published_at: string | null
          show_stake: boolean
          source: string
          stake: number | null
          status: string
          total_odds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bet_type?: string
          bookmaker?: string | null
          created_at?: string
          id?: string
          image_expires_at?: string | null
          image_path?: string | null
          import_provider?: string | null
          import_ref?: string | null
          note?: string | null
          potential_return?: number | null
          published_at?: string | null
          show_stake?: boolean
          source: string
          stake?: number | null
          status?: string
          total_odds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bet_type?: string
          bookmaker?: string | null
          created_at?: string
          id?: string
          image_expires_at?: string | null
          image_path?: string | null
          import_provider?: string | null
          import_ref?: string | null
          note?: string | null
          potential_return?: number | null
          published_at?: string | null
          show_stake?: boolean
          source?: string
          stake?: number | null
          status?: string
          total_odds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bet_slips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmaker_odds_permissions: {
        Row: {
          affiliate_partner_slug: string | null
          affiliate_priority: number
          affiliate_status: string
          attribution_approved: boolean
          automated_access_allowed: boolean
          bookmaker_name: string
          collection_approved: boolean
          created_at: string
          data_rights_status: string
          display_approved: boolean
          domain: string | null
          enabled: boolean
          id: string
          licence_evidence_url: string | null
          licence_reference_candidate: string | null
          licence_status: string
          licence_verified_at: string | null
          licence_verified_by: string | null
          notes: string | null
          redistribution_approved: boolean
          retention_approved: boolean
          rights_evidence_url: string | null
          rights_reviewed_at: string | null
          rights_reviewed_by: string | null
          storage_approved: boolean
          updated_at: string
        }
        Insert: {
          affiliate_partner_slug?: string | null
          affiliate_priority?: number
          affiliate_status?: string
          attribution_approved?: boolean
          automated_access_allowed?: boolean
          bookmaker_name: string
          collection_approved?: boolean
          created_at?: string
          data_rights_status?: string
          display_approved?: boolean
          domain?: string | null
          enabled?: boolean
          id?: string
          licence_evidence_url?: string | null
          licence_reference_candidate?: string | null
          licence_status?: string
          licence_verified_at?: string | null
          licence_verified_by?: string | null
          notes?: string | null
          redistribution_approved?: boolean
          retention_approved?: boolean
          rights_evidence_url?: string | null
          rights_reviewed_at?: string | null
          rights_reviewed_by?: string | null
          storage_approved?: boolean
          updated_at?: string
        }
        Update: {
          affiliate_partner_slug?: string | null
          affiliate_priority?: number
          affiliate_status?: string
          attribution_approved?: boolean
          automated_access_allowed?: boolean
          bookmaker_name?: string
          collection_approved?: boolean
          created_at?: string
          data_rights_status?: string
          display_approved?: boolean
          domain?: string | null
          enabled?: boolean
          id?: string
          licence_evidence_url?: string | null
          licence_reference_candidate?: string | null
          licence_status?: string
          licence_verified_at?: string | null
          licence_verified_by?: string | null
          notes?: string | null
          redistribution_approved?: boolean
          retention_approved?: boolean
          rights_evidence_url?: string | null
          rights_reviewed_at?: string | null
          rights_reviewed_by?: string | null
          storage_approved?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      bookmaker_reviews: {
        Row: {
          body: string | null
          bookmaker_slug: string
          created_at: string
          ease_of_use: number
          id: string
          overall: number
          payouts: number
          status: string
          support: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          bookmaker_slug: string
          created_at?: string
          ease_of_use: number
          id?: string
          overall: number
          payouts: number
          status?: string
          support: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          bookmaker_slug?: string
          created_at?: string
          ease_of_use?: number
          id?: string
          overall?: number
          payouts?: number
          status?: string
          support?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      brand_logos: {
        Row: {
          active: boolean
          code: string
          id: string
          image_url: string | null
          kind: string
          link_url: string | null
          name: string
          placements: string[]
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          id?: string
          image_url?: string | null
          kind: string
          link_url?: string | null
          name: string
          placements?: string[]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          id?: string
          image_url?: string | null
          kind?: string
          link_url?: string | null
          name?: string
          placements?: string[]
          sort_order?: number
          updated_at?: string
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
      campaign_events: {
        Row: {
          created_at: string
          detail: string | null
          event: string
          id: number
          path: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          event: string
          id?: never
          path?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          event?: string
          id?: never
          path?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor?: string
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
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          body: string
          category: string
          created_at: string
          id: string
          is_ai_generated: boolean
          parent_id: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          category?: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          parent_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          parent_id?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_score_ledger: {
        Row: {
          competition: string
          created_at: string
          fixture_id: string
          id: number
          kickoff_at: string
          market: string
          points: number
          prediction_id: string
          result: string
          settlement_event_id: string
          settlement_seq: number
          user_id: string
        }
        Insert: {
          competition: string
          created_at?: string
          fixture_id: string
          id?: never
          kickoff_at: string
          market: string
          points: number
          prediction_id: string
          result: string
          settlement_event_id: string
          settlement_seq: number
          user_id: string
        }
        Update: {
          competition?: string
          created_at?: string
          fixture_id?: string
          id?: never
          kickoff_at?: string
          market?: string
          points?: number
          prediction_id?: string
          result?: string
          settlement_event_id?: string
          settlement_seq?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_score_ledger_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_score_ledger_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_score_ledger_settlement_event_id_fkey"
            columns: ["settlement_event_id"]
            isOneToOne: true
            referencedRelation: "settlement_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_score_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        ]
      }
      content_api_usage: {
        Row: {
          calls: number
          day: string
          errors: number
          provider: string
          refused: number
        }
        Insert: {
          calls?: number
          day?: string
          errors?: number
          provider: string
          refused?: number
        }
        Update: {
          calls?: number
          day?: string
          errors?: number
          provider?: string
          refused?: number
        }
        Relationships: []
      }
      content_generation_jobs: {
        Row: {
          article_id: string | null
          attempt: number
          error: string | null
          finished_at: string | null
          id: string
          job_key: string
          kind: string
          model: string | null
          report: Json | null
          started_at: string
          status: string
          trigger: string
        }
        Insert: {
          article_id?: string | null
          attempt?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          job_key: string
          kind: string
          model?: string | null
          report?: Json | null
          started_at?: string
          status?: string
          trigger: string
        }
        Update: {
          article_id?: string | null
          attempt?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          job_key?: string
          kind?: string
          model?: string | null
          report?: Json | null
          started_at?: string
          status?: string
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_generation_jobs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "newsroom_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_generation_logs: {
        Row: {
          at: string
          data: Json | null
          id: number
          job_id: string
          level: string
          message: string
          stage: string
        }
        Insert: {
          at?: string
          data?: Json | null
          id?: never
          job_id: string
          level: string
          message: string
          stage: string
        }
        Update: {
          at?: string
          data?: Json | null
          id?: never
          job_id?: string
          level?: string
          message?: string
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_generation_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      content_project_updates: {
        Row: {
          approved: boolean
          created_at: string
          created_by: string | null
          detail: string
          happened_on: string
          id: string
          title: string
          used_in_article: string | null
        }
        Insert: {
          approved?: boolean
          created_at?: string
          created_by?: string | null
          detail: string
          happened_on: string
          id?: string
          title: string
          used_in_article?: string | null
        }
        Update: {
          approved?: boolean
          created_at?: string
          created_by?: string | null
          detail?: string
          happened_on?: string
          id?: string
          title?: string
          used_in_article?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_project_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_project_updates_used_in_article_fkey"
            columns: ["used_in_article"]
            isOneToOne: false
            referencedRelation: "newsroom_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_settings: {
        Row: {
          auto_publish: boolean
          enabled: boolean
          id: boolean
          min_quality: number
          next_kind_override: string | null
          publish_on_schedule: boolean
          schedule_mode: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_publish?: boolean
          enabled?: boolean
          id?: boolean
          min_quality?: number
          next_kind_override?: string | null
          publish_on_schedule?: boolean
          schedule_mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_publish?: boolean
          enabled?: boolean
          id?: boolean
          min_quality?: number
          next_kind_override?: string | null
          publish_on_schedule?: boolean
          schedule_mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_sources: {
        Row: {
          article_id: string | null
          cited: boolean
          content_hash: string
          created_at: string
          domain: string
          id: string
          job_id: string
          ordinal: number
          source_published_at: string | null
          title: string
          url: string
          via: string
        }
        Insert: {
          article_id?: string | null
          cited?: boolean
          content_hash: string
          created_at?: string
          domain: string
          id?: string
          job_id: string
          ordinal: number
          source_published_at?: string | null
          title: string
          url: string
          via: string
        }
        Update: {
          article_id?: string | null
          cited?: boolean
          content_hash?: string
          created_at?: string
          domain?: string
          id?: string
          job_id?: string
          ordinal?: number
          source_published_at?: string | null
          title?: string
          url?: string
          via?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_sources_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "newsroom_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_sources_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          admin_id: string | null
          created_at: string
          credits: number
          feature: string | null
          id: string
          kind: string
          reason: string | null
          ref_id: string | null
          seq: number
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          credits: number
          feature?: string | null
          id?: string
          kind: string
          reason?: string | null
          ref_id?: string | null
          seq?: never
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          credits?: number
          feature?: string | null
          id?: string
          kind?: string
          reason?: string | null
          ref_id?: string | null
          seq?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_prices: {
        Row: {
          active: boolean
          credits: number
          feature: string
          title: string
        }
        Insert: {
          active?: boolean
          credits: number
          feature: string
          title: string
        }
        Update: {
          active?: boolean
          credits?: number
          feature?: string
          title?: string
        }
        Relationships: []
      }
      dev_readiness_state: {
        Row: {
          done: boolean
          task_id: string
          updated_at: string
        }
        Insert: {
          done: boolean
          task_id: string
          updated_at?: string
        }
        Update: {
          done?: boolean
          task_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      duel_picks: {
        Row: {
          correct: boolean | null
          created_at: string
          duel_id: string
          market: string
          selection: string
          user_id: string
        }
        Insert: {
          correct?: boolean | null
          created_at?: string
          duel_id: string
          market: string
          selection: string
          user_id: string
        }
        Update: {
          correct?: boolean | null
          created_at?: string
          duel_id?: string
          market?: string
          selection?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_picks_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duel_votes: {
        Row: {
          created_at: string
          duel_id: string
          side: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duel_id: string
          side: string
          user_id: string
        }
        Update: {
          created_at?: string
          duel_id?: string
          side?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "duel_votes_duel_id_fkey"
            columns: ["duel_id"]
            isOneToOne: false
            referencedRelation: "duels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duel_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      duels: {
        Row: {
          accepted_at: string | null
          challenger: string
          challenger_correct: number | null
          created_at: string
          fixture_id: string
          id: string
          markets: string[]
          message: string | null
          opponent: string | null
          opponent_correct: number | null
          settled_at: string | null
          stake: number
          status: string
          winner: string | null
        }
        Insert: {
          accepted_at?: string | null
          challenger: string
          challenger_correct?: number | null
          created_at?: string
          fixture_id: string
          id?: string
          markets: string[]
          message?: string | null
          opponent?: string | null
          opponent_correct?: number | null
          settled_at?: string | null
          stake?: number
          status?: string
          winner?: string | null
        }
        Update: {
          accepted_at?: string | null
          challenger?: string
          challenger_correct?: number | null
          created_at?: string
          fixture_id?: string
          id?: string
          markets?: string[]
          message?: string | null
          opponent?: string | null
          opponent_correct?: number | null
          settled_at?: string | null
          stake?: number
          status?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duels_challenger_fkey"
            columns: ["challenger"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_opponent_fkey"
            columns: ["opponent"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_winner_fkey"
            columns: ["winner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      early_access: {
        Row: {
          created_at: string
          email: string
          founding_number: number | null
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
          founding_number?: number | null
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
          founding_number?: number | null
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
      email_outbox: {
        Row: {
          attempts: number
          body: string
          claimed_at: string | null
          created_at: string
          created_by: string | null
          event_key: string | null
          id: string
          kind: string
          last_error: string | null
          not_before: string
          priority: number
          sent_at: string | null
          status: string
          subject: string
          to_email: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number
          body: string
          claimed_at?: string | null
          created_at?: string
          created_by?: string | null
          event_key?: string | null
          id?: string
          kind: string
          last_error?: string | null
          not_before?: string
          priority?: number
          sent_at?: string | null
          status?: string
          subject: string
          to_email?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number
          body?: string
          claimed_at?: string | null
          created_at?: string
          created_by?: string | null
          event_key?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          not_before?: string
          priority?: number
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_outbox_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      endorsement_emails: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          kind: string
          model: string | null
          org_id: string
          sender: string
          sent_at: string | null
          status: string
          subject: string
          to_email: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          kind: string
          model?: string | null
          org_id: string
          sender: string
          sent_at?: string | null
          status?: string
          subject: string
          to_email?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          kind?: string
          model?: string | null
          org_id?: string
          sender?: string
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "endorsement_emails_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "endorsement_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      endorsement_events: {
        Row: {
          admin_id: string | null
          created_at: string
          detail: string
          id: string
          kind: string
          org_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          detail?: string
          id?: string
          kind: string
          org_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          detail?: string
          id?: string
          kind?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "endorsement_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "endorsement_orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      endorsement_orgs: {
        Row: {
          contact_email: string | null
          contact_name: string
          contact_role: string
          created_at: string
          do_not_contact: boolean
          id: string
          jurisdiction: string
          kind: string
          last_contacted_at: string | null
          name: string
          next_follow_up_at: string | null
          notes: string
          reasons: string
          status: string
          updated_at: string
          website: string | null
          what_we_seek: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string
          contact_role?: string
          created_at?: string
          do_not_contact?: boolean
          id?: string
          jurisdiction?: string
          kind?: string
          last_contacted_at?: string | null
          name: string
          next_follow_up_at?: string | null
          notes?: string
          reasons?: string
          status?: string
          updated_at?: string
          website?: string | null
          what_we_seek?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string
          contact_role?: string
          created_at?: string
          do_not_contact?: boolean
          id?: string
          jurisdiction?: string
          kind?: string
          last_contacted_at?: string | null
          name?: string
          next_follow_up_at?: string | null
          notes?: string
          reasons?: string
          status?: string
          updated_at?: string
          website?: string | null
          what_we_seek?: string
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
      form_submissions: {
        Row: {
          created_at: string
          email: string | null
          emailed: boolean
          form: string
          id: string
          message: string | null
          meta: Json
          name: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          emailed?: boolean
          form: string
          id?: string
          message?: string | null
          meta?: Json
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          emailed?: boolean
          form?: string
          id?: string
          message?: string | null
          meta?: Json
          name?: string | null
        }
        Relationships: []
      }
      founding_campaign_sends: {
        Row: {
          campaign: string
          email: string
          sent_at: string
          status: string
        }
        Insert: {
          campaign: string
          email: string
          sent_at?: string
          status?: string
        }
        Update: {
          campaign?: string
          email?: string
          sent_at?: string
          status?: string
        }
        Relationships: []
      }
      founding_hq_activities: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          lead_id: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          lead_id: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "founding_hq_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "founding_hq_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      founding_hq_leads: {
        Row: {
          ambassador_stage: string
          country: string
          created_at: string
          created_by: string | null
          display_name: string
          follow_up_on: string | null
          follower_count: number | null
          id: string
          is_ambassador: boolean
          last_contacted_on: string | null
          notes: string | null
          profile_url: string | null
          registered: boolean
          segment: string
          source: string
          stage: string
          updated_at: string
          x_handle: string | null
        }
        Insert: {
          ambassador_stage?: string
          country?: string
          created_at?: string
          created_by?: string | null
          display_name: string
          follow_up_on?: string | null
          follower_count?: number | null
          id?: string
          is_ambassador?: boolean
          last_contacted_on?: string | null
          notes?: string | null
          profile_url?: string | null
          registered?: boolean
          segment?: string
          source?: string
          stage?: string
          updated_at?: string
          x_handle?: string | null
        }
        Update: {
          ambassador_stage?: string
          country?: string
          created_at?: string
          created_by?: string | null
          display_name?: string
          follow_up_on?: string | null
          follower_count?: number | null
          id?: string
          is_ambassador?: boolean
          last_contacted_on?: string | null
          notes?: string | null
          profile_url?: string | null
          registered?: boolean
          segment?: string
          source?: string
          stage?: string
          updated_at?: string
          x_handle?: string | null
        }
        Relationships: []
      }
      founding_welcome_sends: {
        Row: {
          email: string
          sent_at: string
          status: string
        }
        Insert: {
          email: string
          sent_at?: string
          status?: string
        }
        Update: {
          email?: string
          sent_at?: string
          status?: string
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
            foreignKeyName: "hidden_predictions_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: true
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verifications: {
        Row: {
          document_path: string | null
          method: string
          over_18: boolean | null
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          document_path?: string | null
          method?: string
          over_18?: boolean | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          document_path?: string | null
          method?: string
          over_18?: boolean | null
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      launch_email_sends: {
        Row: {
          detail: string | null
          email: string
          sent_at: string
          status: string
          wave: number
        }
        Insert: {
          detail?: string | null
          email: string
          sent_at?: string
          status?: string
          wave: number
        }
        Update: {
          detail?: string | null
          email?: string
          sent_at?: string
          status?: string
          wave?: number
        }
        Relationships: []
      }
      league_standings: {
        Row: {
          competition: string
          competition_key: string
          drawn: number
          goal_diff: number | null
          goals_against: number
          goals_for: number
          group_name: string
          lost: number
          played: number
          points: number
          position: number
          season: string
          source_domain: string | null
          source_url: string | null
          synced_at: string
          team: string
          updated_at: string
          won: number
        }
        Insert: {
          competition: string
          competition_key: string
          drawn: number
          goal_diff?: number | null
          goals_against: number
          goals_for: number
          group_name?: string
          lost: number
          played: number
          points: number
          position: number
          season: string
          source_domain?: string | null
          source_url?: string | null
          synced_at?: string
          team: string
          updated_at?: string
          won: number
        }
        Update: {
          competition?: string
          competition_key?: string
          drawn?: number
          goal_diff?: number | null
          goals_against?: number
          goals_for?: number
          group_name?: string
          lost?: number
          played?: number
          points?: number
          position?: number
          season?: string
          source_domain?: string | null
          source_url?: string | null
          synced_at?: string
          team?: string
          updated_at?: string
          won?: number
        }
        Relationships: []
      }
      market_odds: {
        Row: {
          captured_at: string
          fixture_id: string
          id: number
          market: string
          price: number
          selection: string
          source_domain: string
          source_url: string | null
        }
        Insert: {
          captured_at?: string
          fixture_id: string
          id?: number
          market: string
          price: number
          selection: string
          source_domain: string
          source_url?: string | null
        }
        Update: {
          captured_at?: string
          fixture_id?: string
          id?: number
          market?: string
          price?: number
          selection?: string
          source_domain?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_odds_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
        ]
      }
      member_details: {
        Row: {
          date_of_birth: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          province: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          date_of_birth?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          province?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          date_of_birth?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          province?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_preferences: {
        Row: {
          competitions: string[]
          sports: string[]
          teams: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          competitions?: string[]
          sports?: string[]
          teams?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          competitions?: string[]
          sports?: string[]
          teams?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_articles: {
        Row: {
          ai_model: string | null
          author_name: string
          body: string
          category: string
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          excerpt: string
          generation_job_id: string | null
          id: string
          image_attribution: string | null
          og_image_url: string | null
          origin: string
          published_at: string | null
          quality_issues: Json
          quality_score: number | null
          reading_minutes: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          ai_model?: string | null
          author_name?: string
          body?: string
          category: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt: string
          generation_job_id?: string | null
          id?: string
          image_attribution?: string | null
          og_image_url?: string | null
          origin?: string
          published_at?: string | null
          quality_issues?: Json
          quality_score?: number | null
          reading_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          ai_model?: string | null
          author_name?: string
          body?: string
          category?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string
          generation_job_id?: string | null
          id?: string
          image_attribution?: string | null
          og_image_url?: string | null
          origin?: string
          published_at?: string | null
          quality_issues?: Json
          quality_score?: number | null
          reading_minutes?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_articles_generation_job_fk"
            columns: ["generation_job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
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
      notifications: {
        Row: {
          audience: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          message: string
          newsroom_article_id: string | null
          published_at: string
          recipient_id: string | null
          target_url: string | null
          title: string
          visibility: string
        }
        Insert: {
          audience?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          newsroom_article_id?: string | null
          published_at?: string
          recipient_id?: string | null
          target_url?: string | null
          title: string
          visibility?: string
        }
        Update: {
          audience?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          newsroom_article_id?: string | null
          published_at?: string
          recipient_id?: string | null
          target_url?: string | null
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parallel_cache: {
        Row: {
          created_at: string
          endpoint: string
          expires_at: string
          key: string
          purpose: string
          response: Json
        }
        Insert: {
          created_at?: string
          endpoint: string
          expires_at: string
          key: string
          purpose: string
          response: Json
        }
        Update: {
          created_at?: string
          endpoint?: string
          expires_at?: string
          key?: string
          purpose?: string
          response?: Json
        }
        Relationships: []
      }
      payment_orders: {
        Row: {
          amount_cents: number
          created_at: string
          credits: number
          id: string
          pack: string
          paid_at: string | null
          pf_payment_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          credits: number
          id?: string
          pack: string
          paid_at?: string | null
          pf_payment_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          credits?: number
          id?: string
          pack?: string
          paid_at?: string | null
          pf_payment_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pfie_learning_examples: {
        Row: {
          created_at: string
          experiment_id: string | null
          fixture_key: string | null
          id: string
          label: Json | null
          label_status: string
          payload: Json
          provenance: Json
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string
          source_kind: string
          subject_key: string | null
          task_type: string
          training_status: string
        }
        Insert: {
          created_at?: string
          experiment_id?: string | null
          fixture_key?: string | null
          id?: string
          label?: Json | null
          label_status?: string
          payload?: Json
          provenance?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id: string
          source_kind: string
          subject_key?: string | null
          task_type: string
          training_status?: string
        }
        Update: {
          created_at?: string
          experiment_id?: string | null
          fixture_key?: string | null
          id?: string
          label?: Json | null
          label_status?: string
          payload?: Json
          provenance?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string
          source_kind?: string
          subject_key?: string | null
          task_type?: string
          training_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pfie_learning_examples_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "synthetic_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pfie_learning_examples_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pfie_learning_ingest_runs: {
        Row: {
          activity_events_seen: number
          error: string | null
          examples_inserted: number
          examples_updated: number
          finished_at: string | null
          id: string
          metadata: Json
          real_examples_inserted: number
          research_seen: number
          sessions_seen: number
          started_at: string
        }
        Insert: {
          activity_events_seen?: number
          error?: string | null
          examples_inserted?: number
          examples_updated?: number
          finished_at?: string | null
          id?: string
          metadata?: Json
          real_examples_inserted?: number
          research_seen?: number
          sessions_seen?: number
          started_at?: string
        }
        Update: {
          activity_events_seen?: number
          error?: string | null
          examples_inserted?: number
          examples_updated?: number
          finished_at?: string | null
          id?: string
          metadata?: Json
          real_examples_inserted?: number
          research_seen?: number
          sessions_seen?: number
          started_at?: string
        }
        Relationships: []
      }
      pfie_learning_subject_map: {
        Row: {
          created_at: string
          subject_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          subject_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          subject_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pfie_learning_subject_map_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pfie_observations: {
        Row: {
          accepted: boolean
          away: string
          away_score: number | null
          competition: string
          created_at: string
          domain: string | null
          home: string
          home_score: number | null
          id: number
          kickoff_utc: string | null
          match_date: string | null
          quote: string
          reject_reason: string | null
          run_id: string
          source_url: string | null
          status: string
          tier: string | null
        }
        Insert: {
          accepted: boolean
          away: string
          away_score?: number | null
          competition: string
          created_at?: string
          domain?: string | null
          home: string
          home_score?: number | null
          id?: never
          kickoff_utc?: string | null
          match_date?: string | null
          quote: string
          reject_reason?: string | null
          run_id: string
          source_url?: string | null
          status: string
          tier?: string | null
        }
        Update: {
          accepted?: boolean
          away?: string
          away_score?: number | null
          competition?: string
          created_at?: string
          domain?: string | null
          home?: string
          home_score?: number | null
          id?: never
          kickoff_utc?: string | null
          match_date?: string | null
          quote?: string
          reject_reason?: string | null
          run_id?: string
          source_url?: string | null
          status?: string
          tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pfie_observations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "pfie_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pfie_runs: {
        Row: {
          accepted_count: number
          competition: string
          decisions: Json
          error: string | null
          id: string
          kind: string
          model: string | null
          ok: boolean
          rejected_count: number
          sources: Json
          started_at: string
        }
        Insert: {
          accepted_count?: number
          competition: string
          decisions?: Json
          error?: string | null
          id?: string
          kind: string
          model?: string | null
          ok: boolean
          rejected_count?: number
          sources?: Json
          started_at?: string
        }
        Update: {
          accepted_count?: number
          competition?: string
          decisions?: Json
          error?: string | null
          id?: string
          kind?: string
          model?: string | null
          ok?: boolean
          rejected_count?: number
          sources?: Json
          started_at?: string
        }
        Relationships: []
      }
      pfie_user_activity_events: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          fixture_id: string | null
          id: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type: string
          fixture_id?: string | null
          id?: string
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          fixture_id?: string | null
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pfie_user_activity_events_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pfie_user_activity_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_implementation_task_events: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: Json
          event_type: string
          id: number
          task_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: Json
          event_type: string
          id?: never
          task_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: Json
          event_type?: string
          id?: never
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_implementation_task_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "platform_implementation_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_implementation_tasks: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          priority: string
          progress: number
          sort_order: number
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          priority?: string
          progress?: number
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          priority?: string
          progress?: number
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_updates: {
        Row: {
          created_at: string
          merged_at: string
          pr_number: number
          summary: string
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          merged_at: string
          pr_number: number
          summary: string
          title: string
          url: string
        }
        Update: {
          created_at?: string
          merged_at?: string
          pr_number?: number
          summary?: string
          title?: string
          url?: string
        }
        Relationships: []
      }
      podcast_episode_notifications: {
        Row: {
          consented_at: string
          created_at: string
          email: string
          episode_slug: string
          id: string
          notified_at: string | null
          source: string
        }
        Insert: {
          consented_at?: string
          created_at?: string
          email: string
          episode_slug: string
          id?: string
          notified_at?: string | null
          source?: string
        }
        Update: {
          consented_at?: string
          created_at?: string
          email?: string
          episode_slug?: string
          id?: string
          notified_at?: string | null
          source?: string
        }
        Relationships: []
      }
      point_rules: {
        Row: {
          active: boolean
          cap_per_day: number | null
          cap_per_month: number | null
          code: string
          points: number
          sort: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          cap_per_day?: number | null
          cap_per_month?: number | null
          code: string
          points: number
          sort?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          cap_per_day?: number | null
          cap_per_month?: number | null
          code?: string
          points?: number
          sort?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      practice_credit_ledger: {
        Row: {
          created_at: string
          credits: number
          feature: string | null
          id: number
          kind: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          credits: number
          feature?: string | null
          id?: never
          kind: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          feature?: string | null
          id?: never
          kind?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_draw_log: {
        Row: {
          draw_group_id: string
          drawn_at: string
          drawn_by: string | null
          entries: number
          id: string
          note: string | null
          winner_founding_number: number | null
          winner_rank: number
          winner_user_id: string | null
          witness: string
        }
        Insert: {
          draw_group_id?: string
          drawn_at?: string
          drawn_by?: string | null
          entries: number
          id?: string
          note?: string | null
          winner_founding_number?: number | null
          winner_rank?: number
          winner_user_id?: string | null
          witness: string
        }
        Update: {
          draw_group_id?: string
          drawn_at?: string
          drawn_by?: string | null
          entries?: number
          id?: string
          note?: string | null
          winner_founding_number?: number | null
          winner_rank?: number
          winner_user_id?: string | null
          witness?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_draw_log_drawn_by_fkey"
            columns: ["drawn_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_draw_log_winner_user_id_fkey"
            columns: ["winner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_fixture_plans: {
        Row: {
          fixture_id: string
          planned_away: number
          planned_home: number
        }
        Insert: {
          fixture_id: string
          planned_away: number
          planned_home: number
        }
        Update: {
          fixture_id?: string
          planned_away?: number
          planned_home?: number
        }
        Relationships: [
          {
            foreignKeyName: "practice_fixture_plans_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: true
            referencedRelation: "practice_fixtures"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_fixtures: {
        Row: {
          away: string
          away_score: number | null
          created_at: string
          home: string
          home_score: number | null
          id: string
          kickoff_at: string
          lambda_away: number
          lambda_home: number
          odds: Json
          round: number
          season_id: string
          status: string
        }
        Insert: {
          away: string
          away_score?: number | null
          created_at?: string
          home: string
          home_score?: number | null
          id?: string
          kickoff_at: string
          lambda_away: number
          lambda_home: number
          odds: Json
          round: number
          season_id: string
          status?: string
        }
        Update: {
          away?: string
          away_score?: number | null
          created_at?: string
          home?: string
          home_score?: number | null
          id?: string
          kickoff_at?: string
          lambda_away?: number
          lambda_home?: number
          odds?: Json
          round?: number
          season_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_fixtures_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "practice_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_points_ledger: {
        Row: {
          created_at: string
          id: string
          kind: string
          points: number
          ref_id: string | null
          rule_code: string | null
          seq: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          points: number
          ref_id?: string | null
          rule_code?: string | null
          seq?: never
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          points?: number
          ref_id?: string | null
          rule_code?: string | null
          seq?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_predictions: {
        Row: {
          confidence: number
          created_at: string
          fixture_id: string
          id: string
          market: string
          odds: number
          result: string | null
          selection: string
          settled_at: string | null
          units: number | null
          user_id: string
        }
        Insert: {
          confidence: number
          created_at?: string
          fixture_id: string
          id?: string
          market: string
          odds: number
          result?: string | null
          selection: string
          settled_at?: string | null
          units?: number | null
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          fixture_id?: string
          id?: string
          market?: string
          odds?: number
          result?: string | null
          selection?: string
          settled_at?: string | null
          units?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_predictions_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "practice_fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_redemptions: {
        Row: {
          created_at: string
          demo_code: string
          id: string
          points: number
          reward_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          demo_code: string
          id?: string
          points: number
          reward_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          demo_code?: string
          id?: string
          points?: number
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "practice_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_rewards: {
        Row: {
          active: boolean
          code: string
          description: string | null
          id: string
          kind: string
          points_cost: number
          sort: number
          title: string
        }
        Insert: {
          active?: boolean
          code: string
          description?: string | null
          id?: string
          kind: string
          points_cost: number
          sort?: number
          title: string
        }
        Update: {
          active?: boolean
          code?: string
          description?: string | null
          id?: string
          kind?: string
          points_cost?: number
          sort?: number
          title?: string
        }
        Relationships: []
      }
      practice_seasons: {
        Row: {
          created_at: string
          full_time_seconds: number
          id: string
          lock_seconds: number
          number: number
          round_seconds: number
          seed: number
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          full_time_seconds: number
          id?: string
          lock_seconds: number
          number: number
          round_seconds: number
          seed: number
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          full_time_seconds?: number
          id?: string
          lock_seconds?: number
          number?: number
          round_seconds?: number
          seed?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      practice_settings: {
        Row: {
          enabled: boolean
          full_time_seconds: number
          id: number
          lock_seconds: number
          round_seconds: number
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          full_time_seconds?: number
          id?: number
          lock_seconds?: number
          round_seconds?: number
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          full_time_seconds?: number
          id?: number
          lock_seconds?: number
          round_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      prediction_odds_overrides: {
        Row: {
          admin_id: string | null
          odds_unverified: boolean
          prediction_id: string
          reason: string
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          odds_unverified: boolean
          prediction_id: string
          reason: string
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          odds_unverified?: boolean
          prediction_id?: string
          reason?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_odds_overrides_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: true
            referencedRelation: "predictions"
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
          odds_unverified: boolean
          prev_hash: string
          reasoning: string | null
          reference_odds: number | null
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
          odds_unverified?: boolean
          prev_hash: string
          reasoning?: string | null
          reference_odds?: number | null
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
          odds_unverified?: boolean
          prev_hash?: string
          reasoning?: string | null
          reference_odds?: number | null
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
        ]
      }
      pro_payments: {
        Row: {
          amount_cents: number
          paid_at: string
          pf_payment_id: string
          subscription_id: string
        }
        Insert: {
          amount_cents: number
          paid_at?: string
          pf_payment_id: string
          subscription_id: string
        }
        Update: {
          amount_cents?: number
          paid_at?: string
          pf_payment_id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "pro_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_subscriptions: {
        Row: {
          amount_cents: number
          cancel_requested_at: string | null
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          entitlement_id: string | null
          id: string
          pf_token: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          cancel_requested_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          entitlement_id?: string | null
          id?: string
          pf_token?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          cancel_requested_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          entitlement_id?: string | null
          id?: string
          pf_token?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_subscriptions_entitlement_id_fkey"
            columns: ["entitlement_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pro_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_usage: {
        Row: {
          feature: string
          ref_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          feature: string
          ref_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          feature?: string
          ref_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          ai_persona_key: string | null
          avatar_url: string | null
          birth_year: number | null
          created_at: string
          display_name: string
          founding_number: number | null
          id: string
          is_18_attested: boolean
          is_ai_participant: boolean
          is_banned: boolean
          language: string
          marketing_opt_in: boolean
          popia_consent_at: string | null
          posting_paused_until: string | null
          referral_code: string | null
          referred_by: string | null
          role: string
          suspended_until: string | null
          suspension_reason: string | null
          username: string
        }
        Insert: {
          account_type?: string
          ai_persona_key?: string | null
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          display_name: string
          founding_number?: number | null
          id: string
          is_18_attested: boolean
          is_ai_participant?: boolean
          is_banned?: boolean
          language?: string
          marketing_opt_in?: boolean
          popia_consent_at?: string | null
          posting_paused_until?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string
          suspended_until?: string | null
          suspension_reason?: string | null
          username: string
        }
        Update: {
          account_type?: string
          ai_persona_key?: string | null
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          display_name?: string
          founding_number?: number | null
          id?: string
          is_18_attested?: boolean
          is_ai_participant?: boolean
          is_banned?: boolean
          language?: string
          marketing_opt_in?: boolean
          popia_consent_at?: string | null
          posting_paused_until?: string | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string
          suspended_until?: string | null
          suspension_reason?: string | null
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
        ]
      }
      punt_ai_cache: {
        Row: {
          answer: string
          cache_key: string
          created_at: string
          expires_at: string
          mode: string
          model: string
          sources: Json
          updated_at: string
        }
        Insert: {
          answer: string
          cache_key: string
          created_at?: string
          expires_at: string
          mode: string
          model: string
          sources?: Json
          updated_at?: string
        }
        Update: {
          answer?: string
          cache_key?: string
          created_at?: string
          expires_at?: string
          mode?: string
          model?: string
          sources?: Json
          updated_at?: string
        }
        Relationships: []
      }
      punt_ai_usage: {
        Row: {
          cache_hit: boolean
          cache_key: string
          created_at: string
          credits_charged: number
          id: string
          mode: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cache_hit?: boolean
          cache_key: string
          created_at?: string
          credits_charged?: number
          id?: string
          mode: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cache_hit?: boolean
          cache_key?: string
          created_at?: string
          credits_charged?: number
          id?: string
          mode?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "punt_ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      puntpoints_ledger: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          kind: string
          points: number
          reason: string | null
          ref_id: string | null
          rule_code: string | null
          seq: number
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          kind: string
          points: number
          reason?: string | null
          ref_id?: string | null
          rule_code?: string | null
          seq?: never
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          points?: number
          reason?: string | null
          ref_id?: string | null
          rule_code?: string | null
          seq?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "puntpoints_ledger_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puntpoints_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      puntpoints_reward_cost_promotions: {
        Row: {
          base_points_cost: number
          ends_at: string
          promotional_points_cost: number
          reverted_at: string | null
          reward_id: string
          starts_at: string
        }
        Insert: {
          base_points_cost: number
          ends_at: string
          promotional_points_cost: number
          reverted_at?: string | null
          reward_id: string
          starts_at: string
        }
        Update: {
          base_points_cost?: number
          ends_at?: string
          promotional_points_cost?: number
          reverted_at?: string | null
          reward_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "puntpoints_reward_cost_promotions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: true
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      puntpoints_transfers: {
        Row: {
          created_at: string
          from_user: string
          id: string
          note: string | null
          points: number
          to_user: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          note?: string | null
          points: number
          to_user: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          note?: string | null
          points?: number
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "puntpoints_transfers_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puntpoints_transfers_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_campaigns: {
        Row: {
          attempted_count: number
          audience: string
          body: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          failed_count: number
          id: string
          sent_count: number
          status: string
          target_url: string
          title: string
        }
        Insert: {
          attempted_count?: number
          audience: string
          body: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          sent_count?: number
          status?: string
          target_url?: string
          title: string
        }
        Update: {
          attempted_count?: number
          audience?: string
          body?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          sent_count?: number
          status?: string
          target_url?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_deliveries: {
        Row: {
          campaign_id: string
          error: string | null
          id: number
          sent_at: string
          status: string
          status_code: number | null
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          error?: string | null
          id?: never
          sent_at?: string
          status: string
          status_code?: number | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          error?: string | null
          id?: never
          sent_at?: string
          status?: string
          status_code?: number | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_notification_deliveries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "push_notification_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notification_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "push_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          enabled: boolean
          endpoint: string
          expiration_time: number | null
          id: string
          last_seen_at: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          enabled?: boolean
          endpoint: string
          expiration_time?: number | null
          id?: string
          last_seen_at?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          enabled?: boolean
          endpoint?: string
          expiration_time?: number | null
          id?: string
          last_seen_at?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_progress: {
        Row: {
          evidence: string | null
          points_awarded: number
          quest_code: string
          review_note: string | null
          reviewed_by: string | null
          started_at: string
          status: string
          submitted_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          evidence?: string | null
          points_awarded?: number
          quest_code: string
          review_note?: string | null
          reviewed_by?: string | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          evidence?: string | null
          points_awarded?: number
          quest_code?: string
          review_note?: string | null
          reviewed_by?: string | null
          started_at?: string
          status?: string
          submitted_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quest_progress_quest_code_fkey"
            columns: ["quest_code"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "quest_progress_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          action_url: string | null
          active: boolean
          category: string
          code: string
          coming_soon: boolean
          description: string
          handle_label: string | null
          points: number
          rewarded: boolean
          sort: number
          title: string
          updated_at: string
          verification: string
        }
        Insert: {
          action_url?: string | null
          active?: boolean
          category: string
          code: string
          coming_soon?: boolean
          description: string
          handle_label?: string | null
          points: number
          rewarded?: boolean
          sort?: number
          title: string
          updated_at?: string
          verification: string
        }
        Update: {
          action_url?: string | null
          active?: boolean
          category?: string
          code?: string
          coming_soon?: boolean
          description?: string
          handle_label?: string | null
          points?: number
          rewarded?: boolean
          sort?: number
          title?: string
          updated_at?: string
          verification?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          admin_id: string | null
          created_at: string
          id: string
          note: string | null
          points: number
          reward_id: string
          status: string
          updated_at: string
          user_id: string
          voucher_code: string | null
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          points: number
          reward_id: string
          status?: string
          updated_at?: string
          user_id: string
          voucher_code?: string | null
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          points?: number
          reward_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          voucher_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_milestones: {
        Row: {
          active: boolean
          bonus_points: number
          threshold: number
          title: string
        }
        Insert: {
          active?: boolean
          bonus_points: number
          threshold: number
          title: string
        }
        Update: {
          active?: boolean
          bonus_points?: number
          threshold?: number
          title?: string
        }
        Relationships: []
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
          reversed_at: string | null
          status: string
          vested_at: string | null
          vests_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          qualifying_prediction_id: string
          referred_credits?: number
          referred_id: string
          referrer_credits?: number
          referrer_id: string
          reversed_at?: string | null
          status?: string
          vested_at?: string | null
          vests_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          qualifying_prediction_id?: string
          referred_credits?: number
          referred_id?: string
          referrer_credits?: number
          referrer_id?: string
          reversed_at?: string | null
          status?: string
          vested_at?: string | null
          vests_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_qualifying_prediction_id_fkey"
            columns: ["qualifying_prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          redemption_id: string | null
          reward_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          redemption_id?: string | null
          reward_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          redemption_id?: string | null
          reward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_codes_redemption_fk"
            columns: ["redemption_id"]
            isOneToOne: true
            referencedRelation: "redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_codes_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_settings: {
        Row: {
          enabled: boolean
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          active: boolean
          available_from: string | null
          category: string | null
          code: string
          created_at: string
          description: string | null
          face_value_cents: number | null
          fulfilment: string
          funded_by: string
          id: string
          kind: string
          points_cost: number
          requires_approval: boolean
          sort: number
          sponsor: string | null
          sponsor_url: string | null
          stock: number | null
          terms: string | null
          title: string
        }
        Insert: {
          active?: boolean
          available_from?: string | null
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          face_value_cents?: number | null
          fulfilment?: string
          funded_by?: string
          id?: string
          kind: string
          points_cost: number
          requires_approval?: boolean
          sort?: number
          sponsor?: string | null
          sponsor_url?: string | null
          stock?: number | null
          terms?: string | null
          title: string
        }
        Update: {
          active?: boolean
          available_from?: string | null
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          face_value_cents?: number | null
          fulfilment?: string
          funded_by?: string
          id?: string
          kind?: string
          points_cost?: number
          requires_approval?: boolean
          sort?: number
          sponsor?: string | null
          sponsor_url?: string | null
          stock?: number | null
          terms?: string | null
          title?: string
        }
        Relationships: []
      }
      scoring_rule_changes: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: number
          market: string
          new_points: number
          old_points: number
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: never
          market: string
          new_points: number
          old_points: number
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: never
          market?: string
          new_points?: number
          old_points?: number
        }
        Relationships: []
      }
      scoring_rules: {
        Row: {
          market: string
          points: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          market: string
          points: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          market?: string
          points?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scoring_rules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "settlement_events_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      slip_parses: {
        Row: {
          chars: number
          created_at: string
          id: number
          ok: boolean
          source: string
          user_id: string
        }
        Insert: {
          chars?: number
          created_at?: string
          id?: never
          ok: boolean
          source: string
          user_id: string
        }
        Update: {
          chars?: number
          created_at?: string
          id?: never
          ok?: boolean
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slip_parses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      standings_applied: {
        Row: {
          applied_at: string
          applied_away_score: number | null
          applied_home_score: number | null
          away_team: string | null
          competition_key: string
          fixture_id: string
          home_team: string | null
          needs_refresh: boolean
          season: string | null
        }
        Insert: {
          applied_at?: string
          applied_away_score?: number | null
          applied_home_score?: number | null
          away_team?: string | null
          competition_key: string
          fixture_id: string
          home_team?: string | null
          needs_refresh?: boolean
          season?: string | null
        }
        Update: {
          applied_at?: string
          applied_away_score?: number | null
          applied_home_score?: number | null
          away_team?: string | null
          competition_key?: string
          fixture_id?: string
          home_team?: string | null
          needs_refresh?: boolean
          season?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standings_applied_fixture_id_fkey"
            columns: ["fixture_id"]
            isOneToOne: false
            referencedRelation: "fixtures"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answers: Json
          contact_ok: boolean
          created_at: string
          draw_entry: boolean
          id: string
          improve: string | null
          liked: string | null
          pass_interest: string | null
          pricing_view: string | null
          rating: number | null
          survey_version: number
          user_id: string
          wanted_features: string[]
        }
        Insert: {
          answers?: Json
          contact_ok?: boolean
          created_at?: string
          draw_entry?: boolean
          id?: string
          improve?: string | null
          liked?: string | null
          pass_interest?: string | null
          pricing_view?: string | null
          rating?: number | null
          survey_version?: number
          user_id: string
          wanted_features?: string[]
        }
        Update: {
          answers?: Json
          contact_ok?: boolean
          created_at?: string
          draw_entry?: boolean
          id?: string
          improve?: string | null
          liked?: string | null
          pass_interest?: string | null
          pricing_view?: string | null
          rating?: number | null
          survey_version?: number
          user_id?: string
          wanted_features?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_status: {
        Row: {
          consecutive_failures: number
          job: string
          last_attempt_at: string | null
          last_error: string | null
          last_success_at: string | null
          last_synced_at: string | null
          meta: Json
          scope: string
        }
        Insert: {
          consecutive_failures?: number
          job: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          last_synced_at?: string | null
          meta?: Json
          scope: string
        }
        Update: {
          consecutive_failures?: number
          job?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          last_synced_at?: string | null
          meta?: Json
          scope?: string
        }
        Relationships: []
      }
      synthetic_budget_ledger: {
        Row: {
          created_at: string
          estimated_usd: number
          experiment_id: string
          id: string
          metadata: Json
          operation: string
          provider: string
          provider_request_id: string | null
          request_key: string
          settled_at: string | null
          settled_usd: number | null
          status: string
        }
        Insert: {
          created_at?: string
          estimated_usd: number
          experiment_id: string
          id?: string
          metadata?: Json
          operation: string
          provider: string
          provider_request_id?: string | null
          request_key: string
          settled_at?: string | null
          settled_usd?: number | null
          status?: string
        }
        Update: {
          created_at?: string
          estimated_usd?: number
          experiment_id?: string
          id?: string
          metadata?: Json
          operation?: string
          provider?: string
          provider_request_id?: string | null
          request_key?: string
          settled_at?: string | null
          settled_usd?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "synthetic_budget_ledger_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "synthetic_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      synthetic_experiments: {
        Row: {
          budget_cap_usd: number
          created_at: string
          ends_at: string
          environment: string
          id: string
          label: string
          reserved_usd: number
          slug: string
          spent_usd: number
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          budget_cap_usd?: number
          created_at?: string
          ends_at: string
          environment?: string
          id?: string
          label: string
          reserved_usd?: number
          slug: string
          spent_usd?: number
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          budget_cap_usd?: number
          created_at?: string
          ends_at?: string
          environment?: string
          id?: string
          label?: string
          reserved_usd?: number
          slug?: string
          spent_usd?: number
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      synthetic_personas: {
        Row: {
          active: boolean
          created_at: string
          experiment_id: string
          id: string
          last_decision_at: string | null
          last_run_at: string | null
          persona: Json
          persona_key: string
          profile_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          experiment_id: string
          id?: string
          last_decision_at?: string | null
          last_run_at?: string | null
          persona: Json
          persona_key: string
          profile_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          experiment_id?: string
          id?: string
          last_decision_at?: string | null
          last_run_at?: string | null
          persona?: Json
          persona_key?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "synthetic_personas_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "synthetic_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "synthetic_personas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      synthetic_research: {
        Row: {
          created_at: string
          experiment_id: string
          fixture_key: string
          id: string
          provider: string
          response_json: Json
          source_urls: string[]
        }
        Insert: {
          created_at?: string
          experiment_id: string
          fixture_key: string
          id?: string
          provider?: string
          response_json: Json
          source_urls?: string[]
        }
        Update: {
          created_at?: string
          experiment_id?: string
          fixture_key?: string
          id?: string
          provider?: string
          response_json?: Json
          source_urls?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "synthetic_research_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "synthetic_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      synthetic_sessions: {
        Row: {
          created_at: string
          error_code: string | null
          experiment_id: string
          finished_at: string | null
          id: string
          metadata: Json
          outcome: string
          page_paths: string[]
          persona_key: string
          session_type: string
          started_at: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          experiment_id: string
          finished_at?: string | null
          id?: string
          metadata?: Json
          outcome?: string
          page_paths?: string[]
          persona_key: string
          session_type: string
          started_at?: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          experiment_id?: string
          finished_at?: string | null
          id?: string
          metadata?: Json
          outcome?: string
          page_paths?: string[]
          persona_key?: string
          session_type?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "synthetic_sessions_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "synthetic_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      team_badges: {
        Row: {
          attempts: number
          checked_at: string | null
          created_at: string
          id: string
          last_error: string | null
          logo_url: string | null
          method: string | null
          source_image: string | null
          source_page: string | null
          sport: string
          status: string
          team_key: string
          team_name: string
          updated_at: string
          upgrade_checked_at: string | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          checked_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          logo_url?: string | null
          method?: string | null
          source_image?: string | null
          source_page?: string | null
          sport?: string
          status?: string
          team_key: string
          team_name: string
          updated_at?: string
          upgrade_checked_at?: string | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          checked_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          logo_url?: string | null
          method?: string | null
          source_image?: string | null
          source_page?: string | null
          sport?: string
          status?: string
          team_key?: string
          team_name?: string
          updated_at?: string
          upgrade_checked_at?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      team_follow_events: {
        Row: {
          action: string
          created_at: string
          id: number
          source: string
          sport: string
          team_key: string
          team_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: never
          source?: string
          sport: string
          team_key: string
          team_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: never
          source?: string
          sport?: string
          team_key?: string
          team_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_follow_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_follows: {
        Row: {
          created_at: string
          sport: string
          team_key: string
          team_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          sport?: string
          team_key: string
          team_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          sport?: string
          team_key?: string
          team_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_results: {
        Row: {
          away: string
          away_score: number
          competition: string
          competition_key: string
          created_at: string
          home: string
          home_score: number
          id: string
          match_date: string
          source_domains: string[]
        }
        Insert: {
          away: string
          away_score: number
          competition: string
          competition_key: string
          created_at?: string
          home: string
          home_score: number
          id?: string
          match_date: string
          source_domains?: string[]
        }
        Update: {
          away?: string
          away_score?: number
          competition?: string
          competition_key?: string
          created_at?: string
          home?: string
          home_score?: number
          id?: string
          match_date?: string
          source_domains?: string[]
        }
        Relationships: []
      }
      tipster_charges: {
        Row: {
          amount: number
          created_at: string
          fee: number
          id: string
          kind: string
          period_end: string | null
          period_start: string | null
          prediction_id: string | null
          resolved_at: string | null
          status: string
          subscription_id: string
          supporter_id: string
          tipster_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          fee?: number
          id?: string
          kind: string
          period_end?: string | null
          period_start?: string | null
          prediction_id?: string | null
          resolved_at?: string | null
          status?: string
          subscription_id: string
          supporter_id: string
          tipster_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          fee?: number
          id?: string
          kind?: string
          period_end?: string | null
          period_start?: string | null
          prediction_id?: string | null
          resolved_at?: string | null
          status?: string
          subscription_id?: string
          supporter_id?: string
          tipster_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipster_charges_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_charges_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tipster_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_charges_supporter_id_fkey"
            columns: ["supporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_charges_tipster_id_fkey"
            columns: ["tipster_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tipster_copies: {
        Row: {
          created_at: string
          prediction_id: string
          subscription_id: string
          supporter_id: string
          tipster_id: string
        }
        Insert: {
          created_at?: string
          prediction_id: string
          subscription_id: string
          supporter_id: string
          tipster_id: string
        }
        Update: {
          created_at?: string
          prediction_id?: string
          subscription_id?: string
          supporter_id?: string
          tipster_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipster_copies_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_copies_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tipster_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_copies_supporter_id_fkey"
            columns: ["supporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_copies_tipster_id_fkey"
            columns: ["tipster_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tipster_pick_notes: {
        Row: {
          created_at: string
          note: string
          prediction_id: string
          tipster_id: string
        }
        Insert: {
          created_at?: string
          note: string
          prediction_id: string
          tipster_id: string
        }
        Update: {
          created_at?: string
          note?: string
          prediction_id?: string
          tipster_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipster_pick_notes_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: true
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_pick_notes_tipster_id_fkey"
            columns: ["tipster_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tipster_profiles: {
        Row: {
          accepting: boolean
          pitch: string | null
          price_month: number | null
          price_pick: number | null
          price_week: number | null
          qualified_at: string
          status: string
          status_reason: string | null
          streak_at_unlock: number | null
          unlocked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepting?: boolean
          pitch?: string | null
          price_month?: number | null
          price_pick?: number | null
          price_week?: number | null
          qualified_at?: string
          status?: string
          status_reason?: string | null
          streak_at_unlock?: number | null
          unlocked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepting?: boolean
          pitch?: string | null
          price_month?: number | null
          price_pick?: number | null
          price_week?: number | null
          qualified_at?: string
          status?: string
          status_reason?: string | null
          streak_at_unlock?: number | null
          unlocked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipster_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tipster_subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          end_reason: string | null
          ended_at: string | null
          id: string
          period_end: string | null
          period_start: string | null
          plan: string
          price: number
          status: string
          supporter_id: string
          tipster_id: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          plan: string
          price: number
          status?: string
          supporter_id: string
          tipster_id: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          plan?: string
          price?: number
          status?: string
          supporter_id?: string
          tipster_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipster_subscriptions_supporter_id_fkey"
            columns: ["supporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_subscriptions_tipster_id_fkey"
            columns: ["tipster_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_reviews: {
        Row: {
          id: string
          key: string
          locale: string
          namespace: string
          note: string | null
          reviewed_at: string
          reviewed_text: string
          reviewer_id: string | null
          source_text: string
          status: string
          suggestion: string | null
        }
        Insert: {
          id?: string
          key: string
          locale: string
          namespace: string
          note?: string | null
          reviewed_at?: string
          reviewed_text: string
          reviewer_id?: string | null
          source_text: string
          status: string
          suggestion?: string | null
        }
        Update: {
          id?: string
          key?: string
          locale?: string
          namespace?: string
          note?: string | null
          reviewed_at?: string
          reviewed_text?: string
          reviewer_id?: string | null
          source_text?: string
          status?: string
          suggestion?: string | null
        }
        Relationships: []
      }
      translation_signoffs: {
        Row: {
          approved_count: number
          decision: string
          id: string
          locale: string
          note: string | null
          reviewer_name: string
          signed_at: string
          signed_by: string | null
          total_count: number
        }
        Insert: {
          approved_count?: number
          decision: string
          id?: string
          locale: string
          note?: string | null
          reviewer_name: string
          signed_at?: string
          signed_by?: string | null
          total_count?: number
        }
        Update: {
          approved_count?: number
          decision?: string
          id?: string
          locale?: string
          note?: string | null
          reviewer_name?: string
          signed_at?: string
          signed_by?: string | null
          total_count?: number
        }
        Relationships: []
      }
      user_entitlements: {
        Row: {
          created_at: string
          entitlement: string
          expires_at: string | null
          granted_by: string | null
          id: string
          note: string | null
          revoked_at: string | null
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entitlement: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          note?: string | null
          revoked_at?: string | null
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entitlement?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          note?: string | null
          revoked_at?: string | null
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_entitlements_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_invites: {
        Row: {
          detail: string | null
          email: string
          sent_at: string
          status: string
        }
        Insert: {
          detail?: string | null
          email: string
          sent_at?: string
          status?: string
        }
        Update: {
          detail?: string | null
          email?: string
          sent_at?: string
          status?: string
        }
        Relationships: []
      }
      waitlist_unsubscribes: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
    }
    Views: {
      api_call_usage_attribution: {
        Row: {
          calls: number | null
          consumer: string | null
          estimated_usd: number | null
          feature: string | null
          last_call: string | null
          operation: string | null
          provider: string | null
        }
        Relationships: []
      }
      api_call_usage_attribution_detail: {
        Row: {
          attempt_id: string | null
          claimed_at: string | null
          competition: string | null
          completed_at: string | null
          consumer: string | null
          estimated_cost_usd: number | null
          feature: string | null
          id: number | null
          job_run_id: string | null
          metadata: Json | null
          operation: string | null
          provider: string | null
          reason_code: string | null
          status: string | null
        }
        Insert: {
          attempt_id?: string | null
          claimed_at?: string | null
          competition?: string | null
          completed_at?: string | null
          consumer?: string | null
          estimated_cost_usd?: number | null
          feature?: string | null
          id?: number | null
          job_run_id?: string | null
          metadata?: Json | null
          operation?: string | null
          provider?: string | null
          reason_code?: string | null
          status?: string | null
        }
        Update: {
          attempt_id?: string | null
          claimed_at?: string | null
          competition?: string | null
          completed_at?: string | null
          consumer?: string | null
          estimated_cost_usd?: number | null
          feature?: string | null
          id?: number | null
          job_run_id?: string | null
          metadata?: Json | null
          operation?: string | null
          provider?: string | null
          reason_code?: string | null
          status?: string | null
        }
        Relationships: []
      }
      bookmaker_review_stats: {
        Row: {
          avg_ease_of_use: number | null
          avg_overall: number | null
          avg_payouts: number | null
          avg_support: number | null
          bookmaker_slug: string | null
          review_count: number | null
        }
        Relationships: []
      }
      completed_matches: {
        Row: {
          away: string | null
          away_score: number | null
          competition: string | null
          home: string | null
          home_score: number | null
          id: string | null
          kickoff_at: string | null
        }
        Relationships: []
      }
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
        ]
      }
      pfie_learning_signals: {
        Row: {
          category: string | null
          competition: string | null
          event_type: string | null
          interactions: number | null
          last_seen_at: string | null
          market: string | null
          pseudonymous_participants: number | null
          sport: string | null
        }
        Relationships: []
      }
      pfie_training_dataset: {
        Row: {
          created_at: string | null
          fixture_key: string | null
          id: string | null
          label: Json | null
          payload: Json | null
          provenance: Json | null
          reviewed_at: string | null
          source_kind: string | null
          task_type: string | null
        }
        Insert: {
          created_at?: string | null
          fixture_key?: string | null
          id?: string | null
          label?: Json | null
          payload?: Json | null
          provenance?: Json | null
          reviewed_at?: string | null
          source_kind?: string | null
          task_type?: string | null
        }
        Update: {
          created_at?: string | null
          fixture_key?: string | null
          id?: string | null
          label?: Json | null
          payload?: Json | null
          provenance?: Json | null
          reviewed_at?: string | null
          source_kind?: string | null
          task_type?: string | null
        }
        Relationships: []
      }
      prediction_odds_state: {
        Row: {
          odds: number | null
          odds_unverified: boolean | null
          prediction_id: string | null
          reference_odds: number | null
          settle_odds: number | null
        }
        Relationships: []
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
        ]
      }
      public_affiliate_creatives: {
        Row: {
          body: string | null
          cta_label: string | null
          format: string | null
          headline: string | null
          id: string | null
          image_url: string | null
          partner_id: string | null
          partner_name: string | null
          partner_slug: string | null
          placements: string[] | null
          terms_line: string | null
          tracking_link: string | null
          weight: number | null
        }
        Relationships: []
      }
      public_affiliate_partners: {
        Row: {
          id: string | null
          name: string | null
          slug: string | null
          tracking_link: string | null
          website_url: string | null
        }
        Relationships: []
      }
      public_bookmaker_reviews: {
        Row: {
          avatar_url: string | null
          body: string | null
          bookmaker_slug: string | null
          created_at: string | null
          display_name: string | null
          ease_of_use: number | null
          id: string | null
          overall: number | null
          payouts: number | null
          support: number | null
          updated_at: string | null
          username: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          founding_number: number | null
          id: string | null
          is_ai_participant: boolean | null
          username: string | null
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
          odds_unverified: boolean | null
          prev_hash: string | null
          reasoning: string | null
          reference_odds: number | null
          selection: string | null
          seq: number | null
          user_id: string | null
        }
        Relationships: []
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
        ]
      }
    }
    Functions: {
      accept_duel: { Args: { p_duel: string; p_picks: Json }; Returns: Json }
      acknowledge_warnings: { Args: never; Returns: number }
      add_tipster_note: {
        Args: { p_note: string; p_prediction: string }
        Returns: undefined
      }
      admin_adjust_points: {
        Args: { p_points: number; p_reason: string; p_user: string }
        Returns: number
      }
      admin_analytics: { Args: { p_days?: number }; Returns: Json }
      admin_approve_pfie_learning_example: {
        Args: { p_admin_id: string; p_example_id: string }
        Returns: boolean
      }
      admin_campaign_report: {
        Args: { p_campaign?: string; p_since: string }
        Returns: {
          event: string
          events: number
          utm_campaign: string
          utm_content: string
          utm_source: string
          visitors: number
        }[]
      }
      admin_cancel_redemption: {
        Args: { p_reason: string; p_redemption: string }
        Returns: {
          admin_id: string | null
          created_at: string
          id: string
          note: string | null
          points: number
          reward_id: string
          status: string
          updated_at: string
          user_id: string
          voucher_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "redemptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_founding_members: {
        Args: never
        Returns: {
          email: string
          first_name: string
          founding_number: number
          phone: string
          signed_up_at: string
          status: string
          surname: string
        }[]
      }
      admin_fulfil_redemption: {
        Args: { p_note?: string; p_redemption: string }
        Returns: {
          admin_id: string | null
          created_at: string
          id: string
          note: string | null
          points: number
          reward_id: string
          status: string
          updated_at: string
          user_id: string
          voucher_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "redemptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_grant_credits: {
        Args: { p_credits: number; p_reason: string; p_user: string }
        Returns: number
      }
      admin_identity_queue: {
        Args: never
        Returns: {
          birth_year: number
          display_name: string
          document_path: string
          first_name: string
          last_name: string
          submitted_at: string
          user_id: string
          username: string
        }[]
      }
      admin_member_details: {
        Args: never
        Returns: {
          date_of_birth: string
          first_name: string
          last_name: string
          phone: string
          province: string
          user_id: string
        }[]
      }
      admin_practice_draw_entries: {
        Args: never
        Returns: {
          email: string
          entered_at: string
          founding_number: number
          phone: string
          practice_picks: number
          user_id: string
          username: string
        }[]
      }
      admin_practice_draw_run: {
        Args: { p_note?: string; p_witness: string }
        Returns: {
          draw_group_id: string
          drawn_at: string
          entries: number
          winner_email: string
          winner_founding_number: number
          winner_phone: string
          winner_rank: number
          winner_user_id: string
          winner_username: string
        }[]
      }
      admin_quest_review: {
        Args: {
          p_approve: boolean
          p_code: string
          p_note?: string
          p_user: string
        }
        Returns: number
      }
      admin_referral_review: {
        Args: never
        Returns: {
          burst: boolean
          created_at: string
          id: string
          referred: string
          referrer: string
          status: string
          vests_at: string
        }[]
      }
      admin_reverse_referral: {
        Args: { p_reason: string; p_referral: string }
        Returns: undefined
      }
      admin_review_identity: {
        Args: { p_approve: boolean; p_reason?: string; p_user: string }
        Returns: string
      }
      admin_set_odds_check: {
        Args: { p_prediction: string; p_reason: string; p_unverified: boolean }
        Returns: {
          admin_id: string | null
          odds_unverified: boolean
          prediction_id: string
          reason: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "prediction_odds_overrides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_tipster_status: {
        Args: { p_reason: string; p_status: string; p_user: string }
        Returns: undefined
      }
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
      admin_team_follow_stats: { Args: never; Returns: Json }
      admin_tipster_overview: { Args: never; Returns: Json }
      affiliate_ad_stats: {
        Args: { p_days?: number }
        Returns: {
          clicks: number
          creative_id: string
          dismissals: number
          impressions: number
          partner_id: string
          placement: string
        }[]
      }
      annual_pass_expired_recipients: {
        Args: { p_grace?: string }
        Returns: {
          campaign: string
          hold_expires_at: string
          recipient_email: string
          recipient_name: string
          user_id: string
        }[]
      }
      annual_pass_link_offline: {
        Args: { p_payment: string; p_user: string }
        Returns: string
      }
      annual_pass_offer: { Args: never; Returns: Json }
      annual_pass_record_offline: {
        Args: {
          p_amount_cents: number
          p_note: string
          p_paid_on: string
          p_payer: string
          p_recorded_by: string
          p_reference: string
        }
        Returns: string
      }
      annual_pass_reminder_recipients: {
        Args: { p_within?: string }
        Returns: {
          campaign: string
          hold_expires_at: string
          recipient_email: string
          recipient_name: string
          user_id: string
        }[]
      }
      annual_pass_taken: { Args: never; Returns: number }
      anonymise_account: {
        Args: { p_email: string; p_user: string }
        Returns: undefined
      }
      api_budget_claim:
        | { Args: { p_provider: string; p_units?: number }; Returns: boolean }
        | {
            Args: { p_feature: string; p_provider: string; p_units: number }
            Returns: boolean
          }
      api_budget_claim_context: {
        Args: {
          p_attempt_id: string
          p_competition: string
          p_feature: string
          p_job_run_id: string
          p_metadata?: Json
          p_provider: string
          p_units: number
        }
        Returns: Json
      }
      api_call_event_result: {
        Args: {
          p_attempt_id: string
          p_metadata?: Json
          p_reason_code?: string
          p_status: string
        }
        Returns: boolean
      }
      api_family_spend_usd: { Args: { p_family: string }; Returns: number }
      api_provider_family: { Args: { p_provider: string }; Returns: string }
      api_quota_claim: {
        Args: { p_provider: string; p_units?: number }
        Returns: boolean
      }
      api_quota_error: { Args: { p_provider: string }; Returns: undefined }
      api_quota_status: {
        Args: never
        Returns: {
          daily_cap: number
          errors_today: number
          month: number
          monthly_cap: number
          provider: string
          refused_today: number
          today: number
        }[]
      }
      api_spend_period_status: {
        Args: never
        Returns: {
          family: string
          limit_usd: number
          period_end: string
          period_start: string
          remaining_usd: number
          spent_usd: number
        }[]
      }
      api_spend_status: {
        Args: never
        Returns: {
          family: string
          monthly_usd: number
          remaining_usd: number
          spent_usd: number
        }[]
      }
      apply_auto_settlements: { Args: { p_rows: Json }; Returns: number }
      apply_result_to_standings: {
        Args: { p_fixture: string }
        Returns: string
      }
      award_points: {
        Args: {
          p_points?: number
          p_ref: string
          p_rule: string
          p_user: string
        }
        Returns: number
      }
      can_post: { Args: { p_user: string }; Returns: boolean }
      claim_ai_community_run: {
        Args: { p_activity_date: string }
        Returns: boolean
      }
      claim_annual_pass: { Args: never; Returns: Json }
      claim_reserved_founding: { Args: { p_user: string }; Returns: number }
      community_can_post: { Args: never; Returns: boolean }
      competition_board: {
        Args: { p_competition: string; p_period: string }
        Returns: {
          accuracy: number
          avatar_url: string
          correct: number
          points: number
          rank: number
          settled: number
          user_id: string
          username: string
        }[]
      }
      competition_leaderboard: {
        Args: {
          p_competition?: string
          p_limit?: number
          p_offset?: number
          p_period?: string
        }
        Returns: {
          accuracy: number
          avatar_url: string
          correct: number
          points: number
          rank: number
          settled: number
          username: string
        }[]
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
      confirm_annual_pass_payment: {
        Args: { p_amount_cents: number; p_reference: string; p_user: string }
        Returns: Json
      }
      content_article_sources: {
        Args: { p_slug: string }
        Returns: {
          domain: string
          ordinal: number
          title: string
          url: string
        }[]
      }
      content_claim_job: {
        Args: {
          p_force: boolean
          p_job_key: string
          p_kind: string
          p_trigger: string
        }
        Returns: {
          attempt: number
          id: string
        }[]
      }
      content_count_usage: {
        Args: { p_error: boolean; p_provider: string }
        Returns: undefined
      }
      create_ai_open_duel: {
        Args: {
          p_fixture_id: string
          p_message?: string
          p_persona_key: string
          p_picks: Json
        }
        Returns: string
      }
      create_duel: {
        Args: {
          p_fixture: string
          p_message?: string
          p_opponent: string
          p_picks: Json
          p_stake: number
        }
        Returns: string
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
          odds_unverified: boolean
          prev_hash: string
          reasoning: string | null
          reference_odds: number | null
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
      credit_balance: { Args: { p_user: string }; Returns: number }
      duel_check_picks: { Args: { p_picks: Json }; Returns: string[] }
      duel_check_stake: {
        Args: { p_stake: number; p_user: string }
        Returns: undefined
      }
      duel_config: { Args: never; Returns: Json }
      duel_detail: { Args: { p_duel: string }; Returns: Json }
      duel_leaderboard: {
        Args: { p_days?: number; p_limit?: number }
        Returns: {
          draws: number
          founding_number: number
          is_ai_participant: boolean
          losses: number
          played: number
          points_won: number
          username: string
          wins: number
          xp: number
        }[]
      }
      duel_notify: {
        Args: {
          p_message: string
          p_title: string
          p_url: string
          p_user: string
        }
        Returns: undefined
      }
      duel_refund: {
        Args: {
          p_duel: Database["public"]["Tables"]["duels"]["Row"]
          p_reason: string
          p_user: string
        }
        Returns: undefined
      }
      duel_vote_totals: { Args: { p_duel: string }; Returns: Json }
      duels_feed: {
        Args: { p_fixture?: string; p_limit?: number; p_scope: string }
        Returns: Json
      }
      duels_to_settle: {
        Args: never
        Returns: {
          away_score: number
          duel_id: string
          fixture_status: string
          home_score: number
          market: string
          selection: string
          user_id: string
        }[]
      }
      email_outbox_claim: {
        Args: { p_limit: number }
        Returns: {
          attempts: number
          body: string
          claimed_at: string | null
          created_at: string
          created_by: string | null
          event_key: string | null
          id: string
          kind: string
          last_error: string | null
          not_before: string
          priority: number
          sent_at: string | null
          status: string
          subject: string
          to_email: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "email_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      email_outbox_release: { Args: { p_ids: string[] }; Returns: number }
      end_lapsed_pro: { Args: never; Returns: number }
      expire_duels: { Args: never; Returns: number }
      export_my_data: { Args: never; Returns: Json }
      export_my_pfie_learning_data: { Args: never; Returns: Json }
      founding_campaign_recipients: {
        Args: { p_campaign: string }
        Returns: {
          is_member: boolean
          recipient_email: string
          recipient_name: string
        }[]
      }
      founding_spots_held: { Args: never; Returns: number }
      founding_spots_taken: { Args: never; Returns: number }
      founding_welcome_recipients: {
        Args: never
        Returns: {
          recipient_email: string
          recipient_name: string
        }[]
      }
      grant_annual_pass_pro: { Args: { p_user: string }; Returns: undefined }
      grant_credit_purchase: {
        Args: {
          p_amount_cents: number
          p_order: string
          p_pf_payment_id: string
        }
        Returns: string
      }
      grant_pro_payment: {
        Args: {
          p_amount_cents: number
          p_pf_payment_id: string
          p_sub: string
          p_token: string
        }
        Returns: string
      }
      grant_staff_admin: { Args: { p_user: string }; Returns: boolean }
      has_entitlement: {
        Args: { p_entitlement: string; p_user: string }
        Returns: boolean
      }
      identity_expired_documents: {
        Args: never
        Returns: {
          document_path: string
          user_id: string
        }[]
      }
      insert_team_results: { Args: { p_rows: Json }; Returns: number }
      invoke_cron:
        | { Args: { p_path: string }; Returns: undefined }
        | { Args: { p_path: string; p_timeout_ms: number }; Returns: undefined }
      is_ad_free: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_founding_member: { Args: never; Returns: boolean }
      is_staff_email: { Args: { p_email: string }; Returns: boolean }
      launch_at: { Args: never; Returns: string }
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
      launch_recipients: {
        Args: { p_wave: number }
        Returns: {
          recipient_email: string
          recipient_name: string
        }[]
      }
      list_rewards: {
        Args: never
        Returns: {
          code: string
          description: string
          id: string
          in_stock: boolean
          kind: string
          points_cost: number
          sponsor: string
          title: string
        }[]
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_detail: Json
          p_target: string
          p_target_user: string
        }
        Returns: undefined
      }
      log_campaign_event: {
        Args: {
          p_detail?: string
          p_event: string
          p_path?: string
          p_utm_campaign?: string
          p_utm_content?: string
          p_utm_medium?: string
          p_utm_source?: string
          p_utm_term?: string
          p_visitor: string
        }
        Returns: undefined
      }
      member_can_transact: {
        Args: { p: Database["public"]["Tables"]["profiles"]["Row"] }
        Returns: string
      }
      member_may_redeem: { Args: { p_user: string }; Returns: boolean }
      mfa_ok: { Args: never; Returns: boolean }
      mvp_open: { Args: never; Returns: boolean }
      mvp_status: { Args: never; Returns: Json }
      my_account_state: { Args: never; Returns: Json }
      my_competition_rank: {
        Args: { p_competition?: string; p_period?: string }
        Returns: {
          accuracy: number
          avatar_url: string
          correct: number
          points: number
          rank: number
          settled: number
          username: string
        }[]
      }
      my_puntpoints: { Args: never; Returns: number }
      my_referral_counts: {
        Args: never
        Returns: {
          joined: number
          signed_up: number
        }[]
      }
      my_referral_overview: {
        Args: never
        Returns: {
          next_threshold: number
          next_title: string
          pending: number
          qualified: number
          reversed: number
          signed_up: number
          vested: number
        }[]
      }
      my_tipster_support: { Args: never; Returns: Json }
      my_wallet: { Args: never; Returns: Json }
      my_wallet_history: {
        Args: { p_before?: string; p_limit?: number }
        Returns: {
          amount: number
          at: string
          currency: string
          description: string
          kind: string
        }[]
      }
      next_founding_number: { Args: never; Returns: number }
      odds_unverified_threshold: { Args: never; Returns: number }
      payments_enabled: { Args: never; Returns: boolean }
      pending_result_fixtures: {
        Args: never
        Returns: {
          away: string
          fixture_id: string
          home: string
          kickoff_at: string
          pending: number
          status: string
        }[]
      }
      pending_settlement_result_fixtures: {
        Args: never
        Returns: {
          away: string
          competition: string
          fixture_id: string
          home: string
          kickoff_at: string
          pending: number
          provider: string
          provider_ref: string
        }[]
      }
      pending_settlements: {
        Args: never
        Returns: {
          away_score: number
          home_score: number
          line: number
          market: string
          odds: number
          prediction_id: string
          selection: string
          sport: string
          status: string
        }[]
      }
      pfie_prune_learning_subject_maps: { Args: never; Returns: number }
      point_rules_public: {
        Args: never
        Returns: {
          cap_per_day: number
          cap_per_month: number
          code: string
          points: number
          title: string
        }[]
      }
      practice_award: {
        Args: { p_ref: string; p_rule: string; p_user: string }
        Returns: number
      }
      practice_balance: { Args: never; Returns: number }
      practice_can_access: { Args: never; Returns: boolean }
      practice_crowd: {
        Args: { p_season: string }
        Returns: {
          away: number
          draw: number
          fixture_id: string
          home: number
        }[]
      }
      practice_demo_wallet: { Args: never; Returns: Json }
      practice_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          graduate: boolean
          is_me: boolean
          points: number
          rank: number
          settled: number
          units: number
          username: string
          won: number
        }[]
      }
      practice_post_pick: {
        Args: {
          p_confidence: number
          p_fixture: string
          p_market: string
          p_selection: string
        }
        Returns: {
          confidence: number
          created_at: string
          fixture_id: string
          id: string
          market: string
          odds: number
          result: string | null
          selection: string
          settled_at: string | null
          units: number | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "practice_predictions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      practice_redeem_demo: {
        Args: { p_reward: string }
        Returns: {
          created_at: string
          demo_code: string
          id: string
          points: number
          reward_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "practice_redemptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      practice_spend_credits: {
        Args: { p_feature: string; p_ref: string }
        Returns: Json
      }
      practice_status: {
        Args: never
        Returns: {
          enabled: boolean
          is_founding: boolean
        }[]
      }
      pro_cap: { Args: { p_user: string }; Returns: number }
      process_tipster_periods: { Args: { p_limit?: number }; Returns: number }
      provision_ai_community_member: {
        Args: {
          p_display_name: string
          p_persona_key: string
          p_user_id: string
          p_username: string
        }
        Returns: number
      }
      publish_ai_community_post: {
        Args: {
          p_activity_date: string
          p_activity_type: string
          p_body: string
          p_category: string
          p_parent_id?: string
          p_persona_key: string
          p_target_post_id?: string
          p_title: string
        }
        Returns: string
      }
      publish_slip: {
        Args: { p_confidence?: number; p_slip: string }
        Returns: Json
      }
      punt_ai_claim: {
        Args: { p_cache_key: string; p_mode: string; p_user: string }
        Returns: string
      }
      puntpoints_balance: { Args: { p_user: string }; Returns: number }
      puntpoints_transferable: { Args: { p_user: string }; Returns: number }
      purge_old_campaign_events: { Args: never; Returns: undefined }
      quest_auto_done: {
        Args: { p_code: string; p_user: string }
        Returns: boolean
      }
      quest_award: {
        Args: { p_code: string; p_reviewer?: string; p_user: string }
        Returns: number
      }
      quest_claim_device: { Args: { p_code: string }; Returns: number }
      quest_consent: {
        Args: { p_purpose: string; p_user: string }
        Returns: boolean
      }
      quest_evidence_purge: { Args: never; Returns: number }
      quest_member_ok: { Args: { p_user: string }; Returns: boolean }
      quest_start: { Args: { p_code: string }; Returns: undefined }
      quest_submit: {
        Args: { p_code: string; p_evidence: string }
        Returns: string
      }
      quests_sync: { Args: never; Returns: number }
      record_ad_event: {
        Args: {
          p_creative: string
          p_kind: string
          p_partner: string
          p_placement: string
        }
        Returns: undefined
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
      record_sync: {
        Args: {
          p_error: string
          p_job: string
          p_meta: Json
          p_ok: boolean
          p_scope: string
        }
        Returns: undefined
      }
      redeem_reward: {
        Args: { p_reward: string }
        Returns: {
          admin_id: string | null
          created_at: string
          id: string
          note: string | null
          points: number
          reward_id: string
          status: string
          updated_at: string
          user_id: string
          voucher_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "redemptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reference_odds: {
        Args: { p_fixture_ids: string[] }
        Returns: {
          captured_at: string
          fixture_id: string
          market: string
          price: number
          selection: string
        }[]
      }
      replace_standings: {
        Args: {
          p_competition: string
          p_key: string
          p_rows: Json
          p_season: string
          p_source_domain: string
          p_source_url: string
        }
        Returns: number
      }
      reserve_synthetic_budget: {
        Args: {
          p_estimated_usd: number
          p_experiment_id: string
          p_operation: string
          p_provider: string
          p_request_key: string
        }
        Returns: boolean
      }
      revert_puntpoints_reward_cost_promo: { Args: never; Returns: number }
      reward_setting: { Args: { p_key: string }; Returns: boolean }
      rewards_catalogue: {
        Args: never
        Returns: {
          available: boolean
          available_from: string
          category: string
          code: string
          description: string
          face_value_cents: number
          fulfilment: string
          funded_by: string
          id: string
          in_stock: boolean
          kind: string
          points_cost: number
          sponsor: string
          sponsor_url: string
          terms: string
          title: string
        }[]
      }
      rewards_status: {
        Args: never
        Returns: {
          points_enabled: boolean
          rewards_enabled: boolean
        }[]
      }
      season_result_counts: {
        Args: never
        Returns: {
          competition: string
          results: number
        }[]
      }
      seed_ai_open_duels: { Args: { p_target?: number }; Returns: number }
      set_pro_subscription_status: {
        Args: { p_status: string; p_sub: string }
        Returns: string
      }
      set_team_follow: {
        Args: {
          p_follow: boolean
          p_source?: string
          p_sport: string
          p_team_key: string
          p_team_name: string
        }
        Returns: boolean
      }
      set_tipster_support: {
        Args: { p_on: boolean; p_subscription: string }
        Returns: string
      }
      setting_bool: {
        Args: { p_default: boolean; p_key: string }
        Returns: boolean
      }
      setting_int: {
        Args: { p_default: number; p_key: string }
        Returns: number
      }
      settle_duel: {
        Args: { p_duel: string; p_results: Json; p_void: boolean }
        Returns: string
      }
      settle_synthetic_budget: {
        Args: {
          p_failed?: boolean
          p_provider_request_id?: string
          p_request_key: string
          p_settled_usd?: number
        }
        Returns: boolean
      }
      slip_detail: { Args: { p_slip: string }; Returns: Json }
      slips_feed: { Args: { p_limit?: number; p_scope: string }; Returns: Json }
      spend_credits: {
        Args: { p_feature: string; p_ref: string }
        Returns: Json
      }
      submit_identity_document: { Args: { p_path: string }; Returns: Json }
      submit_privacy_request: {
        Args: { p_details: string; p_email: string; p_kind: string }
        Returns: string
      }
      support_tipster: {
        Args: { p_auto_renew?: boolean; p_plan: string; p_username: string }
        Returns: string
      }
      sync_my_points: { Args: never; Returns: number }
      team_follower_counts: {
        Args: { p_sport?: string }
        Returns: {
          followers: number
          team_key: string
        }[]
      }
      tipster_check_hold: {
        Args: { p_amount: number; p_user: string }
        Returns: undefined
      }
      tipster_check_unlock: { Args: { p_user: string }; Returns: string }
      tipster_fee_for: {
        Args: { p_amount: number; p_tipster: string }
        Returns: number
      }
      tipster_is_verified: { Args: { p_user: string }; Returns: boolean }
      tipster_notify: {
        Args: {
          p_message: string
          p_title: string
          p_url: string
          p_user: string
        }
        Returns: undefined
      }
      tipster_plan_interval: { Args: { p_plan: string }; Returns: string }
      tipster_resolve_charge: {
        Args: { p_charge: string; p_pay: boolean; p_reason: string }
        Returns: undefined
      }
      tipster_setting_numeric: {
        Args: { p_default: number; p_key: string }
        Returns: number
      }
      tipster_spent_30d: { Args: { p_user: string }; Returns: number }
      tipster_streak: { Args: { p_user: string }; Returns: Json }
      tipster_support_card: { Args: { p_username: string }; Returns: Json }
      top_supported_tipsters: { Args: { p_limit?: number }; Returns: Json }
      transfer_puntpoints: {
        Args: { p_note?: string; p_points: number; p_to_username: string }
        Returns: Json
      }
      update_my_username: { Args: { p_username: string }; Returns: string }
      update_tipster_settings: {
        Args: {
          p_accepting: boolean
          p_pitch: string
          p_price_month: number
          p_price_pick: number
          p_price_week: number
        }
        Returns: Json
      }
      username_available: { Args: { p_username: string }; Returns: boolean }
      vest_referrals: { Args: never; Returns: number }
      vote_duel: { Args: { p_duel: string; p_side: string }; Returns: Json }
      withdraw_duel: { Args: { p_duel: string }; Returns: string }
      write_chain_head: {
        Args: { p_day: string }
        Returns: {
          head_day: string
          head_hash: string
          head_pick_count: number
        }[]
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
