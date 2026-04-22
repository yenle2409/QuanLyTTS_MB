import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
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
    // CHỈ LOG LỖI, KHÔNG TỰ ĐỘNG REDIRECT
    console.error('API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data
    })
    
    // TẠM THỜI COMMENT ĐOẠN NÀY ĐỂ XEM LỖI THỰC SỰ
    // if (error.response?.status === 401) {
    //   localStorage.removeItem('token')
    //   localStorage.removeItem('user')
    //   window.location.href = '/login'
    // }
    
    return Promise.reject(error)
  }
)

export default api