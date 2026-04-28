import api from './api'

export interface LoginCredentials {
  username: string
  password: string
}

export interface User {
  id: number
  username: string
  full_name: string
  email: string
  role: 'admin' | 'hr' | 'mentor' | 'intern'
  phone?: string
  department?: 'KHDN' | 'KHCN'
  status: 'active' | 'locked'
}

export const login = async (credentials: LoginCredentials) => {
  const formData = new URLSearchParams()
  formData.append('username', credentials.username)
  formData.append('password', credentials.password)
  formData.append('grant_type', '')
  formData.append('scope', '')
  formData.append('client_id', '')
  formData.append('client_secret', '')

  const response = await api.post('/auth/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  const { access_token } = response.data
  localStorage.setItem('token', access_token)

  const userResponse = await api.get('/auth/me')
  const user = userResponse.data
  localStorage.setItem('user', JSON.stringify(user))

  return { token: access_token, user }
}

export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('user')
  if (!userStr) return null

  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token')
}

export const hasRole = (roles: string[]): boolean => {
  const user = getCurrentUser()
  if (!user) return false
  return roles.includes(user.role)
}