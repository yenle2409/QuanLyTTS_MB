import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface LogbookEntry {
  id: number
  intern_id: number
  intern_name: string
  batch_id: number
  entry_type: 'daily' | 'weekly'
  log_date: string | null
  week_number: number | null
  week_label: string | null
  title: string
  content: string
  learned: string | null
  difficulties: string | null
  plan_next: string | null
  created_at: string
  updated_at: string
}

export interface CreateLogbookData {
  batch_id: number
  entry_type: 'daily' | 'weekly'
  log_date?: string
  week_number?: number
  week_label?: string
  title: string
  content: string
  learned?: string
  difficulties?: string
  plan_next?: string
}

export interface UpdateLogbookData {
  title?: string
  content?: string
  learned?: string
  difficulties?: string
  plan_next?: string
  week_label?: string
}

export function useLogbook(internId?: number, entryType?: string) {
  return useQuery<LogbookEntry[]>({
    queryKey: ['logbook', internId, entryType],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (internId) params.append('intern_id', String(internId))
      if (entryType) params.append('entry_type', entryType)
      const res = await api.get(`/logbook/?${params}`)
      return res.data
    },
  })
}

export function useCreateLogbook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateLogbookData) => {
      const res = await api.post('/logbook/', data)
      return res.data as LogbookEntry
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logbook'] }),
  })
}

export function useUpdateLogbook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateLogbookData }) => {
      const res = await api.put(`/logbook/${id}`, data)
      return res.data as LogbookEntry
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logbook'] }),
  })
}

export function useDeleteLogbook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => { await api.delete(`/logbook/${id}`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logbook'] }),
  })
}