# FRONTEND DEVELOPMENT GUIDE

Hướng dẫn chi tiết để hoàn thiện Frontend của Hệ thống Quản lý Thực tập sinh.

## ✅ Đã Hoàn Thành

### UI Components (Shadcn/UI style)
- ✅ Button (`src/components/ui/button.tsx`)
- ✅ Input (`src/components/ui/input.tsx`)
- ✅ Card (`src/components/ui/card.tsx`)
- ✅ Label (`src/components/ui/label.tsx`)
- ✅ Table (`src/components/ui/table.tsx`)
- ✅ Dialog (`src/components/ui/dialog.tsx`)
- ✅ Select (`src/components/ui/select.tsx`)
- ✅ Toast (`src/components/ui/toast.tsx`)
- ✅ Badge (`src/components/ui/badge.tsx`)
- ✅ Toaster (`src/components/ui/toaster.tsx`)

### Core Features
- ✅ Authentication (Login, Logout, Token management)
- ✅ Protected Routes với Role-based access
- ✅ API Client (Axios với interceptors)
- ✅ Toast Notifications system
- ✅ Dashboard Layout cho tất cả roles
- ✅ Router setup hoàn chỉnh

### Dashboard Pages (Basic)
- ✅ Admin Dashboard (`src/pages/admin/AdminDashboard.tsx`)
- ✅ HR Dashboard (`src/pages/hr/HRDashboard.tsx`)
- ✅ Mentor Dashboard (`src/pages/mentor/MentorDashboard.tsx`)
- ✅ Intern Dashboard (`src/pages/intern/InternDashboard.tsx`)

## 📋 Cần Hoàn Thành

### 1. Module Admin - Quản lý Người dùng

#### Files cần tạo:
```
src/pages/admin/
├── UsersList.tsx          # Danh sách người dùng với Table
├── UserFormDialog.tsx     # Dialog tạo/sửa người dùng
└── components/
    └── UserRoleSelect.tsx # Component select role
```

#### UsersList.tsx - Template:
```tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Key } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import UserFormDialog from './UserFormDialog'

export default function UsersList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users')
      return response.data
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: number) => api.delete(`/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({
        title: "Thành công",
        description: "Đã xóa người dùng",
      })
    },
  })

  const handleEdit = (user: any) => {
    setSelectedUser(user)
    setIsDialogOpen(true)
  }

  const handleDelete = async (userId: number) => {
    if (confirm('Bạn có chắc muốn xóa người dùng này?')) {
      deleteMutation.mutate(userId)
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Quản lý Người dùng</h1>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm người dùng
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên đăng nhập</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : users?.length > 0 ? (
                users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'success' : 'destructive'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(user.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <UserFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          user={selectedUser}
          onSuccess={() => {
            setIsDialogOpen(false)
            setSelectedUser(null)
            queryClient.invalidateQueries({ queryKey: ['users'] })
          }}
        />
      </div>
    </DashboardLayout>
  )
}
```

### 2. Module HR - CRUD Batches

#### Files cần tạo:
```
src/pages/hr/
├── BatchesList.tsx        # Danh sách đợt thực tập
├── BatchFormDialog.tsx    # Form tạo/sửa đợt
├── InternsList.tsx        # Danh sách thực tập sinh
├── ImportExcelDialog.tsx  # Import Excel
└── Statistics.tsx         # Dashboard thống kê
```

#### BatchesList.tsx - Template:
```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function BatchesList() {
  // Fetch batches
  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const response = await api.get('/batches')
      return response.data
    },
  })

  return (
    <DashboardLayout role="hr">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Quản lý Đợt thực tập</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tạo đợt mới
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên đợt</TableHead>
                <TableHead>Ngày bắt đầu</TableHead>
                <TableHead>Ngày kết thúc</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Similar to UsersList */}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  )
}
```

### 3. Module Mentor - Tasks Management

#### Files cần tạo:
```
src/pages/mentor/
├── TasksList.tsx          # Danh sách nhiệm vụ
├── TaskFormDialog.tsx     # Form tạo/sửa nhiệm vụ
├── TaskDetail.tsx         # Chi tiết nhiệm vụ & báo cáo
├── InternsList.tsx        # Danh sách TTS của mentor
└── EvaluationForm.tsx     # Form đánh giá TTS
```

#### TasksList.tsx - Template:
```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Table } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'

const STATUS_COLORS = {
  new: 'default',
  submitted: 'warning',
  approved: 'success',
  request_change: 'destructive',
  overdue: 'destructive',
}

export default function TasksList() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await api.get('/tasks')
      return response.data
    },
  })

  return (
    <DashboardLayout role="mentor">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Quản lý Nhiệm vụ</h1>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tạo nhiệm vụ mới
          </Button>
        </div>

        {/* Task list table */}
      </div>
    </DashboardLayout>
  )
}
```

### 4. Module Intern - Tasks & Reports

#### Files cần tạo:
```
src/pages/intern/
├── TasksList.tsx          # Danh sách nhiệm vụ với tabs
├── TaskDetail.tsx         # Chi tiết nhiệm vụ
├── SubmitReportDialog.tsx # Form nộp báo cáo
└── EvaluationView.tsx     # Xem kết quả đánh giá
```

#### TasksList.tsx với Tabs:
```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function TasksList() {
  const { data: tasks } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const response = await api.get('/tasks')
      return response.data
    },
  })

  const pendingTasks = tasks?.filter((t: any) => t.status === 'new')
  const submittedTasks = tasks?.filter((t: any) => t.status === 'submitted')
  const needRevisionTasks = tasks?.filter((t: any) => t.status === 'request_change')
  const completedTasks = tasks?.filter((t: any) => t.status === 'approved')

  return (
    <DashboardLayout role="intern">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Nhiệm vụ của tôi</h1>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Chưa nộp ({pendingTasks?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="submitted">
              Đã nộp ({submittedTasks?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="revision">
              Cần sửa ({needRevisionTasks?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Hoàn thành ({completedTasks?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {/* Task cards */}
          </TabsContent>

          {/* Other tabs */}
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
```

## 🔧 Utilities & Hooks Cần Thêm

### Pagination Hook (`src/hooks/usePagination.ts`):
```tsx
import { useState } from 'react'

export function usePagination(totalItems: number, itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage

  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    setCurrentPage,
    nextPage: () => setCurrentPage(p => Math.min(p + 1, totalPages)),
    prevPage: () => setCurrentPage(p => Math.max(p - 1, 1)),
  }
}
```

### Search/Filter Hook (`src/hooks/useSearch.ts`):
```tsx
import { useState, useMemo } from 'react'

export function useSearch<T>(items: T[], searchKey: keyof T) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items
    return items.filter(item =>
      String(item[searchKey]).toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [items, searchTerm, searchKey])

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
  }
}
```

## 📝 API Hooks Pattern

Tạo custom hooks cho mỗi resource:

```tsx
// src/hooks/api/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

export function useUsers() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users')
      return response.data
    },
  })

  const createUser = useMutation({
    mutationFn: (userData: any) => api.post('/users', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: "Thành công", description: "Đã tạo người dùng" })
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.response?.data?.detail || "Có lỗi xảy ra",
        variant: "destructive",
      })
    },
  })

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.put(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: "Thành công", description: "Đã cập nhật người dùng" })
    },
  })

  const deleteUser = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({ title: "Thành công", description: "Đã xóa người dùng" })
    },
  })

  return {
    users,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
  }
}
```

Tương tự tạo cho:
- `useB atches.ts`
- `useTasks.ts`
- `useInterns.ts`
- `useEvaluations.ts`

## 🎨 UI Components Cần Thêm

### Tabs Component (`src/components/ui/tabs.tsx`):
```tsx
// Import từ @radix-ui/react-tabs
// Tương tự như Dialog, Select
```

### Pagination Component (`src/components/Pagination.tsx`):
```tsx
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({ currentPage, totalPages, onPageChange }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Trang {currentPage} / {totalPages}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```

### SearchInput Component:
```tsx
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function SearchInput({ value, onChange, placeholder }: any) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
      />
    </div>
  )
}
```

## 🚀 Hướng Dẫn Implement

### Bước 1: Cập nhật Router
Thêm routes mới vào `App.tsx`:
```tsx
// Admin routes
<Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><UsersList /></ProtectedRoute>} />

// HR routes
<Route path="/hr/batches" element={<ProtectedRoute allowedRoles={['hr', 'admin']}><BatchesList /></ProtectedRoute>} />
<Route path="/hr/interns" element={<ProtectedRoute allowedRoles={['hr', 'admin']}><InternsList /></ProtectedRoute>} />

// Mentor routes
<Route path="/mentor/tasks" element={<ProtectedRoute allowedRoles={['mentor', 'admin']}><TasksList /></ProtectedRoute>} />

// Intern routes
<Route path="/intern/tasks" element={<ProtectedRoute allowedRoles={['intern']}><TasksList /></ProtectedRoute>} />
```

### Bước 2: Update Dashboard Layout
Cập nhật `DashboardLayout.tsx` với menu items đầy đủ cho từng role.

### Bước 3: Develop Module by Module
1. Bắt đầu với Admin - Users (đơn giản nhất)
2. Tiếp tục HR - Batches & Interns
3. Mentor - Tasks Management
4. Intern - Tasks & Reports
5. Statistics & Charts (cuối cùng)

## 📚 Best Practices

1. **Reusable Components**: Tạo components tái sử dụng cho form fields, status badges, action buttons
2. **Error Handling**: Luôn handle errors trong API calls và hiển thị toast
3. **Loading States**: Hiển thị skeleton hoặc spinner khi đang load
4. **Validation**: Validate form inputs trước khi submit
5. **Confirmation**: Confirm trước khi delete hoặc thực hiện actions quan trọng
6. **Responsive**: Đảm bảo UI responsive trên mobile
7. **Accessibility**: Sử dụng semantic HTML và ARIA labels

## 🎯 Priority Order

1. **Cao**: Admin Users, HR Batches, Mentor & Intern Tasks
2. **Trung bình**: Import Excel, Evaluations
3. **Thấp**: Statistics Dashboard, Advanced features

## 📞 Cần Giúp Đỡ?

- Backend API đã sẵn sàng tại http://localhost:8000
- API Docs: http://localhost:8000/docs
- Tham khảo components đã có trong `src/components/ui/`
- Follow pattern từ các Dashboard pages hiện có

Good luck! 🚀
