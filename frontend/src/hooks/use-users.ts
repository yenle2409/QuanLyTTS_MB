import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface User {
  id: number
  username: string
  full_name: string
  email: string
  role: 'admin' | 'hr' | 'mentor' | 'intern'
  phone?: string
  department?: 'KHDN' | 'KHCN'
  avatar?: string
  status: 'active' | 'locked'
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  username: string
  password: string
  full_name: string
  email: string
  role: 'admin' | 'hr' | 'mentor' | 'intern'
  phone?: string
  department?: 'KHDN' | 'KHCN'
  batch_id?: number
}

export interface UpdateUserData {
  full_name?: string
  email?: string
  phone?: string
  department?: 'KHDN' | 'KHCN'
  status?: 'active' | 'locked'
}

// Get all users
export function useUsers(role?: string) {
  return useQuery({
    queryKey: ['users', role],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (role) params.append('role', role)
      const queryString = params.toString()
      const url = queryString ? `/users/?${queryString}` : '/users/'
      const response = await api.get<User[]>(url)
      return response.data
    },
  })
}

// Get single user
export function useUser(userId: number) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await api.get<User>(`/users/${userId}`)
      return response.data
    },
    enabled: !!userId,
  })
}

// Create user
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      const response = await api.post<User>('/users/', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

// Update user
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: UpdateUserData }) => {
      const response = await api.put<User>(`/users/${userId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

// Delete user
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: number) => {
      const response = await api.delete(`/users/${userId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

// Reset password
export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number; newPassword: string }) => {
      const response = await api.post(`/users/${userId}/reset-password`, {
        new_password: newPassword,
      })
      return response.data
    },
  })
}
