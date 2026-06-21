import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase env vars missing. Check .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

export type Database = {
  public: {
    Tables: {
      archives: { Row: Archive; Insert: Partial<Archive>; Update: Partial<Archive> }
      rooms: { Row: Room; Insert: Partial<Room>; Update: Partial<Room> }
      players: { Row: Player; Insert: Partial<Player>; Update: Partial<Player> }
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> }
      prizes: { Row: Prize; Insert: Partial<Prize>; Update: Partial<Prize> }
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> }
      rankings: { Row: Ranking; Insert: Partial<Ranking>; Update: Partial<Ranking> }
      clues: { Row: Clue; Insert: Partial<Clue>; Update: Partial<Clue> }
      game_events: { Row: GameEvent; Insert: Partial<GameEvent>; Update: Partial<GameEvent> }
      room_messages: { Row: RoomMessage; Insert: Partial<RoomMessage>; Update: Partial<RoomMessage> }
      room_votes: { Row: RoomVote; Insert: Partial<RoomVote>; Update: Partial<RoomVote> }
    }
  }
}

export interface Archive {
  id: string; slug: string; title: string; subtitle: string; description: string
  duration_minutes: number; min_players: number; max_players: number
  price_per_player: number; payment_mode: 'host' | 'individual'
  is_active: boolean; cover_url: string | null; created_at: string
}

export interface Room {
  id: string; code: string; archive_id: string; host_player_id: string | null
  num_players: number; payment_mode: string; total_amount: number
  payment_status: 'pending' | 'paid'; status: 'waiting' | 'starting' | 'playing' | 'finished'
  started_at: string | null; finished_at: string | null; created_at: string
}

export interface Player {
  id: string; room_id: string; name: string; gender: string; whatsapp: string
  role: string | null; role_label: string | null; is_host: boolean
  role_target?: string | null; public_name?: string
  state_suspicion: number; state_cooperation: number; state_pressure: number
  betrayal_choice: 'reveal' | 'keep' | null; betrayal_at: string | null
  score: number; score_details: Record<string, unknown>
  postgame_eligible: boolean; joined_at: string
}

export interface RoomMessage {
  id: string; room_id: string; event_id: string | null
  sender_player_id: string | null; recipient_player_id: string | null
  sender_kind: 'player' | 'ai' | 'system' | 'kairo'
  sender_name: string; message_type: 'text' | 'ai' | 'system' | 'meme' | 'kairo' | 'attachment'
  body: string; metadata: Record<string, unknown>; created_at: string
}

export interface RoomVote {
  id: string; room_id: string; voter_player_id: string; suspect_player_id: string
  reason: string | null; created_at: string; updated_at: string
}

export interface Payment {
  id: string; room_id: string; payer_name: string; payer_whatsapp: string
  archive_title: string; num_players: number; amount: number
  payment_mode: string; status: string; reference: string | null; created_at: string
}

export interface Prize {
  id: string; room_id: string; winner_player_id: string
  winner_name: string; winner_gender: string; winner_whatsapp: string
  winner_score: number; amount: number; status: 'pending' | 'delivered'
  delivered_at: string | null; prize_number: number; created_at: string
}

export interface Notification {
  id: string; type: string; title: string; message: string
  data: Record<string, unknown>; read: boolean; created_at: string
}

export interface Ranking {
  id: string; room_id: string; archive_title: string
  players: RankingPlayer[]; winner_id: string; created_at: string
}

export interface RankingPlayer {
  id: string; name: string; role: string; score: number; rank: number
  score_details?: Record<string, unknown>; votes_received?: number; veto_target_name?: string | null
}

export interface Clue {
  id: string; room_id: string; player_id: string; event_id: string
  clue_type: string; title: string; content: Record<string, unknown>
  file_url: string | null; expires_at: string | null
  opened_at: string | null; expired: boolean; created_at: string
}

export interface GameEvent {
  id: string; room_id: string; archive_id: string
  trigger_minute: number; trigger_second: number; event_type: string
  target: string; content: Record<string, unknown>; expires_seconds: number | null
  delivered: boolean; delivered_at: string | null; created_at: string
}
