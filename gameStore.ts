import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Room, Player, Clue, RoomMessage, RoomVote } from './supabase'

interface GameState {
  room: Room | null
  player: Player | null
  players: Player[]
  clues: Clue[]
  messages: RoomMessage[]
  currentVote: RoomVote | null
  gameElapsedSeconds: number
  setRoom: (room: Room) => void
  setPlayer: (player: Player) => void
  setPlayers: (players: Player[]) => void
  setClues: (clues: Clue[]) => void
  setMessages: (messages: RoomMessage[]) => void
  setCurrentVote: (vote: RoomVote | null) => void
  addMessage: (message: RoomMessage) => void
  addClue: (clue: Clue) => void
  expireClue: (clueId: string) => void
  setElapsed: (seconds: number) => void
  incrementElapsed: () => void
  clearGame: () => void
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      room: null,
      player: null,
      players: [],
      clues: [],
      messages: [],
      currentVote: null,
      gameElapsedSeconds: 0,

      setRoom: (room) => set({ room }),
      setPlayer: (player) => set({ player }),
      setPlayers: (players) => set({ players }),
      setClues: (clues) => set({ clues }),
      setMessages: (messages) => set({ messages }),
      setCurrentVote: (vote) => set({ currentVote: vote }),
      addMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
      addClue: (clue) => set((s) => ({ clues: [clue, ...s.clues] })),
      expireClue: (clueId) => set((s) => ({
        clues: s.clues.map((c) => c.id === clueId ? { ...c, expired: true } : c)
      })),
      setElapsed: (seconds) => set({ gameElapsedSeconds: Math.max(0, seconds) }),
      incrementElapsed: () => set((s) => ({ gameElapsedSeconds: s.gameElapsedSeconds + 1 })),
      clearGame: () => set({ room: null, player: null, players: [], clues: [], messages: [], currentVote: null, gameElapsedSeconds: 0 }),
    }),
    { name: 'vertice-game-state' }
  )
)
