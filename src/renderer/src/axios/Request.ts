import { instance } from '@renderer/axios/Config'

export const getAllConversations = async (id: string) => {
  return await instance.get(`/chat/all/${id}`).then((response) => response.data)
}

export const getParticipant = async (id: string) => {
  // eslint-disable-next-line no-useless-catch
  return await instance.get(`/participant/${id}`).then((response) => response.data)
}

export const getMessagesByConversationId = async (id: string) => {
  return await instance.get(`/message/${id}`).then((response) => response.data)
}

export type User = {
  id: string
  userName: string
  password: string
  email: string
  phone: string
  avatar: string
}

export const getCode = async (user: User) => {
  return await instance.post(`/user/create`, user).then((response) => response.data)
}

export const createUser = async (user: User) => {
  try {
    return await instance.post(`/user/code/success`, user).then((response) => response.data)
  } catch (error) {
    console.log(error)
  }
}

export type LoginRequest = {
  email: string
  password: string
}

export const login = async (loginRequest: LoginRequest) => {
  return await instance.post(`/user/login`, loginRequest).then((response) => response.data)
}

export type CodeExchange = {
  code: string
}

export const exchangeCode = async (code: CodeExchange) => {
  return await instance.post(`/user/exchange_token`, code).then((response) => response.data)
}

export const loginWithGoogle = async (code: CodeExchange) => {
  return await instance.post(`/user/google/login`, code).then((response) => response.data)
}

export const searchUserByEmail = async (email: string) => {
  return await instance.get(`/user/search?email=${email}`).then((response) => response.data)
}

export const searchConversationByUserIds = async (user1Id: string, user2Id: string) => {
  return await instance
    .get(`/conversation?user1=${user1Id}&user2=${user2Id}`)
    .then((response) => response.data)
}
export type ConversationRequest = {
  id: string,
  senderId: string,
  recipientId: string,
  type: string,
  message: string,
  createdAt: Date,
}

export const createConversation = async (request: ConversationRequest) => {
  return await instance.post(`/conversation/private`, request).then((response) => response.data)
}
