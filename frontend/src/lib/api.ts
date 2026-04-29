import axios from 'axios'

const rawBaseURL = import.meta.env.VITE_API_URL || 'https://quanlytts-backend.onrender.com/api/v1'

const normalizedBaseURL = String(rawBaseURL).replace(/\/$/, '')
const baseURL = normalizedBaseURL.endsWith('/api/v1')
  ? normalizedBaseURL
  : `${normalizedBaseURL}/api/v1`

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
