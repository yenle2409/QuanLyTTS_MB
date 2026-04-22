import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface CriteriaScores {
  attitude:    number
  discipline:  number
  learning:    number
  skills:      number
  task_result: number
}

// ✅ THÊM: nhận xét từng tiêu chí
export interface CriteriaComments {
  attitude:    string
  discipline:  string
  learning:    string
  skills:      string
  task_result: string
}

export type EvaluationRanking = 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Yếu'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface Evaluation {
  id:                number
  intern_id:         number
  mentor_id:         number
  criteria_scores:   CriteriaScores
  criteria_comments: CriteriaComments | null   // ✅ THÊM
  final_comment:     string
  total_score:       number
  ranking:           EvaluationRanking
  intern_name:       string
  mentor_name:       string
  working_days:      number | null              // ✅ THÊM
  absent_days:       number | null              // ✅ THÊM
  // Approval
  approval_status: ApprovalStatus
  hr_note?:        string
  approved_by?:    number
  approved_at?:    string
  approver_name?:  string
  created_at:      string
  updated_at:      string
}

export interface CreateEvaluationData {
  intern_id:         number
  criteria_scores:   CriteriaScores
  criteria_comments: CriteriaComments          // ✅ THÊM
  final_comment:     string
  total_score:       number
  ranking:           EvaluationRanking
  working_days?:     number                    // ✅ THÊM
  absent_days?:      number                    // ✅ THÊM
}

export interface UpdateEvaluationData {
  criteria_scores?:   CriteriaScores
  criteria_comments?: CriteriaComments         // ✅ THÊM
  final_comment?:     string
  total_score?:       number
  ranking?:           EvaluationRanking
  working_days?:      number                   // ✅ THÊM
  absent_days?:       number                   // ✅ THÊM
}

export interface ApproveEvaluationData {
  approval_status: 'approved' | 'rejected'
  hr_note?: string
}

export const approvalConfig: Record<ApprovalStatus, {
  label: string; bg: string; text: string; border: string; dot: string
}> = {
  pending:  { label: 'Chờ HR duyệt', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  approved: { label: 'HR đã duyệt',  bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500'  },
  rejected: { label: 'HR từ chối',   bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500'    },
}

export function useEvaluations(internId?: number) {
  return useQuery({
    queryKey: ['evaluations', internId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (internId) params.append('intern_id', internId.toString())
      const url = params.toString() ? `/evaluations/?${params}` : '/evaluations/'
      const response = await api.get<Evaluation[]>(url)
      return response.data
    },
  })
}

export function useEvaluation(evaluationId: number) {
  return useQuery({
    queryKey: ['evaluation', evaluationId],
    queryFn: async () => {
      const response = await api.get<Evaluation>(`/evaluations/${evaluationId}`)
      return response.data
    },
    enabled: !!evaluationId,
  })
}

export function useCreateEvaluation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateEvaluationData) => {
      const response = await api.post<Evaluation>('/evaluations/', data)
      return response.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluations'] }),
  })
}

export function useUpdateEvaluation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ evaluationId, data }: { evaluationId: number; data: UpdateEvaluationData }) => {
      const response = await api.put<Evaluation>(`/evaluations/${evaluationId}`, data)
      return response.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluations'] }),
  })
}

export function useApproveEvaluation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ evaluationId, data }: { evaluationId: number; data: ApproveEvaluationData }) => {
      const response = await api.post<Evaluation>(`/evaluations/${evaluationId}/approve`, data)
      return response.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluations'] }),
  })
}

export function useDeleteEvaluation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (evaluationId: number) => {
      await api.delete(`/evaluations/${evaluationId}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evaluations'] }),
  })
}

export function calculateTotalScore(scores: CriteriaScores): number {
  const values = Object.values(scores)
  const sum = values.reduce((acc, val) => acc + val, 0)
  return Math.round((sum / values.length) * 10) / 10
}

export function getRankingFromScore(totalScore: number): EvaluationRanking {
  if (totalScore >= 9)   return 'Xuất sắc'
  if (totalScore >= 8)   return 'Giỏi'
  if (totalScore >= 6.5) return 'Khá'
  if (totalScore >= 5)   return 'Trung bình'
  return 'Yếu'
}