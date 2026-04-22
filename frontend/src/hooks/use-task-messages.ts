import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface TaskMessage {
  id: number
  task_id: number
  sender_id: number
  sender_name: string
  sender_role: string
  content: string
  created_at: string
}

// Lấy danh sách tin nhắn của 1 nhiệm vụ
export function useTaskMessages(taskId: number | null) {
  return useQuery<TaskMessage[]>({
    queryKey: ['task-messages', taskId],
    queryFn: async () => {
      const res = await api.get(`/tasks/${taskId}/messages`)
      return res.data
    },
    enabled: !!taskId,
    refetchInterval: 5000, // Auto-refresh mỗi 5 giây
  })
}

// Gửi tin nhắn mới
export function useSendTaskMessage(taskId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/tasks/${taskId}/messages`, { content })
      return res.data as TaskMessage
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-messages', taskId] })
    },
  })
}

// Xóa tin nhắn
export function useDeleteTaskMessage(taskId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (messageId: number) => {
      await api.delete(`/tasks/${taskId}/messages/${messageId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-messages', taskId] })
    },
  })
}