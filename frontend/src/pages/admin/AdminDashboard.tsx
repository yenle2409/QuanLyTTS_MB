import { useState, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Users, UserCheck, AlertCircle, Plus, Search,
  Pencil, Trash2, Key, Loader2, ShieldCheck, UserCog, Lock,
} from 'lucide-react'
import { useUsers, useDeleteUser, type User } from '@/hooks/use-users'
import UserFormDialog from '@/components/admin/UserFormDialog'
import DeleteConfirmDialog from '@/components/admin/DeleteConfirmDialog'
import ResetPasswordDialog from '@/components/admin/ResetPasswordDialog'
import { useToast } from '@/hooks/use-toast'
import { formatDateTime } from '@/lib/utils'
import { getCurrentUser } from '@/lib/auth'
import PaginationBar from '@/components/ui/pagination-bar'

const roleLabels: Record<string, string> = {
  admin: 'Admin', hr: 'HR', mentor: 'Mentor', intern: 'Thực tập sinh',
}
const roleBadgeColors: Record<string, string> = {
  admin:  'bg-purple-100 text-purple-800 border border-purple-200',
  hr:     'bg-blue-100 text-blue-800 border border-blue-200',
  mentor: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  intern: 'bg-orange-100 text-orange-800 border border-orange-200',
}

// TTS bị khóa = đã nghỉ/hoàn thành/đợt đóng
function isInternLocked(user: User): boolean {
  return user.role === 'intern' && user.status === 'locked'
}

export default function AdminDashboard() {
  const { toast } = useToast()
  const { data: users, isLoading, error } = useUsers()
  const deleteUser = useDeleteUser()

  const [userFormOpen,       setUserFormOpen]       = useState(false)
  const [editingUser,        setEditingUser]        = useState<User | null>(null)
  const [deleteDialogOpen,   setDeleteDialogOpen]   = useState(false)
  const [deletingUser,       setDeletingUser]       = useState<User | null>(null)
  const [resetPasswordOpen,  setResetPasswordOpen]  = useState(false)
  const [resetPasswordUser,  setResetPasswordUser]  = useState<User | null>(null)
  const [searchTerm,         setSearchTerm]         = useState('')
  const [roleFilter,         setRoleFilter]         = useState('all')
  const [statusFilter,       setStatusFilter]       = useState('all')
  const [page,               setPage]               = useState(1)
  const [pageSize,           setPageSize]           = useState(10)

  const filteredUsers = useMemo(() => {
    if (!users) return []
    return users.filter(u => {
      const matchSearch =
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      return matchSearch &&
        (roleFilter   === 'all' || u.role   === roleFilter) &&
        (statusFilter === 'all' || u.status === statusFilter)
    })
  }, [users, searchTerm, roleFilter, statusFilter])

  const pagedUsers = useMemo(() =>
    filteredUsers.slice((page - 1) * pageSize, page * pageSize),
    [filteredUsers, page, pageSize]
  )

  const stats = useMemo(() => {
    if (!users) return { total: 0, active: 0, locked: 0, byRole: {} as Record<string,number> }
    const byRole: Record<string,number> = {}
    users.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1 })
    return {
      total:  users.length,
      active: users.filter(u => u.status === 'active').length,
      locked: users.filter(u => u.status === 'locked').length,
      byRole,
    }
  }, [users])

  const handleAddUser = () => { setEditingUser(null); setUserFormOpen(true) }

  const handleEditUser = (u: User) => {
    if (isInternLocked(u)) {
      toast({ title: 'Không thể chỉnh sửa', description: 'TTS này đã nghỉ/hoàn thành hoặc thuộc đợt đã đóng' })
      return
    }
    setEditingUser(u); setUserFormOpen(true)
  }

  const handleResetPassword = (u: User) => {
    if (isInternLocked(u)) {
      toast({ title: 'Không thể reset mật khẩu', description: 'Tài khoản TTS này đã bị khóa' })
      return
    }
    setResetPasswordUser(u); setResetPasswordOpen(true)
  }

  const handleDeleteClick = (u: User) => {
    const me = getCurrentUser()
    if (me && me.id === u.id) {
      toast({ title: 'Không thể xóa', description: 'Bạn không thể xóa chính tài khoản của mình' })
      return
    }
    setDeletingUser(u); setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return
    try {
      await deleteUser.mutateAsync(deletingUser.id)
      toast({ title: 'Thành công', description: 'Đã xóa người dùng' })
      setDeleteDialogOpen(false); setDeletingUser(null)
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.response?.data?.detail || 'Có lỗi xảy ra' })
    }
  }

  if (error) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-64">
          <p className="text-red-500">Lỗi tải dữ liệu: {(error as Error).message}</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
            <p className="text-sm text-gray-500 mt-0.5">Quản lý tài khoản và phân quyền hệ thống</p>
          </div>
          <Button onClick={handleAddUser} className="bg-[#0f2d6b] hover:bg-[#0f2d6b]/90 gap-2">
            <Plus className="h-4 w-4" />Thêm người dùng
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Tổng tài khoản', value: stats.total,
              icon: <Users className="h-5 w-5" />,
              bg: 'bg-[#0f2d6b]', text: 'text-white', sub: 'text-blue-200',
              subText: `${stats.active} đang hoạt động`,
            },
            {
              label: 'Hoạt động', value: stats.active,
              icon: <UserCheck className="h-5 w-5" />,
              bg: 'bg-emerald-600', text: 'text-white', sub: 'text-emerald-200',
              subText: `${Math.round((stats.active / (stats.total || 1)) * 100)}% tổng số`,
            },
            {
              label: 'Bị khóa', value: stats.locked,
              icon: <AlertCircle className="h-5 w-5" />,
              bg: stats.locked > 0 ? 'bg-red-600' : 'bg-gray-400',
              text: 'text-white', sub: 'text-red-200',
              subText: stats.locked > 0 ? 'TTS đã nghỉ/hoàn thành/đợt đóng' : 'Không có',
            },
            {
              label: 'Phân quyền', value: Object.keys(stats.byRole).length,
              icon: <ShieldCheck className="h-5 w-5" />,
              bg: 'bg-violet-600', text: 'text-white', sub: 'text-violet-200',
              subText: Object.entries(stats.byRole).map(([r, c]) => `${roleLabels[r] || r}: ${c}`).join(' · '),
            },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 shadow-sm`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${s.sub}`}>{s.label}</p>
                  <p className={`text-3xl font-black mt-1 ${s.text}`}>{s.value}</p>
                  <p className={`text-xs mt-1 truncate ${s.sub}`}>{s.subText}</p>
                </div>
                <div className={`${s.text} opacity-70 mt-1`}>{s.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-[#0f2d6b] via-[#2563eb] to-[#0f2d6b]" />
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-[#0f2d6b]" />
              <span className="font-bold text-gray-900">Danh sách người dùng</span>
              <Badge className="bg-gray-100 text-gray-600 text-xs">{filteredUsers.length}/{users?.length || 0}</Badge>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Tìm tên, username, email..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setPage(1) }}
                  className="pl-9 h-8 text-sm w-[220px]"
                />
              </div>
              <Select value={roleFilter} onValueChange={v => { setRoleFilter(v); setPage(1) }}>
                <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả vai trò</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="intern">Thực tập sinh</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="locked">Bị khóa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-[#0f2d6b]" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wide pl-6">Họ tên</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wide">Username</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wide">Vai trò</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phòng ban</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wide">Trạng thái</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ngày tạo</TableHead>
                    <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wide text-right pr-6">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16 text-gray-400">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="font-medium">
                          {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                            ? 'Không tìm thấy người dùng phù hợp'
                            : 'Chưa có người dùng nào'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : pagedUsers.map(user => {
                    const locked = isInternLocked(user)
                    return (
                      <TableRow
                        key={user.id}
                        className={`transition-colors ${locked ? 'bg-gray-50/60 opacity-70' : 'hover:bg-blue-50/30'}`}
                      >
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                              locked ? 'bg-gray-400' : 'bg-[#0f2d6b]'
                            }`}>
                              {locked ? <Lock className="h-3.5 w-3.5" /> : user.full_name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-900 text-sm">{user.full_name}</span>
                              {locked && (
                                <p className="text-[10px] text-gray-400 mt-0.5">Tài khoản đã khóa</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 font-mono">{user.username}</TableCell>
                        <TableCell className="text-sm text-gray-600">{user.email}</TableCell>
                        <TableCell>
                          <Badge className={`${roleBadgeColors[user.role]} text-xs`}>
                            {roleLabels[user.role]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {(user as any).department || <span className="text-gray-300">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <span className={`text-xs font-medium ${user.status === 'active' ? 'text-emerald-700' : 'text-red-700'}`}>
                              {user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-400">{formatDateTime(user.created_at)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-1">
                            {locked ? (
                              // TTS bị khóa: disable edit + reset, chỉ cho xóa
                              <>
                                <button disabled title="Không thể chỉnh sửa — tài khoản đã khóa"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-200 cursor-not-allowed">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button disabled title="Không thể reset mật khẩu — tài khoản đã khóa"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-200 cursor-not-allowed">
                                  <Key className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleDeleteClick(user)} title="Xóa người dùng"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              // Tài khoản bình thường
                              <>
                                <button onClick={() => handleEditUser(user)} title="Chỉnh sửa"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleResetPassword(user)} title="Reset mật khẩu"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors">
                                  <Key className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => handleDeleteClick(user)} title="Xóa"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="px-4 border-t border-gray-100">
                <PaginationBar
                  currentPage={page} totalItems={filteredUsers.length} pageSize={pageSize}
                  onPageChange={setPage} onPageSizeChange={s => { setPageSize(s); setPage(1) }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <UserFormDialog open={userFormOpen} onOpenChange={setUserFormOpen} user={editingUser} />
      <DeleteConfirmDialog
        open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Xóa người dùng"
        description={`Bạn có chắc chắn muốn xóa người dùng "${deletingUser?.full_name}"? Hành động này không thể hoàn tác.`}
        isLoading={deleteUser.isPending}
      />
      {resetPasswordUser && (
        <ResetPasswordDialog
          open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}
          userId={resetPasswordUser.id} userName={resetPasswordUser.full_name}
        />
      )}
    </DashboardLayout>
  )
}