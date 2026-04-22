import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export type TaskStatus = 'new' | 'submitted' | 'request_change' | 'approved' | 'overdue'

export interface Task {
  id: number
  title: string
  description?: string
  batch_id: number
  mentor_id: number
  intern_id: number
  deadline: string
  status: TaskStatus
  file_attachment?: string
  mentor_name: string
  intern_name: string
  batch_name: string
  created_at: string
  updated_at: string
}

export interface TaskReport {
  id: number
  task_id: number
  content: string
  file_submission?: string
  submitted_at: string
  mentor_comment?: string
  commented_at?: string
}

export interface CreateTaskData {
  title: string
  description?: string
  intern_id: number
  batch_id: number
  deadline: string
  file_attachment?: string
}

export interface UpdateTaskData {
  title?: string
  description?: string
  deadline?: string
  status?: TaskStatus
  file_attachment?: string
}

// Get all tasks
export function useTasks(batchId?: number, status?: string) {
  return useQuery({
    queryKey: ['tasks', batchId, status],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (batchId) params.append('batch_id', batchId.toString())
      if (status) params.append('status_filter', status)
      const queryString = params.toString()
      const url = queryString ? `/tasks/?${queryString}` : '/tasks/'
      const response = await api.get<Task[]>(url)
      return response.data
    },
  })
}

// Get single task
export function useTask(taskId: number) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const response = await api.get<Task>(`/tasks/${taskId}`)
      return response.data
    },
    enabled: !!taskId,
  })
}

// Get task reports
export function useTaskReports(taskId: number) {
  return useQuery({
    queryKey: ['taskReports', taskId],
    queryFn: async () => {
      const response = await api.get<TaskReport[]>(`/tasks/${taskId}/reports`)
      return response.data
    },
    enabled: !!taskId,
  })
}

// Create task (Mentor only)
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTaskData) => {
      const response = await api.post<Task>('/tasks/', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Update task (Mentor only)
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: number; data: UpdateTaskData }) => {
      const response = await api.put<Task>(`/tasks/${taskId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Delete task (Mentor only)
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: number) => {
      await api.delete(`/tasks/${taskId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Approve task (Mentor only)
export function useApproveTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: number) => {
      const response = await api.post<Task>(`/tasks/${taskId}/approve`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Request change (Mentor only)
export function useRequestChange() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: number) => {
      const response = await api.post<Task>(`/tasks/${taskId}/request-change`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Submit task report (Intern only)
export function useSubmitTaskReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, data }: { taskId: number; data: { content: string; file_submission?: string } }) => {
      const response = await api.post<TaskReport>(`/tasks/${taskId}/reports`, {
        ...data,
        task_id: taskId,
      })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['taskReports', variables.taskId] })
    },
  })
}

// Add mentor comment to report (Mentor only)
export function useAddMentorComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, reportId, comment }: { taskId: number; reportId: number; comment: string }) => {
      const response = await api.post<TaskReport>(
        `/tasks/${taskId}/reports/${reportId}/comment`,
        { mentor_comment: comment }
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['taskReports', variables.taskId] })
    },
  })
}
