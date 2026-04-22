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
import { useToast } from '@/hooks/use-toast'

interface ResetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number
  userName: string
}

export default function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: ResetPasswordDialogProps) {
  const { toast } = useToast()
  const resetPassword = useResetPassword()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Lỗi',
        description: 'Mật khẩu xác nhận không khớp',
        variant: 'destructive',
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Lỗi',
        description: 'Mật khẩu phải có ít nhất 6 ký tự',
        variant: 'destructive',
      })
      return
    }

    try {
      await resetPassword.mutateAsync({ userId, newPassword })
      toast({
        title: 'Thành công',
        description: `Đã reset mật khẩu cho ${userName}`,
      })
      onOpenChange(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.response?.data?.detail || 'Có lỗi xảy ra',
        variant: 'destructive',
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Mật khẩu mới</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
