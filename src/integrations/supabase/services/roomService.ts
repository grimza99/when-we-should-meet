import { supabase } from '../client'
import type { Database } from '../database.types'
import type { CreateRoomPayload } from '../../../types'

type RoomRow = Database['public']['Tables']['rooms']['Row']
type ParticipantRow = Database['public']['Tables']['participants']['Row']

export async function createRoom(payload: CreateRoomPayload) {
  const inviteCode = createInviteCode()

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      invite_code: inviteCode,
      max_participants: payload.maxParticipants,
      date_range_type: payload.dateRangeType,
      start_date: payload.startDate,
      end_date: payload.endDate,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getRoomByInviteCode(inviteCode: string) {
  const { data, error } = await supabase.rpc('get_room_by_invite_code', {
    input_invite_code: inviteCode,
  })

  if (error) {
    throw error
  }

  return data[0] ?? null
}

export async function joinRoom(params: {
  clientKey: string
  nickname: string
  roomId: string
}) {
  const { data, error } = await supabase.rpc('join_room', {
    input_client_key: params.clientKey,
    input_nickname: params.nickname,
    input_room_id: params.roomId,
  })

  if (error) {
    throw error
  }

  return data
}

export async function restoreParticipant(params: {
  clientKey: string
  roomId: string
}) {
  const { data, error } = await supabase.rpc('restore_participant', {
    input_client_key: params.clientKey,
    input_room_id: params.roomId,
  })

  if (error) {
    throw error
  }

  return data[0] ?? null
}

export function mapRoomRowToDraftRoom(row: RoomRow) {
  return {
    id: row.id,
    inviteCode: row.invite_code,
    maxParticipants: row.max_participants,
    dateRangeType: row.date_range_type,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    participants: [],
  }
}

export function mapParticipantRow(row: ParticipantRow) {
  return {
    id: row.id,
    nickname: row.nickname,
    colorIndex: row.color_index,
    selectionMode: 'available' as const,
    weekdayRules: [],
    overrides: {},
  }
}

function createInviteCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
}
