// ============================================================================
// HumenAI Phase 2 — Supabase Database Types
// Auto-generated from supabase/migrations/001_phase2_schema.sql
// To regenerate: supabase gen types typescript --linked > src/lib/supabase/database.types.ts
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: "standard" | "intermediate" | "premium";
          settings: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          plan?: "standard" | "intermediate" | "premium";
          settings?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          plan?: "standard" | "intermediate" | "premium";
          settings?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          tenant_id: string;
          email: string;
          name: string;
          role: "admin" | "agent" | "readonly";
          password_hash: string | null;
          avatar_url: string | null;
          is_active: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          email: string;
          name: string;
          role?: "admin" | "agent" | "readonly";
          password_hash?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          email?: string;
          name?: string;
          role?: "admin" | "agent" | "readonly";
          password_hash?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      tenant_settings: {
        Row: {
          id: string;
          tenant_id: string;
          chatbot_name: string;
          welcome_message: string;
          offline_message: string;
          tone: string;
          primary_language: string;
          fallback_language: string;
          supported_languages: string[];
          allow_emojis: boolean;
          preferred_response_length: string;
          timezone: string;
          business_hours: Json;
          logo_url: string | null;
          icon_url: string | null;
          primary_color: string;
          secondary_color: string;
          font_family: string;
          ai_temperature: number;
          ai_max_tokens: number;
          ai_model: string;
          max_conversation_history: number;
          human_handoff_enabled: boolean;
          sentiment_analysis: boolean;
          lead_capture_enabled: boolean;
          lead_email_required: boolean;
          lead_phone_required: boolean;
          notification_email: string | null;
          notification_webhook_url: string | null;
          notification_on_new_conversation: boolean;
          notification_on_human_request: boolean;
          notification_on_escalation: boolean;
          features_enabled: Json;
          max_file_size_mb: number;
          allowed_file_types: string[];
          analytics_retention_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          chatbot_name?: string;
          welcome_message?: string;
          offline_message?: string;
          tone?: string;
          primary_language?: string;
          fallback_language?: string;
          supported_languages?: string[];
          allow_emojis?: boolean;
          preferred_response_length?: string;
          timezone?: string;
          business_hours?: Json;
          logo_url?: string | null;
          icon_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          font_family?: string;
          ai_temperature?: number;
          ai_max_tokens?: number;
          ai_model?: string;
          max_conversation_history?: number;
          human_handoff_enabled?: boolean;
          sentiment_analysis?: boolean;
          lead_capture_enabled?: boolean;
          lead_email_required?: boolean;
          lead_phone_required?: boolean;
          notification_email?: string | null;
          notification_webhook_url?: string | null;
          notification_on_new_conversation?: boolean;
          notification_on_human_request?: boolean;
          notification_on_escalation?: boolean;
          features_enabled?: Json;
          max_file_size_mb?: number;
          allowed_file_types?: string[];
          analytics_retention_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          chatbot_name?: string;
          welcome_message?: string;
          offline_message?: string;
          tone?: string;
          primary_language?: string;
          fallback_language?: string;
          supported_languages?: string[];
          allow_emojis?: boolean;
          preferred_response_length?: string;
          timezone?: string;
          business_hours?: Json;
          logo_url?: string | null;
          icon_url?: string | null;
          primary_color?: string;
          secondary_color?: string;
          font_family?: string;
          ai_temperature?: number;
          ai_max_tokens?: number;
          ai_model?: string;
          max_conversation_history?: number;
          human_handoff_enabled?: boolean;
          sentiment_analysis?: boolean;
          lead_capture_enabled?: boolean;
          lead_email_required?: boolean;
          lead_phone_required?: boolean;
          notification_email?: string | null;
          notification_webhook_url?: string | null;
          notification_on_new_conversation?: boolean;
          notification_on_human_request?: boolean;
          notification_on_escalation?: boolean;
          features_enabled?: Json;
          max_file_size_mb?: number;
          allowed_file_types?: string[];
          analytics_retention_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      channels: {
        Row: {
          id: string;
          tenant_id: string;
          type: Database["public"]["Enums"]["channel_type"];
          enabled: boolean;
          credentials: Json;
          settings: Json;
          status: Database["public"]["Enums"]["channel_status"];
          last_sync_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          type: Database["public"]["Enums"]["channel_type"];
          enabled?: boolean;
          credentials?: Json;
          settings?: Json;
          status?: Database["public"]["Enums"]["channel_status"];
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          type?: Database["public"]["Enums"]["channel_type"];
          enabled?: boolean;
          credentials?: Json;
          settings?: Json;
          status?: Database["public"]["Enums"]["channel_status"];
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "channels_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      documents: {
        Row: {
          id: string;
          tenant_id: string;
          document_group_id: string | null;
          parent_document_id: string | null;
          title: string;
          content: string;
          chunk_index: number;
          total_chunks: number;
          embedding: number[] | null;
          source_url: string | null;
          source_type: string;
          version: number;
          active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          document_group_id?: string | null;
          parent_document_id?: string | null;
          title: string;
          content: string;
          chunk_index?: number;
          total_chunks?: number;
          embedding?: number[] | null;
          source_url?: string | null;
          source_type?: string;
          version?: number;
          active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          document_group_id?: string | null;
          parent_document_id?: string | null;
          title?: string;
          content?: string;
          chunk_index?: number;
          total_chunks?: number;
          embedding?: number[] | null;
          source_url?: string | null;
          source_type?: string;
          version?: number;
          active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_parent_document_id_fkey";
            columns: ["parent_document_id"];
            referencedRelation: "documents";
            referencedColumns: ["id"];
          }
        ];
      };
      media_assets: {
        Row: {
          id: string;
          tenant_id: string;
          uploaded_by: string | null;
          public_id: string;
          url: string;
          secure_url: string;
          asset_type: Database["public"]["Enums"]["media_asset_type"];
          format: string;
          bytes: number;
          width: number | null;
          height: number | null;
          duration: number | null;
          alt_text: string | null;
          tags: string[];
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          uploaded_by?: string | null;
          public_id: string;
          url: string;
          secure_url: string;
          asset_type: Database["public"]["Enums"]["media_asset_type"];
          format: string;
          bytes: number;
          width?: number | null;
          height?: number | null;
          duration?: number | null;
          alt_text?: string | null;
          tags?: string[];
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          uploaded_by?: string | null;
          public_id?: string;
          url?: string;
          secure_url?: string;
          asset_type?: Database["public"]["Enums"]["media_asset_type"];
          format?: string;
          bytes?: number;
          width?: number | null;
          height?: number | null;
          duration?: number | null;
          alt_text?: string | null;
          tags?: string[];
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_assets_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_assets_uploaded_by_fkey";
            columns: ["uploaded_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      team_members: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: "admin" | "agent" | "readonly";
          invited_by: string | null;
          status: "pending" | "accepted" | "declined" | "revoked";
          permissions: Json;
          invited_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role?: "admin" | "agent" | "readonly";
          invited_by?: string | null;
          status?: "pending" | "accepted" | "declined" | "revoked";
          permissions?: Json;
          invited_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          role?: "admin" | "agent" | "readonly";
          invited_by?: string | null;
          status?: "pending" | "accepted" | "declined" | "revoked";
          permissions?: Json;
          invited_at?: string;
          accepted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_invited_by_fkey";
            columns: ["invited_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      conversations: {
        Row: {
          id: string;
          tenant_id: string;
          channel_id: string;
          channel_type: string;
          customer_id: string;
          customer_name: string | null;
          customer_email: string | null;
          customer_phone: string | null;
          status: Database["public"]["Enums"]["conversation_status"];
          assigned_to: string | null;
          metadata: Json;
          last_message_at: string;
          message_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          channel_id: string;
          channel_type: string;
          customer_id: string;
          customer_name?: string | null;
          customer_email?: string | null;
          customer_phone?: string | null;
          status?: Database["public"]["Enums"]["conversation_status"];
          assigned_to?: string | null;
          metadata?: Json;
          last_message_at?: string;
          message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          channel_id?: string;
          channel_type?: string;
          customer_id?: string;
          customer_name?: string | null;
          customer_email?: string | null;
          customer_phone?: string | null;
          status?: Database["public"]["Enums"]["conversation_status"];
          assigned_to?: string | null;
          metadata?: Json;
          last_message_at?: string;
          message_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_channel_id_fkey";
            columns: ["channel_id"];
            referencedRelation: "channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_assigned_to_fkey";
            columns: ["assigned_to"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender: Database["public"]["Enums"]["message_sender"];
          format: Database["public"]["Enums"]["message_format"];
          content: string;
          agent_id: string | null;
          media_asset_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender: Database["public"]["Enums"]["message_sender"];
          format?: Database["public"]["Enums"]["message_format"];
          content: string;
          agent_id?: string | null;
          media_asset_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender?: Database["public"]["Enums"]["message_sender"];
          format?: Database["public"]["Enums"]["message_format"];
          content?: string;
          agent_id?: string | null;
          media_asset_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_agent_id_fkey";
            columns: ["agent_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_media_asset_id_fkey";
            columns: ["media_asset_id"];
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          }
        ];
      };
      analytics_events: {
        Row: {
          id: string;
          tenant_id: string;
          event_type: string;
          session_id: string | null;
          data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          event_type: string;
          session_id?: string | null;
          data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          event_type?: string;
          session_id?: string | null;
          data?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          details: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_tenant_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      is_tenant_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_tenant_agent: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      tenant_plan: "standard" | "intermediate" | "premium";
      user_role: "admin" | "agent" | "readonly";
      channel_type:
        | "whatsapp"
        | "instagram"
        | "messenger"
        | "tiktok"
        | "shopify"
        | "woocommerce"
        | "wix"
        | "prestashop"
        | "magento"
        | "web_widget"
        | "email";
      channel_status:
        | "active"
        | "inactive"
        | "error"
        | "pending"
        | "disconnected"
        | "rate_limited";
      conversation_status:
        | "active"
        | "waiting_human"
        | "with_human"
        | "closed";
      message_sender: "customer" | "bot" | "human_agent";
      message_format: "text" | "image" | "audio" | "document";
      media_asset_type: "image" | "video" | "audio";
      team_member_status: "pending" | "accepted" | "declined" | "revoked";
      audit_action: string;
    };
  };
};
