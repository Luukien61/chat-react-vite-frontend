import { instance } from '@renderer/axios/Config'

export const getAllConversations = async (id: string) => {
  try {
    return await instance.get(`/chat/all/${id}`).then((response) => response.data)
  } catch (error) {
    console.log(error)
  }
}

export const getParticipant = async (id: string) => {
  // eslint-disable-next-line no-useless-catch
  try {
    return await instance.get(`/participant/${id}`).then((response) => response.data)
  } catch (error) {
    throw error
  }
}

export const getMessages = async (id: string) => {
  try {
    return await instance.get(`/message/${id}`).then((response) => response.data)
  } catch (error) {
    console.log(error)
  }
}

export type User = {
  id: string
  userName: string
  password: string
  email: string
  phone: string
}

export const getCode = async (user: User) => {
  try {
    return await instance.post(`/user/create`, user).then((response) => response.data)
  } catch (error) {
    console.log(error)
  }
}

export const createUser = async (user: User) => {
  try {
    return await instance.post(`/user/code/success`, user).then((response) => response.data)
  } catch (error) {
    console.log(error)
  }
}
