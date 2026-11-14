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
            foreignKeyName: "account_warnings_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_user_fkey"
            columns: ["target_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_target_user_fkey"
            columns: ["target_user"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "admin_notifications_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "affiliate_partner_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "affiliate_partners_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "chain_heads_last_prediction_id_fkey"
            columns: ["last_prediction_id"]
            isOneToOne: false
            referencedRelation: "visible_predictions"
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
            foreignKeyName: "competition_score_ledger_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "visible_predictions"
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
          {
            foreignKeyName: "competition_score_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "content_project_updates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "content_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "credit_ledger_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "email_outbox_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_outbox_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
        Relationships: []
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
          {
            foreignKeyName: "member_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
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
            foreignKeyName: "newsroom_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "practice_credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_draw_log: {
        Row: {
          drawn_at: string
          drawn_by: string | null
          entries: number
          id: string
          note: string | null
          winner_founding_number: number | null
          winner_user_id: string | null
          witness: string
        }
        Insert: {
          drawn_at?: string
          drawn_by?: string | null
          entries: number
          id?: string
          note?: string | null
          winner_founding_number?: number | null
          winner_user_id?: string | null
          witness: string
        }
        Update: {
          drawn_at?: string
          drawn_by?: string | null
          entries?: number
          id?: string
          note?: string | null
          winner_founding_number?: number | null
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
            foreignKeyName: "practice_draw_log_drawn_by_fkey"
            columns: ["drawn_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_draw_log_winner_user_id_fkey"
            columns: ["winner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_draw_log_winner_user_id_fkey"
            columns: ["winner_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "practice_points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "practice_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "practice_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          account_type: string
          avatar_url: string | null
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
          suspended_until: string | null
          suspension_reason: string | null
          username: string
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
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
          suspended_until?: string | null
          suspension_reason?: string | null
          username: string
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
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
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "puntpoints_ledger_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puntpoints_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puntpoints_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "puntpoints_transfers_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puntpoints_transfers_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puntpoints_transfers_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "quest_progress_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "redemptions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
            foreignKeyName: "referral_rewards_qualifying_prediction_id_fkey"
            columns: ["qualifying_prediction_id"]
            isOneToOne: false
            referencedRelation: "visible_predictions"
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
            foreignKeyName: "referral_rewards_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referrer_id_fkey"
            columns: ["referrer_id"]
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
          {
            foreignKeyName: "reward_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "scoring_rules_updated_by_fkey"
            columns: ["updated_by"]
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
          {
            foreignKeyName: "survey_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
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
          verified_at?: string | null
        }
        Relationships: []
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
            foreignKeyName: "user_entitlements_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          founding_number: number | null
          id: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          founding_number?: number | null
          id?: string | null
          username?: never
        }
        Update: {
          avatar_url?: string | null
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
      accept_duel: { Args: { p_duel: string; p_picks: Json }; Returns: Json }
      create_duel: {
        Args: {
          p_fixture: string
          p_message?: string
          p_opponent: string | null
          p_picks: Json
          p_stake: number
        }
        Returns: string
      }
      duel_config: { Args: never; Returns: Json }
      duel_detail: { Args: { p_duel: string }; Returns: Json }
      duel_leaderboard: {
        Args: { p_days?: number | null; p_limit?: number }
        Returns: {
          draws: number
          founding_number: number | null
          losses: number
          played: number
          points_won: number
          username: string
          wins: number
          xp: number
        }[]
      }
      duel_vote_totals: { Args: { p_duel: string }; Returns: Json }
      duels_feed: {
        Args: { p_fixture?: string | null; p_limit?: number; p_scope: string }
        Returns: Json
      }
      duels_to_settle: {
        Args: never
        Returns: {
          away_score: number | null
          duel_id: string
          fixture_status: string
          home_score: number | null
          market: string
          selection: string
          user_id: string
        }[]
      }
      expire_duels: { Args: never; Returns: number }
      settle_duel: {
        Args: { p_duel: string; p_results: Json; p_void: boolean }
        Returns: string
      }
      vote_duel: { Args: { p_duel: string; p_side: string }; Returns: Json }
      withdraw_duel: { Args: { p_duel: string }; Returns: string }
      acknowledge_warnings: { Args: never; Returns: number }
      admin_adjust_points: {
        Args: { p_points: number; p_reason: string; p_user: string }
        Returns: number
      }
      admin_analytics: { Args: { p_days?: number }; Returns: Json }
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
          drawn_at: string
          entries: number
          winner_email: string
          winner_founding_number: number
          winner_phone: string
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
      apply_auto_settlements: { Args: { p_rows: Json }; Returns: number }
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
      claim_annual_pass: { Args: never; Returns: Json }
      claim_reserved_founding: { Args: { p_user: string }; Returns: number }
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
      credit_balance: { Args: { p_user: string }; Returns: number }
      email_outbox_claim: {
        Args: { p_limit: number }
        Returns: {
          attempts: number
          body: string
          claimed_at: string | null
          created_at: string
          created_by: string | null
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
      export_my_data: { Args: never; Returns: Json }
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
      invoke_cron: { Args: { p_path: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_founding_member: { Args: never; Returns: boolean }
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
      record_consent: {
        Args: {
          p_granted: boolean
          p_notice_version: string
          p_purpose: string
          p_source: string
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
      setting_int: {
        Args: { p_default: number; p_key: string }
        Returns: number
      }
      spend_credits: {
        Args: { p_feature: string; p_ref: string }
        Returns: Json
      }
      submit_identity_document: { Args: { p_path: string }; Returns: Json }
      submit_privacy_request: {
        Args: { p_details: string; p_email: string; p_kind: string }
        Returns: string
      }
      sync_my_points: { Args: never; Returns: number }
      transfer_puntpoints: {
        Args: { p_note?: string; p_points: number; p_to_username: string }
        Returns: Json
      }
      username_available: { Args: { p_username: string }; Returns: boolean }
      vest_referrals: { Args: never; Returns: number }
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
