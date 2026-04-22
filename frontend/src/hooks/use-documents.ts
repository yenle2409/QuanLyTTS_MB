import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface TrainingDocument {
  id: number
  mentor_id: number
  mentor_name: string
  batch_id: number | null
  batch_name: string | null
  title: string
  description: string | null
  doc_type: 'pdf' | 'slide' | 'link' | 'other'
  file_url: string | null
  file_name: string | null
  file_size: number | null
  created_at: string
  updated_at: string
}

export interface CreateDocumentData {
  batch_id?: number
  title: string
  description?: string
  doc_type: string
  file_url?: string
  file_name?: string
  file_size?: number
}

export function useDocuments(batchId?: number) {
  return useQuery<TrainingDocument[]>({
    queryKey: ['documents', batchId],
    queryFn: async () => {
      const params = batchId ? `?batch_id=${batchId}` : ''
      const res = await api.get(`/documents/${params}`)
      return res.data
    },
  })
}

export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateDocumentData) => {
      const res = await api.post('/documents/', data)
      return res.data as TrainingDocument
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data as TrainingDocument
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => { await api.delete(`/documents/${id}`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}