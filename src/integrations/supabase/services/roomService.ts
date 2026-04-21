import { supabase } from '../client'
import type { Database } from '../database.types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { CreateRoomPayload, Participant, Room } from '../../../types'

type RoomRow = Database['public']['Tables']['rooms']['Row']
type ParticipantRow = Database['public']['Tables']['participants']['Row']
type RoomSnapshot = {
  room: RoomRow
  participants: RoomSnapshotParticipantRow[]
}
type RoomSnapshotParticipantRow = {
  id: string
  nickname: string
  color_index: number
  selection_mode: Participant['selectionMode']
  weekday_rules: Participant['weekdayRules']
  overrides: Participant['overrides']
}
type RoomRealtimeChangePayload = {
  reason: 'participant_joined' | 'availability_changed'
  roomId: string
}

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

export async function getRoomSnapshot(roomId: string) {
  const { data, error } = await supabase.rpc('get_room_snapshot', {
    input_room_id: roomId,
  })

  if (error) {
    throw error
  }

  return (data as RoomSnapshot | null) ?? null
}

export async function updateParticipantAvailability(params: {
  clientKey: string
  participantId: string
  roomId: string
  selectionMode: Participant['selectionMode']
  weekdayRules: number[]
}) {
  const { error } = await supabase.rpc('update_participant_availability', {
    input_client_key: params.clientKey,
    input_participant_id: params.participantId,
    input_room_id: params.roomId,
    input_selection_mode: params.selectionMode,
    input_weekday_rules: params.weekdayRules,
  })

  if (error) {
    throw error
  }
}

export async function setParticipantDateOverride(params: {
  clientKey: string
  participantId: string
  roomId: string
  status: Participant['selectionMode'] | null
  targetDate: string
}) {
  const { error } = await supabase.rpc('set_participant_date_override', {
    input_client_key: params.clientKey,
    input_participant_id: params.participantId,
    input_room_id: params.roomId,
    input_status: params.status,
    input_target_date: params.targetDate,
  })

  if (error) {
    throw error
  }
}

export function subscribeToRoomChanges(params: {
  roomId: string
  onChange: () => void
  onStatusChange?: (status: string) => void
}) {
  const channel = supabase
    .channel(`room:${params.roomId}`, {
      config: {
        broadcast: {
          self: false,
        },
      },
    })
    .on<RoomRealtimeChangePayload>(
      'broadcast',
      { event: 'room_changed' },
      ({ payload }) => {
        if (payload.roomId === params.roomId) {
          params.onChange()
        }
      },
    )
    .subscribe((status) => params.onStatusChange?.(status))

  return channel
}

export async function broadcastRoomChanged(
  channel: RealtimeChannel,
  payload: RoomRealtimeChangePayload,
) {
  const result = await channel.send({
    type: 'broadcast',
    event: 'room_changed',
    payload,
  })

  if (result === 'error' || result === 'timed out') {
    throw new Error(`Realtime broadcast failed: ${result}`)
  }
}

export async function unsubscribeFromRoomChanges(channel: RealtimeChannel) {
  await supabase.removeChannel(channel)
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

export function mapRoomSnapshotToDraftRoom(snapshot: RoomSnapshot): Room {
  return {
    ...mapRoomRowToDraftRoom(snapshot.room),
    participants: snapshot.participants.map(mapDraftParticipantRecord),
  }
}

export function mapParticipantRow(row: ParticipantRow) {
  return mapDraftParticipantRecord({
    id: row.id,
    nickname: row.nickname,
    color_index: row.color_index,
    selection_mode: 'available',
    weekday_rules: [],
    overrides: {},
  })
}

function createInviteCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
}

function mapDraftParticipantRecord(row: RoomSnapshotParticipantRow): Participant {
  return {
    id: row.id,
    nickname: row.nickname,
    colorIndex: row.color_index,
    selectionMode: row.selection_mode,
    weekdayRules: row.weekday_rules,
    overrides: row.overrides,
  }
}
