import axios from 'axios'

export const instance = axios.create({
  baseURL: 'http://18.142.115.156:8080',
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }
})
