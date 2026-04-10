import { useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/gameStore'
import type { Room, Player, Clue } from '../lib/supabase'

export function useRoomRealtime(roomId: string | undefined) {
  const { setRoom, setPlayer, addClue, player } = useGameStore()

  useEffect(() => {
    if (!roomId) return

    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}`
      }, (payload) => {
        if (payload.new) setRoom(payload.new as Room)
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'clues',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        const clue = payload.new as Clue
        // Only add if it belongs to current player
        if (!player || clue.player_id === player.id) {
          addClue(clue)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'players',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        if (player && payload.new.id === player.id) {
          setPlayer(payload.new as Player)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, player?.id])
}

export function useAdminRealtime(onNotification: (n: unknown) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('admin:realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications'
      }, (payload) => onNotification(payload.new))
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'payments'
      }, (payload) => onNotification({ type: 'payment_received', data: payload.new }))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rooms'
      }, (payload) => {
        if (payload.new.status === 'finished') {
          onNotification({ type: 'game_finished', data: payload.new })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [onNotification])
}

export function usePlayersRealtime(roomId: string | undefined, onUpdate: (players: Player[]) => void) {
  const fetchPlayers = useCallback(async () => {
    if (!roomId) return
    const { data } = await supabase
      .from('players').select('*').eq('room_id', roomId).order('joined_at')
    if (data) onUpdate(data as Player[])
  }, [roomId])

  useEffect(() => {
    fetchPlayers()
    if (!roomId) return

    const channel = supabase
      .channel(`players:${roomId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}`
      }, () => fetchPlayers())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, fetchPlayers])
}
