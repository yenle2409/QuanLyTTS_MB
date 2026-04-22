import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Loader2, Users, Award, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { type Batch } from '@/hooks/use-batches'
import { useInternProfiles, INTERN_STATUS_LABELS, type InternProfile } from '@/hooks/use-profiles'
import { useEvaluations, approvalConfig, type Evaluation } from '@/hooks/use-evaluations'
import { formatDate } from '@/lib/utils'

// ── Ranking badge colors ──────────────────────────────────────
const rankingColors: Record<string, string> = {
  'Xuất sắc': 'bg-purple-100 text-purple-700',
  'Giỏi':     'bg-blue-100 text-blue-700',
  'Khá':      'bg-green-100 text-green-700',
  'Trung bình':'bg-yellow-100 text-yellow-700',
  'Yếu':      'bg-red-100 text-red-700',
}

// ── Evaluation detail row ─────────────────────────────────────
function EvaluationRow({ internUserId }: { internUserId: number }) {
  const { data: evaluations, isLoading } = useEvaluations(internUserId)
  const evaluation = evaluations?.[0] // mỗi TTS chỉ có 1 đánh giá

  if (isLoading) {
    return (
      <TableRow className="bg-gray-50/60">
        <TableCell colSpan={6} className="py-3 pl-10">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </TableCell>
      </TableRow>
    )
  }

  if (!evaluation) {
    return (
      <TableRow className="bg-gray-50/60">
        <TableCell colSpan={6} className="py-3 pl-10 text-sm text-muted-foreground italic">
          Chưa có đánh giá
        </TableCell>
      </TableRow>
    )
  }

  const cfg = approvalConfig[evaluation.approval_status]

  return (
    <TableRow className="bg-blue-50/40">
      <TableCell colSpan={6} className="py-3 pl-10 pr-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {/* Điểm tổng */}
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />
            <span className="font-semibold text-base">{evaluation.total_score}</span>
            <span className="text-muted-foreground">/10</span>
          </div>

          {/* Xếp loại */}
          <Badge className={rankingColors[evaluation.ranking] || 'bg-gray-100 text-gray-700'}>
            {evaluation.ranking}
          </Badge>

          {/* Trạng thái duyệt */}
          <Badge className={`${cfg.bg} ${cfg.text} border ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5 inline-block`} />
            {cfg.label}
          </Badge>

          {/* Mentor */}
          <span className="text-muted-foreground">
            Mentor: <span className="font-medium text-gray-700">{evaluation.mentor_name}</span>
          </span>

          {/* Nhận xét */}
          {evaluation.final_comment && (
            <span className="text-muted-foreground italic truncate max-w-[300px]" title={evaluation.final_comment}>
              "{evaluation.final_comment}"
            </span>
          )}

          {/* HR note nếu có */}
          {evaluation.hr_note && (
            <span className="text-blue-600 text-xs">
              HR: {evaluation.hr_note}
            </span>
          )}
        </div>

        {/* Chi tiết điểm từng tiêu chí */}
        <div className="flex flex-wrap gap-3 mt-2">
          {[
            { key: 'attitude',    label: 'Thái độ' },
            { key: 'discipline',  label: 'Kỷ luật' },
            { key: 'learning',    label: 'Học hỏi' },
            { key: 'skills',      label: 'Kỹ năng' },
            { key: 'task_result', label: 'Kết quả' },
          ].map(c => (
            <div key={c.key} className="flex items-center gap-1 text-xs bg-white rounded px-2 py-1 border">
              <span className="text-muted-foreground">{c.label}:</span>
              <span className="font-semibold">{evaluation.criteria_scores[c.key as keyof typeof evaluation.criteria_scores]}</span>
            </div>
          ))}
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── Intern row with expandable evaluation ─────────────────────
function InternRow({
  profile,
  expanded,
  onToggle,
}: {
  profile: InternProfile
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-gray-50" onClick={onToggle}>
        <TableCell className="font-medium">{profile.user_full_name}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{profile.user_email}</TableCell>
        <TableCell>{profile.mentor_name || <span className="text-muted-foreground text-xs">Chưa phân công</span>}</TableCell>
        <TableCell>{profile.university || '—'}</TableCell>
        <TableCell>
          <Badge className={INTERN_STATUS_LABELS[profile.intern_status]?.color || 'bg-gray-100 text-gray-700'}>
            {INTERN_STATUS_LABELS[profile.intern_status]?.label || profile.intern_status}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </TableCell>
      </TableRow>

      {/* Expandable evaluation row */}
      {expanded && <EvaluationRow internUserId={profile.user_id} />}
    </>
  )
}

// ── Main Dialog ───────────────────────────────────────────────
interface Props {
  batch: Batch | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export default function BatchDetailDialog({ batch, open, onOpenChange }: Props) {
  const { data: allProfiles, isLoading } = useInternProfiles()
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const profiles = allProfiles?.filter(p => p.batch_id === batch?.id) || []

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => setExpandedIds(new Set(profiles.map(p => p.id)))
  const collapseAll = () => setExpandedIds(new Set())

  if (!batch) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            {batch.batch_name}
            <Badge className="ml-1 bg-blue-100 text-blue-700">{profiles.length} TTS</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Batch info */}
        <div className="flex flex-wrap gap-4 text-sm bg-gray-50 rounded-lg p-3">
          <span><span className="text-muted-foreground">Thời gian:</span> <span className="font-medium">{formatDate(batch.start_date)} — {formatDate(batch.end_date)}</span></span>
          <span><span className="text-muted-foreground">Trạng thái:</span> <Badge className={batch.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>{batch.status === 'open' ? 'Đang mở' : 'Đã đóng'}</Badge></span>
          {batch.description && <span className="text-muted-foreground italic">{batch.description}</span>}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Chưa có thực tập sinh nào trong đợt này</p>
          </div>
        ) : (
          <>
            {/* Expand/collapse controls */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Award className="h-3.5 w-3.5" />
                Click vào hàng để xem đánh giá
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={expandAll}>
                  Mở tất cả
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={collapseAll}>
                  Thu gọn
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mentor</TableHead>
                    <TableHead>Trường</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map(profile => (
                    <InternRow
                      key={profile.id}
                      profile={profile}
                      expanded={expandedIds.has(profile.id)}
                      onToggle={() => toggleExpand(profile.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}