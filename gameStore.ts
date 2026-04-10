import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Room, Player, Clue } from '../lib/supabase'

interface GameState {
  room: Room | null
  player: Player | null
  clues: Clue[]
  gameElapsedSeconds: number
  setRoom: (room: Room) => void
  setPlayer: (player: Player) => void
  setClues: (clues: Clue[]) => void
  addClue: (clue: Clue) => void
  expireClue: (clueId: string) => void
  incrementElapsed: () => void
  clearGame: () => void
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      room: null,
      player: null,
      clues: [],
      gameElapsedSeconds: 0,

      setRoom: (room) => set({ room }),
      setPlayer: (player) => set({ player }),
      setClues: (clues) => set({ clues }),
      addClue: (clue) => set((s) => ({ clues: [clue, ...s.clues] })),
      expireClue: (clueId) => set((s) => ({
        clues: s.clues.map((c) => c.id === clueId ? { ...c, expired: true } : c)
      })),
      incrementElapsed: () => set((s) => ({ gameElapsedSeconds: s.gameElapsedSeconds + 1 })),
      clearGame: () => set({ room: null, player: null, clues: [], gameElapsedSeconds: 0 }),
    }),
    { name: 'vertice-game-state' }
  )
)
