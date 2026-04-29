import axios from 'axios'

const rawApiUrl = import.meta.env.VITE_API_URL?.trim()
const fallbackApiUrl = 'https://quanlytts-backend.onrender.com/api/v1'

const baseURL = rawApiUrl
  ? rawApiUrl.replace(/\/+$/, '').endsWith('/api/v1')
    ? rawApiUrl.replace(/\/+$/, '')
    : `${rawApiUrl.replace(/\/+$/, '')}/api/v1`
  : fallbackApiUrl

const api = axios.create({
  baseURL,
})

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
    })
    return Promise.reject(error)
  }
)

export default api
