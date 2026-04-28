import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResetPassword } from '@/hooks/use-users'

interface ResetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number
  userName: string
}

interface FormErrors {
  newPassword?: string
  confirmPassword?: string
  general?: string
}

export default function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: ResetPasswordDialogProps) {
  const resetPassword = useResetPassword()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  const resetForm = () => {
    setNewPassword('')
    setConfirmPassword('')
    setErrors({})
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value)

    if (!value.trim()) {
      setConfirmPassword('')
    }

    setErrors((prev) => ({
      ...prev,
      newPassword: undefined,
      confirmPassword: undefined,
      general: undefined,
    }))
  }

  const handleConfirmPasswordChange = (value: string) => {
    if (!newPassword.trim()) return

    setConfirmPassword(value)
    setErrors((prev) => ({
      ...prev,
      confirmPassword: undefined,
      general: undefined,
    }))
  }

  const validateForm = () => {
    const nextErrors: FormErrors = {}

    if (!newPassword.trim()) {
      nextErrors.newPassword = 'Vui lòng nhập mật khẩu mới'
    } else if (newPassword.trim().length < 6) {
      nextErrors.newPassword = 'Mật khẩu phải có ít nhất 6 ký tự'
    }

    if (!newPassword.trim()) {
      nextErrors.confirmPassword = 'Hãy nhập mật khẩu mới trước'
    } else if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Vui lòng nhập xác nhận mật khẩu'
    } else if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      await resetPassword.mutateAsync({ userId, newPassword })
      handleClose()
    } catch (error: any) {
      setErrors({
        general: error.response?.data?.detail || 'Có lỗi xảy ra khi reset mật khẩu',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Reset mật khẩu</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Reset mật khẩu cho người dùng: <strong>{userName}</strong>
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Mật khẩu mới</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => handleNewPasswordChange(e.target.value)}
              aria-invalid={!!errors.newPassword}
              className={errors.newPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {errors.newPassword && (
              <p className="text-sm text-red-600">{errors.newPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => handleConfirmPasswordChange(e.target.value)}
              disabled={!newPassword.trim()}
              aria-invalid={!!errors.confirmPassword}
              className={`${!newPassword.trim() ? 'cursor-not-allowed opacity-60' : ''} ${
                errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''
              }`}
            />
            {!newPassword.trim() && (
              <p className="text-xs text-muted-foreground">
                Hãy nhập mật khẩu mới trước rồi mới xác nhận.
              </p>
            )}
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {errors.general && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.general}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={resetPassword.isPending}>
              {resetPassword.isPending ? 'Đang xử lý...' : 'Reset mật khẩu'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}