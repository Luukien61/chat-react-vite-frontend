import { create } from 'zustand'
import { Participant } from '@renderer/service/WebSocketService'
import { getParticipant } from '@renderer/axios/Request'

type Action = {
  type: string
  setType: (newType: string) => void
}

export const accountAction = create<Action>()((set) => ({
  type: 'login',
  setType: (newType: string) => set({ type: newType })
}))

interface ParticipantStore {
  participants: Map<string, Participant>
  setParticipant: (id: string, participant: Participant) => void
  getOrFetchParticipant: (id: string) => Promise<Participant | undefined>
  clearParticipantStore: () => void
}

export const useParticipantStore = create<ParticipantStore>((set, get) => ({
  participants: new Map<string, Participant>(),

  setParticipant: (id, participant) =>
    set((state) => {
      const updatedMap = new Map(state.participants)
      updatedMap.set(id, participant)
      return { participants: updatedMap }
    }),

  // Thêm hàm mới này để handle cả việc lấy từ cache và gọi API
  getOrFetchParticipant: async (id) => {
    // Lấy state hiện tại
    const state = get()
    const cached = state.participants.get(id)
    if (cached) {
      return cached
    }
    try {
      console.log("Call api")
      const participant = await getParticipant(id)
      if (participant) {
        // Lưu vào cache
        set((state) => {
          const updatedMap = new Map(state.participants)
          updatedMap.set(id, participant)
          return { participants: updatedMap }
        })
        return participant
      }
    } catch (error) {
      console.error('Failed to fetch participant:', error)
    }
    return undefined
  },

  clearParticipantStore: () =>
    set(() => ({
      participants: new Map<string, Participant>()
    }))
}))
