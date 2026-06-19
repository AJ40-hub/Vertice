import { useEffect, useCallback, useRef } from 'react'
import { useGameStore } from './gameStore'
import { adminApi } from './adminApi'
import type { Room, Player, Clue, Notification } from './supabase'

async function fetchPlayerState(roomId: string, playerId: string) {
  const response = await fetch('/api/player-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_id: roomId, player_id: playerId }),
  })
  if (!response.ok) return null
  return response.json() as Promise<{ room: Room; player: Player; players: Player[]; clues: Clue[] }>
}

export function useRoomRealtime(roomId: string | undefined) {
  const { setRoom, setPlayer, setClues, player } = useGameStore()

  useEffect(() => {
    if (!roomId || !player?.id) return
    const activeRoomId = roomId
    const activePlayerId = player.id
    let cancelled = false

    async function refresh() {
      const state = await fetchPlayerState(activeRoomId, activePlayerId)
      if (!state || cancelled) return
      setRoom(state.room)
      setPlayer(state.player)
      setClues(state.clues)
    }

    refresh()
    const interval = window.setInterval(refresh, 2500)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [roomId, player?.id, setRoom, setPlayer, setClues])
}

export function useAdminRealtime(onNotification: (n: unknown) => void) {
  const seenIdsRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function refresh() {
      try {
        const data = await adminApi<{ notifications: Notification[] }>('notifications')
        if (cancelled) return

        const latest = data.notifications || []
        const seen = seenIdsRef.current
        const fresh = latest.filter((notification) => !seen.has(notification.id)).reverse()
        latest.forEach((notification) => seen.add(notification.id))
        if (initializedRef.current) {
          fresh.forEach(onNotification)
        } else {
          initializedRef.current = true
        }
      } catch {
        // Admin polling should never crash the shell; expired sessions are handled by route guards.
      }
    }

    refresh()
    const interval = window.setInterval(refresh, 5000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [onNotification])
}

export function usePlayersRealtime(roomId: string | undefined, onUpdate: (players: Player[]) => void) {
  const player = useGameStore((state) => state.player)

  const fetchPlayers = useCallback(async () => {
    if (!roomId || !player?.id) return
    const activeRoomId = roomId
    const activePlayerId = player.id
    const state = await fetchPlayerState(activeRoomId, activePlayerId)
    if (state) onUpdate(state.players)
  }, [roomId, player?.id, onUpdate])

  useEffect(() => {
    fetchPlayers()
    if (!roomId || !player?.id) return

    const interval = window.setInterval(fetchPlayers, 2500)
    return () => window.clearInterval(interval)
  }, [roomId, player?.id, fetchPlayers])
}
