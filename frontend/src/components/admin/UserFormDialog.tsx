import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useCreateUser, useUpdateUser, type User, type CreateUserData, type UpdateUserData } from '@/hooks/use-users'
import { useToast } from '@/hooks/use-toast'
import { getCurrentUser } from '@/lib/auth'
import { Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
}

const roleOptions = [
  { value: 'admin',  label: 'Admin'  },
  { value: 'hr',     label: 'HR'     },
  { value: 'mentor', label: 'Mentor' },
]

const departmentOptions = [
  { value: 'KHDN', label: 'Khách hàng Doanh nghiệp (KHDN)' },
  { value: 'KHCN', label: 'Khách hàng Cá nhân (KHCN)'      },
]

const statusOptions = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'locked', label: 'Bị khóa'   },
]

type Role = 'admin' | 'hr' | 'mentor'

// ─── Helper: tạo username gợi ý từ họ tên ────────────────────
function generateUsernameFromName(fullName: string): string {
  if (!fullName.trim()) return ''
  const parts = fullName.trim().toLowerCase().split(/\s+/)
  // Lấy tên (phần cuối) + viết tắt các phần còn lại
  const lastName  = parts[parts.length - 1]
  const initials  = parts.slice(0, -1).map(p => p.charAt(0)).join('')
  return removeAccents(lastName + initials)
}

// ─── Helper: bỏ dấu tiếng Việt ───────────────────────────────
function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
}

export default function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const { toast } = useToast()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const isEditing  = !!user

  const [formData, setFormData] = useState({
    username:        '',
    password:        '',
    confirmPassword: '',
    full_name:       '',
    email:           '',
    role:            'hr' as Role,
    phone:           '',
    department:      '' as '' | 'KHDN' | 'KHCN',
    status:          'active' as 'active' | 'locked',
  })

  const [showPassword,        setShowPassword]        = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [usernameTouched,     setUsernameTouched]     = useState(false)
  const [errors,              setErrors]              = useState<Record<string, string>>({})

  useEffect(() => {
    if (user) {
      setFormData({
        username:        user.username,
        password:        '',
        confirmPassword: '',
        full_name:       user.full_name,
        email:           user.email,
        role:            (user.role === 'intern' ? 'hr' : user.role) as Role,
        phone:           user.phone || '',
        department:      (user as any).department || '',
        status:          user.status,
      })
    } else {
      setFormData({
        username: '', password: '', confirmPassword: '', full_name: '',
        email: '', role: 'hr', phone: '', department: '', status: 'active',
      })
    }
    setUsernameTouched(false)
    setErrors({})
    setShowPassword(false)
    setShowConfirmPassword(false)
  }, [user, open])

  // Auto-suggest username từ họ tên (nếu chưa tự nhập)
  useEffect(() => {
    if (!isEditing && !usernameTouched && formData.full_name) {
      const suggested = generateUsernameFromName(formData.full_name)
      setFormData(prev => ({ ...prev, username: suggested }))
    }
  }, [formData.full_name, isEditing, usernameTouched])

  // Auto-suggest username từ email nếu họ tên chưa có
  useEffect(() => {
    if (!isEditing && !usernameTouched && !formData.full_name && formData.email) {
      const suggested = formData.email.split('@')[0]
      setFormData(prev => ({ ...prev, username: suggested }))
    }
  }, [formData.email, isEditing, usernameTouched, formData.full_name])

  const handleRoleChange = (value: Role) => {
    setFormData(prev => ({
      ...prev,
      role: value,
      department: value === 'mentor' ? prev.department : '',
    }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.username.trim()) newErrors.username = 'Vui lòng nhập tên đăng nhập'
    if (!isEditing) {
      if (!formData.password) newErrors.password = 'Vui lòng nhập mật khẩu'
      else if (formData.password.length < 6) newErrors.password = 'Mật khẩu tối thiểu 6 ký tự'
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu'
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Mật khẩu không khớp'
    }
    if (!formData.full_name.trim()) newErrors.full_name = 'Vui lòng nhập họ tên'
    if (!formData.email.trim()) newErrors.email = 'Vui lòng nhập email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email không hợp lệ'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      if (isEditing) {
        const me = getCurrentUser()
        if (me && me.id === user.id && formData.status === 'locked') {
          toast({ title: 'Không thể khóa', description: 'Bạn không thể khóa chính tài khoản của mình' })
          return
        }
        const updateData: UpdateUserData = {
          full_name:  formData.full_name,
          email:      formData.email,
          phone:      formData.phone || undefined,
          department: formData.role === 'mentor' ? (formData.department || undefined) : undefined,
          status:     formData.status,
        }
        await updateUser.mutateAsync({ userId: user.id, data: updateData })
        toast({ title: 'Thành công', description: 'Cập nhật người dùng thành công' })
      } else {
        const createData: CreateUserData = {
          username:   formData.username,
          password:   formData.password,
          full_name:  formData.full_name,
          email:      formData.email,
          role:       formData.role,
          phone:      formData.phone || undefined,
          department: formData.role === 'mentor' ? (formData.department || undefined) : undefined,
        }
        await createUser.mutateAsync(createData)
        toast({ title: 'Thành công', description: 'Thêm người dùng mới thành công' })
      }
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.response?.data?.detail || 'Có lỗi xảy ra' })
    }
  }

  const isLoading = createUser.isPending || updateUser.isPending
  const passwordMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {isEditing ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
          </DialogTitle>
        </DialogHeader>

        <form autoComplete="off" onSubmit={handleSubmit} className="space-y-4 pt-1">
        <input type="text" name="fake_username" autoComplete="username" className="hidden" />
        <input type="password" name="fake_password" autoComplete="current-password" className="hidden" />
          {/* Họ tên */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              Họ và tên <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Vui lòng nhập họ tên"
              value={formData.full_name}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              className={errors.full_name ? 'border-red-400' : ''}
            />
            {errors.full_name && <p className="text-xs text-red-500">{errors.full_name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              type="email"
              name="random_email_123"
              autoComplete="new-password"
              placeholder="Vui lòng nhập email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className={errors.email ? 'border-red-400' : ''}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              Tên đăng nhập <span className="text-red-500">*</span>
              {!isEditing && !usernameTouched && formData.full_name && (
                <span className="ml-2 text-[10px] text-blue-500 font-normal">✨ Tự động gợi ý</span>
              )}
            </Label>
            <Input
              placeholder="Vui lòng nhập tên đăng nhập"
              value={formData.username}
              onChange={e => {
                setUsernameTouched(true)
                setFormData({ ...formData, username: e.target.value })
                if (errors.username) setErrors(prev => ({ ...prev, username: '' }))
              }}
              disabled={isEditing}
              className={isEditing ? 'bg-gray-50 text-gray-400' : errors.username ? 'border-red-400' : ''}
            />
            {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
            {!isEditing && usernameTouched && formData.full_name && (
              <button
                type="button"
                className="text-[10px] text-blue-500 hover:underline"
                onClick={() => {
                  setUsernameTouched(false)
                  setFormData(prev => ({ ...prev, username: generateUsernameFromName(prev.full_name) }))
                }}
              >
                ↩ Dùng lại gợi ý: "{generateUsernameFromName(formData.full_name)}"
              </button>
            )}
          </div>

          {/* Mật khẩu — chỉ khi tạo mới */}
          {!isEditing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  Mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tối thiểu 6 ký tự"
                    value={formData.password}
                    onChange={e => {
                      setFormData({ ...formData, password: e.target.value })
                      if (errors.password) setErrors(prev => ({ ...prev, password: '' }))
                    }}
                    className={`pr-9 ${errors.password ? 'border-red-400' : ''}`}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  Nhập lại mật khẩu <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu"
                    value={formData.confirmPassword}
                    onChange={e => {
                      setFormData({ ...formData, confirmPassword: e.target.value })
                      if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }))
                    }}
                    className={`pr-9 ${errors.confirmPassword ? 'border-red-400' : passwordMatch ? 'border-green-400' : ''}`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  {/* Icon check/x */}
                  {formData.confirmPassword && (
                    <span className="absolute right-8 top-1/2 -translate-y-1/2">
                      {passwordMatch
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        : <XCircle className="h-3.5 w-3.5 text-red-400" />}
                    </span>
                  )}
                </div>
                {errors.confirmPassword
                  ? <p className="text-xs text-red-500">{errors.confirmPassword}</p>
                  : passwordMatch
                    ? <p className="text-xs text-green-500">✓ Mật khẩu khớp</p>
                    : null}
              </div>
            </div>
          )}

          {/* Vai trò + Trạng thái (khi edit) / Phòng ban (khi mentor) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Vai trò</Label>
              <Select value={formData.role} onValueChange={handleRoleChange} disabled={isEditing}>
                <SelectTrigger className={isEditing ? 'bg-gray-50 text-gray-400' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {isEditing ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Trạng thái</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v: 'active' | 'locked') => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : formData.role === 'mentor' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">Phòng ban</Label>
                <Select
                  value={formData.department}
                  onValueChange={(v: 'KHDN' | 'KHCN') => setFormData({ ...formData, department: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          {/* Phòng ban khi edit + mentor */}
          {isEditing && formData.role === 'mentor' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Phòng ban</Label>
              <Select
                value={formData.department}
                onValueChange={(v: 'KHDN' | 'KHCN') => setFormData({ ...formData, department: v })}
              >
                <SelectTrigger><SelectValue placeholder="Chọn phòng ban" /></SelectTrigger>
                <SelectContent>
                  {departmentOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* SĐT */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-700">
              Số điện thoại <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
            </Label>
            <Input
              placeholder="VD: 0901234567"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
            <Button type="submit" disabled={isLoading} className="bg-[#0f2d6b] hover:bg-[#0f2d6b]/90 min-w-[90px]">
              {isLoading
                ? <><span className="animate-spin mr-1">⏳</span>Đang xử lý...</>
                : isEditing ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}