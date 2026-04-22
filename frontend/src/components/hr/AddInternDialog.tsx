import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, UserPlus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useBatches } from '@/hooks/use-batches'
import api from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'

interface AddInternDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface AddInternForm {
  full_name: string
  email: string
  phone: string
  username: string
  department: string
  gender: string
  date_of_birth: string
  address: string
  batch_id: string
  university: string
  gpa: string
  cv_link: string
  mentor_id: string
}

// Mentor có thêm field department
interface MentorItem {
  id: number
  full_name: string
  email: string
  department: string | null
}

const DEPARTMENTS = [
  { value: 'KHDN', label: 'Khách hàng doanh nghiệp (KHDN)' },
  { value: 'KHCN', label: 'Khách hàng cá nhân (KHCN)' },
  { value: 'TCHC', label: 'Tổ chức hành chính (TCHC)' },
  { value: 'KTNB', label: 'Kiểm toán nội bộ (KTNB)' },
  { value: 'TDH',  label: 'Tự động hóa (TĐH)' },
  { value: 'TINHDUNG', label: 'Tín dụng' },
  { value: 'RIRO', label: 'Quản lý rủi ro' },
]

const GENDERS = [
  { value: 'male',   label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other',  label: 'Khác' },
]

const initialForm: AddInternForm = {
  full_name: '', email: '', phone: '', username: '',
  department: '', gender: '', date_of_birth: '', address: '',
  batch_id: '', university: '', gpa: '', cv_link: '', mentor_id: '',
}

export default function AddInternDialog({ open, onOpenChange }: AddInternDialogProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: batches } = useBatches()

  const [form, setForm] = useState<AddInternForm>(initialForm)
  const [allMentors, setAllMentors] = useState<MentorItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<AddInternForm>>({})

  // Load toàn bộ mentor 1 lần khi mở dialog
  useEffect(() => {
    if (open) {
      api.get('/profiles/mentors')
        .then(res => setAllMentors(res.data))
        .catch(() => setAllMentors([]))
    }
  }, [open])

  // Auto-generate username từ email
  useEffect(() => {
    if (form.email && !form.username) {
      setForm(prev => ({ ...prev, username: form.email.split('@')[0] }))
    }
  }, [form.email])

  // Filter mentor theo phòng ban đã chọn
  // Nếu chưa chọn phòng ban → hiện tất cả mentor
  // Nếu đã chọn phòng ban → chỉ hiện mentor cùng phòng ban
  const filteredMentors = form.department
    ? allMentors.filter(m => m.department === form.department)
    : allMentors

  const handleChange = (field: keyof AddInternForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  // Khi đổi phòng ban → reset mentor đã chọn nếu mentor đó không thuộc phòng ban mới
  const handleDepartmentChange = (value: string) => {
    const currentMentor = allMentors.find(m => m.id.toString() === form.mentor_id)
    const mentorStillValid = !value || !currentMentor || currentMentor.department === value
    setForm(prev => ({
      ...prev,
      department: value,
      mentor_id: mentorStillValid ? prev.mentor_id : '',
    }))
    if (errors.department) setErrors(prev => ({ ...prev, department: undefined }))
  }

  const validate = (): boolean => {
    const newErrors: Partial<AddInternForm> = {}
    if (!form.full_name.trim()) newErrors.full_name = 'Vui lòng nhập họ tên'
    if (!form.email.trim()) newErrors.email = 'Vui lòng nhập email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Email không hợp lệ'
    if (!form.username.trim()) newErrors.username = 'Vui lòng nhập tên đăng nhập'
    if (!form.batch_id) newErrors.batch_id = 'Vui lòng chọn đợt thực tập'
    if (form.gpa && (isNaN(Number(form.gpa)) || Number(form.gpa) < 0 || Number(form.gpa) > 4)) {
      newErrors.gpa = 'GPA phải từ 0 đến 4'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsLoading(true)
    try {
      const payload = {
        full_name:     form.full_name.trim(),
        email:         form.email.trim(),
        phone:         form.phone.trim() || null,
        username:      form.username.trim(),
        department:    form.department || null,
        gender:        form.gender || null,
        date_of_birth: form.date_of_birth || null,
        address:       form.address.trim() || null,
        batch_id:      Number(form.batch_id),
        mentor_id:     form.mentor_id && form.mentor_id !== '_none' ? Number(form.mentor_id) : null,
        university:    form.university.trim() || null,
        gpa:           form.gpa ? Number(form.gpa) : null,
        cv_link:       form.cv_link.trim() || null,
      }
      await api.post('/profiles/create-with-account', payload)
      toast({
        title: 'Thêm thành công',
        description: `Đã thêm thực tập sinh "${form.full_name}" vào hệ thống`,
      })
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      handleClose()
    } catch (error: any) {
      const detail = error.response?.data?.detail
      toast({ title: 'Lỗi', description: detail || 'Có lỗi xảy ra khi thêm thực tập sinh' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setForm(initialForm)
    setErrors({})
    onOpenChange(false)
  }

  const openBatches = batches?.filter(b => b.status === 'open') || []

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Thêm thực tập sinh thủ công
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ── Thông tin tài khoản ── */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 pb-1 border-b">
              Thông tin tài khoản
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Họ và tên */}
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="full_name">Họ và tên <span className="text-red-500">*</span></Label>
                <Input id="full_name" placeholder="Nguyễn Văn A" value={form.full_name}
                  onChange={e => handleChange('full_name', e.target.value)}
                  className={errors.full_name ? 'border-red-500' : ''} />
                {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <Input id="email" type="email" placeholder="example@gmail.com" value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''} />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              {/* Số điện thoại */}
              <div className="space-y-1">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input id="phone" placeholder="0901234567" value={form.phone}
                  onChange={e => handleChange('phone', e.target.value)} />
              </div>

              {/* Username */}
              <div className="space-y-1">
                <Label htmlFor="username">Tên đăng nhập <span className="text-red-500">*</span></Label>
                <Input id="username" placeholder="nguyenvana" value={form.username}
                  onChange={e => handleChange('username', e.target.value)}
                  className={errors.username ? 'border-red-500' : ''} />
                {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
                <p className="text-xs text-muted-foreground">Mật khẩu mặc định: intern123</p>
              </div>

              {/* Giới tính */}
              <div className="space-y-1">
                <Label>Giới tính</Label>
                <Select value={form.gender} onValueChange={v => handleChange('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn giới tính" /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Ngày sinh */}
              <div className="space-y-1">
                <Label htmlFor="date_of_birth">Ngày sinh</Label>
                <Input id="date_of_birth" type="date" value={form.date_of_birth}
                  onChange={e => handleChange('date_of_birth', e.target.value)} />
              </div>

              {/* Địa chỉ */}
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="address">Địa chỉ</Label>
                <Input id="address" placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
                  value={form.address} onChange={e => handleChange('address', e.target.value)} />
              </div>

              {/* Phòng ban — khi đổi sẽ reset mentor nếu không hợp lệ */}
              <div className="space-y-1 sm:col-span-2">
                <Label>Phòng ban thực tập</Label>
                <Select value={form.department} onValueChange={handleDepartmentChange}>
                  <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Thông tin hồ sơ thực tập ── */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 pb-1 border-b">
              Thông tin hồ sơ thực tập
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Đợt thực tập */}
              <div className="space-y-1 sm:col-span-2">
                <Label>Đợt thực tập <span className="text-red-500">*</span></Label>
                <Select value={form.batch_id} onValueChange={v => handleChange('batch_id', v)}>
                  <SelectTrigger className={errors.batch_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Chọn đợt thực tập" />
                  </SelectTrigger>
                  <SelectContent>
                    {openBatches.length === 0 ? (
                      <SelectItem value="_none" disabled>Không có đợt đang mở</SelectItem>
                    ) : openBatches.map(batch => (
                      <SelectItem key={batch.id} value={batch.id.toString()}>{batch.batch_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.batch_id && <p className="text-xs text-red-500">{errors.batch_id}</p>}
                {openBatches.length === 0 && (
                  <p className="text-xs text-orange-500">Hiện không có đợt thực tập nào đang mở</p>
                )}
              </div>

              {/* Mentor — filter theo phòng ban */}
              <div className="space-y-1 sm:col-span-2">
                <Label>
                  Phân công Mentor
                  {form.department && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">
                      {filteredMentors.length > 0
                        ? `— ${filteredMentors.length} mentor phòng ${form.department}`
                        : `— Không có mentor phòng ${form.department}`}
                    </span>
                  )}
                </Label>
                <Select value={form.mentor_id} onValueChange={v => handleChange('mentor_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      form.department && filteredMentors.length === 0
                        ? `Không có mentor phòng ${form.department}`
                        : 'Chọn Mentor (có thể bỏ qua)'
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Chưa phân công</SelectItem>
                    {filteredMentors.length === 0 && form.department ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Không có mentor nào thuộc phòng {form.department}
                      </div>
                    ) : (
                      filteredMentors.map(m => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.full_name}
                          {m.department && (
                            <span className="ml-1 text-xs text-muted-foreground">({m.department})</span>
                          )}
                          {' '}— {m.email}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {form.department && filteredMentors.length === 0 && (
                  <p className="text-xs text-orange-500">
                    Chưa có mentor nào được phân công cho phòng {form.department}. Bạn có thể bỏ qua và phân công sau.
                  </p>
                )}
              </div>

              {/* Trường đại học */}
              <div className="space-y-1">
                <Label htmlFor="university">Trường đại học</Label>
                <Input id="university" placeholder="Đại học Bách Khoa Hà Nội"
                  value={form.university} onChange={e => handleChange('university', e.target.value)} />
              </div>

              {/* GPA */}
              <div className="space-y-1">
                <Label htmlFor="gpa">GPA</Label>
                <Input id="gpa" type="number" placeholder="3.5" min={0} max={4} step={0.01}
                  value={form.gpa} onChange={e => handleChange('gpa', e.target.value)}
                  className={errors.gpa ? 'border-red-500' : ''} />
                {errors.gpa && <p className="text-xs text-red-500">{errors.gpa}</p>}
              </div>

              {/* CV Link */}
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="cv_link">Link CV</Label>
                <Input id="cv_link" type="url" placeholder="https://drive.google.com/..."
                  value={form.cv_link} onChange={e => handleChange('cv_link', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>Hủy</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang thêm...</>
            ) : (
              <><UserPlus className="h-4 w-4 mr-2" />Thêm thực tập sinh</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}