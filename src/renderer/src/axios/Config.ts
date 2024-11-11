import axios from 'axios'
const backendIP = import.meta.env.VITE_BACKEND_IP

export const instance = axios.create({
  baseURL: `http://${backendIP}:8080`,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }
})
