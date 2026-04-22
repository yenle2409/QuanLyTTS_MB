import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateProfile, useMentors, type InternProfile, type Mentor } from '@/hooks/use-profiles'
import { useToast } from '@/hooks/use-toast'
import { Users, Lock } from 'lucide-react'

interface AssignMentorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: InternProfile | null
}

export default function AssignMentorDialog({ open, onOpenChange, profile }: AssignMentorDialogProps) {
  const { toast } = useToast()
  const updateProfile = useUpdateProfile()
  const { data: mentors = [] } = useMentors()

  const [selectedMentorId, setSelectedMentorId] = useState<string>('')

  // Filter mentor theo phòng ban của TTS
  // Nếu TTS chưa có phòng ban → hiện tất cả mentor
  // Nếu TTS có phòng ban → chỉ hiện mentor cùng phòng ban
  const filteredMentors = profile?.department
    ? mentors.filter((m: Mentor) => m.department === profile.department)
    : mentors

  const hasNoMentorInDept = profile?.department && filteredMentors.length === 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !selectedMentorId) return

    try {
      await updateProfile.mutateAsync({
        profileId: profile.id,
        data: { mentor_id: parseInt(selectedMentorId) },
      })
      toast({
        title: 'Thành công',
        description: `Đã phân công Mentor cho ${profile.user_full_name}`,
      })
      onOpenChange(false)
      setSelectedMentorId('')
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.response?.data?.detail || 'Có lỗi xảy ra',
      })
    }
  }

  const handleClose = () => {
    setSelectedMentorId('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Phân công Mentor
          </DialogTitle>
        </DialogHeader>

        {profile && (
          <div className="space-y-4">
            {/* Thông tin TTS */}
            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <p className="text-xs text-muted-foreground">Thực tập sinh</p>
              <p className="font-medium">{profile.user_full_name}</p>
              <p className="text-sm text-muted-foreground">{profile.user_email}</p>
              {profile.department && (
                <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs font-normal mt-1">
                  {profile.department}
                </Badge>
              )}
            </div>

            {/* Cảnh báo không có mentor trong phòng ban */}
            {hasNoMentorInDept && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                <Lock className="h-4 w-4 shrink-0 mt-0.5 text-orange-500" />
                <span>
                  Chưa có mentor nào thuộc phòng <strong>{profile.department}</strong>.
                  Vui lòng thêm mentor cho phòng ban này trước.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  Chọn Mentor
                  {profile.department && (
                    <span className="text-xs text-muted-foreground font-normal">
                      {filteredMentors.length > 0
                        ? `— ${filteredMentors.length} mentor phòng ${profile.department}`
                        : `— Không có mentor phòng ${profile.department}`}
                    </span>
                  )}
                </Label>
                <Select
                  value={selectedMentorId}
                  onValueChange={setSelectedMentorId}
                  disabled={!!hasNoMentorInDept}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      hasNoMentorInDept
                        ? `Không có mentor phòng ${profile.department}`
                        : 'Chọn Mentor'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredMentors.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Không có mentor nào phù hợp
                      </div>
                    ) : (
                      filteredMentors.map((mentor: Mentor) => (
                        <SelectItem key={mentor.id} value={mentor.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span>{mentor.full_name}</span>
                            {mentor.department && (
                              <span className="text-xs text-muted-foreground">
                                ({mentor.department})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedMentorId || updateProfile.isPending || !!hasNoMentorInDept}
                >
                  {updateProfile.isPending ? 'Đang xử lý...' : 'Phân công'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}