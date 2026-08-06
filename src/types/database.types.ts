/**
 * Database type definitions for Supabase
 * These types represent the structure of the database tables
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      early_access: {
        Row: {
          id: string;
          email: string;
          name: string;
          plan: string;
          created_at: string;
          status: string;
          referral_code: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          plan: string;
          created_at?: string;
          status?: string;
          referral_code?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          plan?: string;
          created_at?: string;
          status?: string;
          referral_code?: string | null;
        };
      };
    };
  };
}
