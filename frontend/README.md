# Frontend - Hệ thống Quản lý Thực tập sinh

Giao diện người dùng cho Hệ thống Quản lý Thực tập sinh Ngân hàng.

## Tech Stack

- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **State Management**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Charts**: Recharts

## Cài đặt

### 1. Cài đặt dependencies

```bash
cd frontend
npm install
```

### 2. Chạy development server

```bash
npm run dev
```

Frontend sẽ chạy tại: http://localhost:5173

### 3. Build for production

```bash
npm run build
```

## Cấu trúc dự án

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Shadcn UI components
│   │   ├── layout/          # Layout components
│   │   └── ProtectedRoute.tsx
│   ├── pages/
│   │   ├── auth/            # Login, etc.
│   │   ├── admin/           # Admin pages
│   │   ├── hr/              # HR pages
│   │   ├── mentor/          # Mentor pages
│   │   └── intern/          # Intern pages
│   ├── lib/
│   │   ├── api.ts          # Axios instance
│   │   ├── auth.ts         # Authentication utilities
│   │   └── utils.ts        # Utility functions
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript types
│   ├── App.tsx             # Main app with routing
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Phân quyền và Route

### Public Routes
- `/login` - Trang đăng nhập

### Admin Routes (Role: admin)
- `/admin` - Dashboard Admin
- `/admin/users` - Quản lý người dùng

### HR Routes (Role: hr, admin)
- `/hr` - Dashboard HR
- `/hr/batches` - Quản lý đợt thực tập
- `/hr/interns` - Quản lý thực tập sinh
- `/hr/tasks` - Giám sát nhiệm vụ
- `/hr/statistics` - Thống kê và báo cáo

### Mentor Routes (Role: mentor, admin)
- `/mentor` - Dashboard Mentor
- `/mentor/interns` - Thực tập sinh của tôi
- `/mentor/tasks` - Quản lý nhiệm vụ
- `/mentor/evaluations` - Đánh giá thực tập sinh

### Intern Routes (Role: intern)
- `/intern` - Dashboard Intern
- `/intern/tasks` - Nhiệm vụ của tôi
- `/intern/evaluation` - Kết quả đánh giá

## Tài khoản demo

- **Admin**: admin / admin123
- **HR**: hr_user / hr123
- **Mentor**: mentor_a / mentor123
- **Intern**: intern1 / intern123

## Tính năng đã hoàn thành

✅ Login và Authentication
✅ Protected Routes với phân quyền
✅ Layout riêng cho từng Role
✅ Dashboard cơ bản cho tất cả Role
✅ UI Components (Button, Input, Card)
✅ Responsive design với Tailwind CSS

## Tính năng cần phát triển thêm

### Module Admin
- [ ] CRUD người dùng (Danh sách, Tạo, Sửa, Xóa)
- [ ] Reset mật khẩu người dùng
- [ ] Khóa/Mở khóa tài khoản

### Module HR
- [ ] CRUD đợt thực tập
- [ ] Import TTS từ Excel
- [ ] Phân công Mentor cho TTS
- [ ] Dashboard thống kê với biểu đồ
- [ ] Xuất báo cáo Excel/PDF

### Module Mentor
- [ ] Danh sách TTS được phân công
- [ ] Tạo và giao nhiệm vụ
- [ ] Xem và duyệt báo cáo
- [ ] Form đánh giá TTS cuối kỳ

### Module Intern
- [ ] Danh sách nhiệm vụ với tabs (Chưa nộp, Đã nộp, Cần sửa, Hoàn thành)
- [ ] Form nộp báo cáo
- [ ] Upload file đính kèm
- [ ] Xem kết quả đánh giá

## API Integration

API endpoints được proxy qua Vite config:
- Backend: http://localhost:8000
- Proxy: `/api` -> `http://localhost:8000/api`

Xem `src/lib/api.ts` để biết cách sử dụng Axios instance.

## Styling Guide

Hệ thống sử dụng phong cách "Soft Corporate":
- **Primary Color**: Navy Blue (#1e3a8a)
- **Background**: Light Gray (#f8fafc)
- **Status Colors**:
  - Success: Green
  - Warning: Orange
  - Error: Red

Sử dụng Tailwind utilities và Shadcn components để đảm bảo tính nhất quán.

