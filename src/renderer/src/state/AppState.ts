import { create } from 'zustand'

type Action = {
  type: string
  setType: (newType: string) => void
}

export const accountAction = create<Action>()((set) => ({
  type: 'login',
  setType: (newType: string) => set({ type: newType })
}))
