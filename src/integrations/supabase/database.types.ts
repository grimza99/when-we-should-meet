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
      rooms: {
        Row: {
          created_at: string
          date_range_type: 'this_month' | 'this_year' | 'custom'
          end_date: string
          id: string
          invite_code: string
          max_participants: number
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_range_type: 'this_month' | 'this_year' | 'custom'
          end_date: string
          id?: string
          invite_code: string
          max_participants: number
          start_date: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>
        Relationships: []
      }
      participants: {
        Row: {
          client_key: string
          color_index: number
          id: string
          joined_at: string
          nickname: string
          room_id: string
          updated_at: string
        }
        Insert: {
          client_key: string
          color_index: number
          id?: string
          joined_at?: string
          nickname: string
          room_id: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['participants']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'participants_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
        ]
      }
      availability_rules: {
        Row: {
          id: string
          participant_id: string
          room_id: string
          selection_mode: 'available' | 'unavailable'
          updated_at: string
          weekday_rules: number[]
        }
        Insert: {
          id?: string
          participant_id: string
          room_id: string
          selection_mode: 'available' | 'unavailable'
          updated_at?: string
          weekday_rules?: number[]
        }
        Update: Partial<
          Database['public']['Tables']['availability_rules']['Insert']
        >
        Relationships: [
          {
            foreignKeyName: 'availability_rules_participant_id_fkey'
            columns: ['participant_id']
            isOneToOne: true
            referencedRelation: 'participants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'availability_rules_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
        ]
      }
      date_overrides: {
        Row: {
          created_at: string
          id: string
          participant_id: string
          room_id: string
          status: 'available' | 'unavailable'
          target_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_id: string
          room_id: string
          status: 'available' | 'unavailable'
          target_date: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['date_overrides']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'date_overrides_participant_id_fkey'
            columns: ['participant_id']
            isOneToOne: false
            referencedRelation: 'participants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'date_overrides_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_room_snapshot: {
        Args: {
          input_room_id: string
        }
        Returns: Json
      }
      get_room_by_invite_code: {
        Args: { input_invite_code: string }
        Returns: Database['public']['Tables']['rooms']['Row'][]
      }
      join_room: {
        Args: {
          input_client_key: string
          input_nickname: string
          input_room_id: string
        }
        Returns: Database['public']['Tables']['participants']['Row']
      }
      restore_participant: {
        Args: {
          input_client_key: string
          input_room_id: string
        }
        Returns: Database['public']['Tables']['participants']['Row'][]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
