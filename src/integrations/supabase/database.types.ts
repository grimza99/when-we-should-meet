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
      }
      participants: {
        Row: {
          client_key: string
          color_index: number
          id: string
          joined_at: string
          nickname: string
          room_id: string
        }
        Insert: {
          client_key: string
          color_index: number
          id?: string
          joined_at?: string
          nickname: string
          room_id: string
        }
        Update: Partial<Database['public']['Tables']['participants']['Insert']>
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
      }
      date_overrides: {
        Row: {
          created_at: string
          id: string
          participant_id: string
          room_id: string
          status: 'available' | 'unavailable'
          target_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_id: string
          room_id: string
          status: 'available' | 'unavailable'
          target_date: string
        }
        Update: Partial<Database['public']['Tables']['date_overrides']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
