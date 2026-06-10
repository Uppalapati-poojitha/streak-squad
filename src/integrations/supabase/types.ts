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
      achievements: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          reward_credits: number
          reward_xp: number
          slug: string
          tier: string
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string
          id?: string
          name: string
          reward_credits?: number
          reward_xp?: number
          slug: string
          tier?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          reward_credits?: number
          reward_xp?: number
          slug?: string
          tier?: string
        }
        Relationships: []
      }
      bond_credits_ledger: {
        Row: {
          category: Database["public"]["Enums"]["habit_category"] | null
          check_in_id: string | null
          created_at: string
          delta: number
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["habit_category"] | null
          check_in_id?: string | null
          created_at?: string
          delta: number
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["habit_category"] | null
          check_in_id?: string | null
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          check_in_date: string
          created_at: string
          habit_id: string
          id: string
          photo_url: string | null
          score: number | null
          status: string
          submission: Json
          user_id: string
          verification: Json | null
          verified_at: string | null
        }
        Insert: {
          check_in_date?: string
          created_at?: string
          habit_id: string
          id?: string
          photo_url?: string | null
          score?: number | null
          status?: string
          submission?: Json
          user_id: string
          verification?: Json | null
          verified_at?: string | null
        }
        Update: {
          check_in_date?: string
          created_at?: string
          habit_id?: string
          id?: string
          photo_url?: string | null
          score?: number | null
          status?: string
          submission?: Json
          user_id?: string
          verification?: Json | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      club_feed_items: {
        Row: {
          club_id: string
          created_at: string
          id: string
          kind: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          user_id?: string | null
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_feed_items_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_missions: {
        Row: {
          category: Database["public"]["Enums"]["habit_category"] | null
          created_at: string
          description: string
          id: string
          kind: string
          mission_date: string
          reward_credits: number
          reward_xp: number
          target: number
          title: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["habit_category"] | null
          created_at?: string
          description: string
          id?: string
          kind: string
          mission_date: string
          reward_credits?: number
          reward_xp?: number
          target?: number
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["habit_category"] | null
          created_at?: string
          description?: string
          id?: string
          kind?: string
          mission_date?: string
          reward_credits?: number
          reward_xp?: number
          target?: number
          title?: string
        }
        Relationships: []
      }
      daily_reward_box: {
        Row: {
          claim_date: string
          claimed_at: string
          id: string
          reward: Json
          user_id: string
        }
        Insert: {
          claim_date: string
          claimed_at?: string
          id?: string
          reward: Json
          user_id: string
        }
        Update: {
          claim_date?: string
          claimed_at?: string
          id?: string
          reward?: Json
          user_id?: string
        }
        Relationships: []
      }
      feed_comments: {
        Row: {
          body: string
          created_at: string
          feed_item_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          feed_item_id: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          feed_item_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "club_feed_items"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_likes: {
        Row: {
          created_at: string
          feed_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feed_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          feed_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_likes_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "club_feed_items"
            referencedColumns: ["id"]
          },
        ]
      }
      global_messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      group_memberships: {
        Row: {
          group_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          group_id: string
          id: string
          kind: string
          payload: Json | null
          pinned: boolean
          reactions: Json
          reply_to_id: string | null
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          group_id: string
          id?: string
          kind?: string
          payload?: Json | null
          pinned?: boolean
          reactions?: Json
          reply_to_id?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          group_id?: string
          id?: string
          kind?: string
          payload?: Json | null
          pinned?: boolean
          reactions?: Json
          reply_to_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          category: Database["public"]["Enums"]["habit_category"] | null
          created_at: string
          id: string
          kind: string
          name: string
          slug: string
          threshold: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["habit_category"] | null
          created_at?: string
          id?: string
          kind?: string
          name: string
          slug: string
          threshold: number
        }
        Update: {
          category?: Database["public"]["Enums"]["habit_category"] | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          slug?: string
          threshold?: number
        }
        Relationships: []
      }
      habits: {
        Row: {
          category: string
          created_at: string
          id: string
          is_public: boolean
          owner_id: string
          target_days: number
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_public?: boolean
          owner_id: string
          target_days?: number
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_public?: boolean
          owner_id?: string
          target_days?: number
          title?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          read_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          username?: string | null
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          id: string
          payload: Json | null
          redeemed_at: string
          reward_id: string
          user_id: string
        }
        Insert: {
          id?: string
          payload?: Json | null
          redeemed_at?: string
          reward_id: string
          user_id: string
        }
        Update: {
          id?: string
          payload?: Json | null
          redeemed_at?: string
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          cost_credits: number
          created_at: string
          description: string
          id: string
          kind: string
          name: string
          slug: string
        }
        Insert: {
          cost_credits: number
          created_at?: string
          description: string
          id?: string
          kind?: string
          name: string
          slug: string
        }
        Update: {
          cost_credits?: number
          created_at?: string
          description?: string
          id?: string
          kind?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      shields: {
        Row: {
          category: Database["public"]["Enums"]["habit_category"]
          cost_credits: number
          created_at: string
          id: string
          kind: string
          missed_days_protected: number
          slug: string
          validity_days: number
        }
        Insert: {
          category: Database["public"]["Enums"]["habit_category"]
          cost_credits: number
          created_at?: string
          id?: string
          kind: string
          missed_days_protected: number
          slug: string
          validity_days: number
        }
        Update: {
          category?: Database["public"]["Enums"]["habit_category"]
          cost_credits?: number
          created_at?: string
          id?: string
          kind?: string
          missed_days_protected?: number
          slug?: string
          validity_days?: number
        }
        Relationships: []
      }
      streaks: {
        Row: {
          current_streak: number
          habit_id: string
          last_check_in: string | null
          longest_streak: number
          user_id: string
        }
        Insert: {
          current_streak?: number
          habit_id: string
          last_check_in?: string | null
          longest_streak?: number
          user_id: string
        }
        Update: {
          current_streak?: number
          habit_id?: string
          last_check_in?: string | null
          longest_streak?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_category_credits: {
        Row: {
          balance: number
          category: Database["public"]["Enums"]["habit_category"]
          lifetime: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          category: Database["public"]["Enums"]["habit_category"]
          lifetime?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          category?: Database["public"]["Enums"]["habit_category"]
          lifetime?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_mission_progress: {
        Row: {
          claimed_at: string | null
          completed_at: string | null
          id: string
          mission_id: string
          progress: number
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          completed_at?: string | null
          id?: string
          mission_id: string
          progress?: number
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          completed_at?: string | null
          id?: string
          mission_id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mission_progress_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "daily_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_resumes: {
        Row: {
          created_at: string
          id: string
          payload: Json
          template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          template?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_shields: {
        Row: {
          category: Database["public"]["Enums"]["habit_category"]
          expires_at: string
          id: string
          purchased_at: string
          shield_id: string
          status: string
          used_at: string | null
          used_for_date: string | null
          used_for_habit_id: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["habit_category"]
          expires_at: string
          id?: string
          purchased_at?: string
          shield_id: string
          status?: string
          used_at?: string | null
          used_for_date?: string | null
          used_for_habit_id?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["habit_category"]
          expires_at?: string
          id?: string
          purchased_at?: string
          shield_id?: string
          status?: string
          used_at?: string | null
          used_for_date?: string | null
          used_for_habit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_shields_shield_id_fkey"
            columns: ["shield_id"]
            isOneToOne: false
            referencedRelation: "shields"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          level: number
          lifetime_credits: number
          total_credits: number
          updated_at: string
          user_id: string
          verifications_failed: number
          verifications_passed: number
          xp: number
        }
        Insert: {
          level?: number
          lifetime_credits?: number
          total_credits?: number
          updated_at?: string
          user_id: string
          verifications_failed?: number
          verifications_passed?: number
          xp?: number
        }
        Update: {
          level?: number
          lifetime_credits?: number
          total_credits?: number
          updated_at?: string
          user_id?: string
          verifications_failed?: number
          verifications_passed?: number
          xp?: number
        }
        Relationships: []
      }
      weekly_champions: {
        Row: {
          club_id: string
          created_at: string
          id: string
          metric: string
          user_id: string
          value: number
          week_start: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          metric: string
          user_id: string
          value: number
          week_start: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          metric?: string
          user_id?: string
          value?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_champions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_daily_box: { Args: never; Returns: Json }
      complete_verification: {
        Args: { _answers: Json; _check_in_id: string }
        Returns: Json
      }
      expire_shields: { Args: never; Returns: number }
      purchase_shield: { Args: { _shield_id: string }; Returns: Json }
      redeem_reward: {
        Args: { _payload?: Json; _reward_id: string }
        Returns: Json
      }
      seed_today_missions: { Args: never; Returns: undefined }
      start_check_in: {
        Args: { _habit_id: string; _questions: Json; _submission: Json }
        Returns: string
      }
      use_shield: {
        Args: {
          _habit_id: string
          _missed_date: string
          _user_shield_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      habit_category:
        | "coding"
        | "reading"
        | "gym"
        | "running"
        | "meditation"
        | "fasting"
        | "custom"
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
      habit_category: [
        "coding",
        "reading",
        "gym",
        "running",
        "meditation",
        "fasting",
        "custom",
      ],
    },
  },
} as const
