export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  public: {
    Tables: {
      bingo_cards: {
        Row: {
          card_number: number;
          created_at: string | null;
          id: string;
          is_sold: boolean | null;
          numbers: Json;
          player_id: string | null;
          session_id: string | null;
        };
        Insert: {
          card_number: number;
          created_at?: string | null;
          id?: string;
          is_sold?: boolean | null;
          numbers: Json;
          player_id?: string | null;
          session_id?: string | null;
        };
        Update: {
          card_number?: number;
          created_at?: string | null;
          id?: string;
          is_sold?: boolean | null;
          numbers?: Json;
          player_id?: string | null;
          session_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bingo_cards_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bingo_cards_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'bingo_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      bingo_claims: {
        Row: {
          admin_notes: string | null;
          card_id: string;
          claimed_at: string | null;
          created_at: string | null;
          id: string;
          matched_pattern: Json | null;
          player_id: string;
          rejection_reason: string | null;
          room_id: string;
          session_id: string;
          status: string | null;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          card_id: string;
          claimed_at?: string | null;
          created_at?: string | null;
          id?: string;
          matched_pattern?: Json | null;
          player_id: string;
          rejection_reason?: string | null;
          room_id: string;
          session_id: string;
          status?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          card_id?: string;
          claimed_at?: string | null;
          created_at?: string | null;
          id?: string;
          matched_pattern?: Json | null;
          player_id?: string;
          rejection_reason?: string | null;
          room_id?: string;
          session_id?: string;
          status?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bingo_claims_card_id_fkey';
            columns: ['card_id'];
            isOneToOne: false;
            referencedRelation: 'bingo_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bingo_claims_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bingo_claims_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'bingo_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bingo_claims_verified_by_fkey';
            columns: ['verified_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      bingo_sessions: {
        Row: {
          card_price: number;
          created_at: string | null;
          created_by: string | null;
          custom_pattern: Json | null;
          date_time: string;
          description: string | null;
          id: string;
          max_cards_per_player: number;
          prize_amount: number | null;
          room_id: string | null;
          status: string | null;
          updated_at: string | null;
          winning_pattern: string;
        };
        Insert: {
          card_price: number;
          created_at?: string | null;
          created_by?: string | null;
          custom_pattern?: Json | null;
          date_time: string;
          description?: string | null;
          id?: string;
          max_cards_per_player: number;
          prize_amount?: number | null;
          room_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
          winning_pattern: string;
        };
        Update: {
          card_price?: number;
          created_at?: string | null;
          created_by?: string | null;
          custom_pattern?: Json | null;
          date_time?: string;
          description?: string | null;
          id?: string;
          max_cards_per_player?: number;
          prize_amount?: number | null;
          room_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
          winning_pattern?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bingo_sessions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      drawn_balls: {
        Row: {
          ball_letter: string;
          ball_number: number;
          draw_order: number;
          drawn_at: string | null;
          id: string;
          session_id: string | null;
        };
        Insert: {
          ball_letter: string;
          ball_number: number;
          draw_order: number;
          drawn_at?: string | null;
          id?: string;
          session_id?: string | null;
        };
        Update: {
          ball_letter?: string;
          ball_number?: number;
          draw_order?: number;
          drawn_at?: string | null;
          id?: string;
          session_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'drawn_balls_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'bingo_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          metadata: Json | null;
          read: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          metadata?: Json | null;
          read?: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          metadata?: Json | null;
          read?: boolean;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: string;
          created_at: string;
          details: Json | null;
          id: string;
          ip_address: unknown;
          payment_id: string;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role: string;
          created_at?: string;
          details?: Json | null;
          id?: string;
          ip_address?: unknown;
          payment_id: string;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: string;
          created_at?: string;
          details?: Json | null;
          id?: string;
          ip_address?: unknown;
          payment_id?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_audit_log_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_audit_log_payment_id_fkey';
            columns: ['payment_id'];
            isOneToOne: false;
            referencedRelation: 'payment_transactions';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_transactions: {
        Row: {
          admin_notes: string | null;
          amount: number;
          approved_at: string | null;
          approved_by: string | null;
          created_at: string | null;
          currency: string;
          id: string;
          payment_data: Json;
          payment_method: string;
          player_id: string | null;
          rejected_at: string | null;
          selected_cards: Json;
          session_id: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          amount: number;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string | null;
          currency: string;
          id?: string;
          payment_data: Json;
          payment_method: string;
          player_id?: string | null;
          rejected_at?: string | null;
          selected_cards: Json;
          session_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          amount?: number;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string | null;
          currency?: string;
          id?: string;
          payment_data?: Json;
          payment_method?: string;
          player_id?: string | null;
          rejected_at?: string | null;
          selected_cards?: Json;
          session_id?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_transactions_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_transactions_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_transactions_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'bingo_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      settings: {
        Row: {
          description: string | null;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          description?: string | null;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          description?: string | null;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'settings_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          created_at: string | null;
          email: string | null;
          id: string;
          nickname: string | null;
          phone: string | null;
          role: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          nickname?: string | null;
          phone?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          nickname?: string | null;
          phone?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      winners: {
        Row: {
          card_id: string | null;
          id: string;
          player_id: string | null;
          prize_share: number;
          session_id: string | null;
          verified_at: string;
        };
        Insert: {
          card_id?: string | null;
          id?: string;
          player_id?: string | null;
          prize_share: number;
          session_id?: string | null;
          verified_at?: string;
        };
        Update: {
          card_id?: string | null;
          id?: string;
          player_id?: string | null;
          prize_share?: number;
          session_id?: string | null;
          verified_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'winners_card_id_fkey';
            columns: ['card_id'];
            isOneToOne: false;
            referencedRelation: 'bingo_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'winners_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'winners_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'bingo_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_payment_atomic: {
        Args: {
          p_admin_id: string;
          p_admin_notes?: string;
          p_payment_id: string;
        };
        Returns: Json;
      };
      get_session_with_stats_by_id: {
        Args: { p_session_id: string };
        Returns: {
          approved_payments: number;
          card_price: number;
          cards_sold: number;
          created_at: string;
          created_by: string;
          date_time: string;
          description: string;
          id: string;
          max_cards_per_player: number;
          pending_payments: number;
          prize_amount: number;
          rejected_payments: number;
          revenue: number;
          status: string;
          total_cards: number;
          total_players: number;
          updated_at: string;
          winning_pattern: string;
        }[];
      };
      get_sessions_with_stats_optimized: {
        Args: never;
        Returns: {
          card_price: number;
          cards_sold: number;
          created_at: string;
          created_by: string;
          date_time: string;
          description: string;
          id: string;
          max_cards_per_player: number;
          prize_amount: number;
          revenue: number;
          status: string;
          total_cards: number;
          total_players: number;
          updated_at: string;
          winning_pattern: string;
        }[];
      };
      get_user_role: { Args: { user_id: string }; Returns: string };
      log_payment_action: {
        Args: {
          p_action: string;
          p_actor_id: string;
          p_actor_role: string;
          p_details?: Json;
          p_ip_address?: unknown;
          p_payment_id: string;
          p_user_agent?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
