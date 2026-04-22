import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export type InternStatus = 'active' | 'quit' | 'completed'

export const INTERN_STATUS_LABELS: Record<InternStatus, { label: string; color: string }> = {
  active:    { label: 'Đang làm',   color: 'bg-green-100 text-green-700' },
  quit:      { label: 'Đã nghỉ',    color: 'bg-red-100 text-red-700' },
  completed: { label: 'Hoàn thành', color: 'bg-blue-100 text-blue-700' },
}

// Danh sách phòng ban MB Bank — chỉnh theo thực tế nếu cần
export const DEPARTMENTS = [
  'Công nghệ thông tin',
  'Tài chính - Kế toán',
  'Kinh doanh & Bán lẻ',
  'Quản lý rủi ro',
  'Nhân sự',
  'Marketing',
  'Vận hành',
  'Kiểm toán nội bộ',
  'Pháp chế',
  'Khác',
]

export interface InternProfile {
  id: number
  user_id: number
  batch_id: number
  mentor_id?: number
  university?: string
  gpa?: number
  cv_link?: string
  department?: string                // ← thêm mới
  intern_status: InternStatus
  user_full_name: string
  user_email: string
  user_phone?: string
  gender?: string
  date_of_birth?: string
  address?: string
  batch_name: string
  mentor_name?: string
  created_at: string
  updated_at: string
}

export interface InternDetail extends InternProfile {
  full_name: string
  email: string
  phone?: string
  gender?: string
  date_of_birth?: string
  address?: string
  department?: string
  cv_link?: string
  tasks: {
    id: number
    title: string
    status: string
    deadline: string
  }[]
}

export interface CreateProfileData {
  user_id: number
  batch_id: number
  mentor_id?: number
  university?: string
  gpa?: number
  cv_link?: string
  department?: string                // ← thêm mới
}

export interface UpdateProfileData {
  batch_id?: number
  mentor_id?: number
  university?: string
  gpa?: number
  cv_link?: string
  department?: string                // ← thêm mới
  intern_status?: InternStatus
}

export interface UpdateUserProfileData {
  full_name?: string
  phone?: string
  gender?: string
  date_of_birth?: string
  address?: string
  university?: string
  gpa?: number
  cv_link?: string
  department?: string                // ← thêm mới
  intern_status?: InternStatus
}

export interface ImportResult {
  message: string
  imported_count: number
  errors?: string[]
}

export interface Mentor {
  id: number
  full_name: string
  email: string
  department: string | null
}

export function useInternProfiles(batchId?: number, mentorId?: number, department?: string) {
  return useQuery({
    queryKey: ['profiles', batchId, mentorId, department],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (batchId)    params.append('batch_id',   batchId.toString())
      if (mentorId)   params.append('mentor_id',  mentorId.toString())
      if (department) params.append('department', department)
      const url = params.toString() ? `/profiles/?${params}` : '/profiles/'
      const response = await api.get<InternProfile[]>(url)
      return response.data
    },
  })
}

export function useInternDetail(profileId: number | null) {
  return useQuery({
    queryKey: ['profile-detail', profileId],
    queryFn: async () => {
      const response = await api.get<InternDetail>(`/profiles/${profileId}/detail`)
      return response.data
    },
    enabled: !!profileId,
  })
}

export function useCreateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateProfileData) => {
      const response = await api.post<InternProfile>('/profiles/', data)
      return response.data
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profiles'] }) },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ profileId, data }: { profileId: number; data: UpdateProfileData }) => {
      const response = await api.put<InternProfile>(`/profiles/${profileId}`, data)
      return response.data
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profiles'] }) },
  })
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: UpdateUserProfileData }) => {
      const response = await api.put(`/users/${userId}/profile`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['profile-detail'] })
    },
  })
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ profileIds, internStatus }: { profileIds: number[]; internStatus: InternStatus }) => {
      const response = await api.patch('/profiles/bulk-status', {
        profile_ids: profileIds,
        intern_status: internStatus,
      })
      return response.data
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profiles'] }) },
  })
}

export function useImportExcel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, batchId }: { file: File; batchId?: number }) => {
      const formData = new FormData()
      formData.append('file', file)
      const params = batchId ? `?batch_id=${batchId}` : ''
      const response = await api.post<ImportResult>(`/profiles/import-excel${params}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useMentors() {
  return useQuery({
    queryKey: ['mentors'],
    queryFn: async () => {
      const response = await api.get<Mentor[]>('/profiles/mentors')
      return response.data
    },
  })
}