import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface Batch {
  id: number
  batch_name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
  description?: string
  created_at: string
  updated_at: string
}

export interface CreateBatchData {
  batch_name: string
  start_date: string
  end_date: string
  description?: string
}

export interface UpdateBatchData {
  batch_name?: string
  start_date?: string
  end_date?: string
  status?: 'open' | 'closed'
  description?: string
}

// ✅ FIX: Mentor fetch ALL batches (cả open lẫn closed)
// để có thể check trạng thái đợt khi xem đánh giá TTS cũ
export function useBatches(status?: string) {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isMentor = user?.role === 'mentor'

  return useQuery({
    queryKey: ['batches', status, isMentor ? 'mentor' : 'all'],
    queryFn: async () => {
      if (isMentor) {
        // ✅ Dùng endpoint mentor nhưng KHÔNG filter status
        // để lấy cả đợt đã đóng (cần hiển thị TTS + xem đánh giá)
        const response = await api.get<Batch[]>('/batches/mentor/my-batches')
        return response.data
      }
      const params = new URLSearchParams()
      if (status) params.append('status_filter', status)
      const queryString = params.toString()
      const url = queryString ? `/batches/?${queryString}` : '/batches/'
      const response = await api.get<Batch[]>(url)
      return response.data
    },
  })
}

// Get single batch
export function useBatch(batchId: number) {
  return useQuery({
    queryKey: ['batch', batchId],
    queryFn: async () => {
      const response = await api.get<Batch>(`/batches/${batchId}/`)
      return response.data
    },
    enabled: !!batchId,
  })
}

// Create batch
export function useCreateBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateBatchData) => {
      const response = await api.post<Batch>('/batches/', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
    },
  })
}

// Update batch
export function useUpdateBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ batchId, data }: { batchId: number; data: UpdateBatchData }) => {
      const response = await api.put<Batch>(`/batches/${batchId}/`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
    },
  })
}

// Delete batch
export function useDeleteBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (batchId: number) => {
      const response = await api.delete(`/batches/${batchId}/`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
    },
  })
}