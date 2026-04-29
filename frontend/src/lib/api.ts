import axios from 'axios'

const rawBaseURL = import.meta.env.VITE_API_URL || 'https://quanlytts-backend.onrender.com/api/v1'
const trimmedBaseURL = rawBaseURL.replace(/\/+$/, '')
const baseURL = trimmedBaseURL.endsWith('/api/v1')
  ? trimmedBaseURL
  : `${trimmedBaseURL}/api/v1`

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
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
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Chỉ log lỗi, không tự động redirect để tránh đá người dùng về login khi lỗi tải file/API phụ.
    console.error('API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
    })

    return Promise.reject(error)
  }
)

export default api
