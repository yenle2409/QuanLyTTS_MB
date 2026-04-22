# Hệ thống Quản lý Thực tập sinh Ngân hàng

Hệ thống quản lý toàn diện cho quy trình thực tập sinh tại ngân hàng, từ tiếp nhận, phân công, giao việc, báo cáo đến đánh giá và thống kê.

## Tech Stack

### Backend
- **Framework**: FastAPI
- **Database**: SQLite (Development) / PostgreSQL (Production)
- **ORM**: SQLAlchemy
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Pydantic

### Frontend
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **State Management**: TanStack Query
- **Charts**: Recharts

## Cài đặt và Chạy

### Backend

```bash
cd backend

# Cài đặt dependencies
pip install -r requirements.txt

# Tạo database và seed data
python seed.py

# Chạy server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend chạy tại: http://localhost:8000
API Docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend

# Cài đặt dependencies
npm install

# Chạy development server
npm run dev
```

Frontend chạy tại: http://localhost:5173

## Tài khoản Demo

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| HR | hr_user | hr123 |
| Mentor | mentor_a, mentor_b | mentor123 |
| Intern | intern1, intern2, intern3, intern4, intern5 | intern123 |

## Cấu trúc Database

### Users
- ID, Username, Password, FullName, Email, Role, Phone, Avatar, Department, Status

### InternBatches (Đợt thực tập)
- ID, BatchName, StartDate, EndDate, Status, Description

### InternProfiles (Hồ sơ TTS)
- UserID (FK), BatchID (FK), MentorID (FK), University, GPA, CV_Link

### Tasks (Nhiệm vụ)
- ID, Title, Description, MentorID, InternID, BatchID, Deadline, Status, FileAttachment

### TaskReports (Báo cáo)
- ID, TaskID, Content, FileSubmission, SubmittedAt, MentorComment

### Evaluations (Đánh giá)
- ID, InternID, MentorID, Criteria_Scores (JSON), FinalComment, TotalScore, Ranking

## Phân quyền Hệ thống

### 1. Admin
- Quản lý người dùng (CRUD, Reset password, Phân quyền)
- Quản trị hệ thống

### 2. HR (Nhân sự)
- Quản lý đợt thực tập (Tạo, Cập nhật, Đóng/Mở)
- Quản lý hồ sơ thực tập sinh (Thêm, Import Excel)
- Phân công Mentor cho TTS
- Giám sát tiến độ (Read-only)
- Báo cáo & Thống kê (Dashboard, Export Excel/PDF)

### 3. Mentor (Hướng dẫn viên)
- Quản lý TTS được phân công
- Tạo và giao nhiệm vụ
- Duyệt báo cáo (Approve / Request Change)
- Đánh giá TTS cuối kỳ

### 4. Intern (Thực tập sinh)
- Xem nhiệm vụ được giao
- Nộp báo cáo nhiệm vụ
- Xem kết quả đánh giá

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Đăng nhập
- `GET /api/v1/auth/me` - Thông tin user hiện tại
- `POST /api/v1/auth/change-password` - Đổi mật khẩu

### Users (Admin)
- `GET /api/v1/users` - Danh sách người dùng
- `POST /api/v1/users` - Tạo người dùng
- `PUT /api/v1/users/{id}` - Cập nhật
- `DELETE /api/v1/users/{id}` - Xóa
- `POST /api/v1/users/{id}/reset-password` - Reset password

### Batches (HR)
- `GET /api/v1/batches` - Danh sách đợt thực tập
- `POST /api/v1/batches` - Tạo đợt mới
- `PUT /api/v1/batches/{id}` - Cập nhật
- `DELETE /api/v1/batches/{id}` - Xóa

### Profiles (HR)
- `GET /api/v1/profiles` - Danh sách hồ sơ TTS
- `POST /api/v1/profiles` - Tạo hồ sơ
- `PUT /api/v1/profiles/{id}` - Cập nhật
- `POST /api/v1/profiles/import-excel` - Import từ Excel

### Tasks (Mentor/Intern)
- `GET /api/v1/tasks` - Danh sách nhiệm vụ
- `POST /api/v1/tasks` - Tạo nhiệm vụ (Mentor)
- `POST /api/v1/tasks/{id}/reports` - Nộp báo cáo (Intern)
- `POST /api/v1/tasks/{id}/approve` - Duyệt (Mentor)
- `POST /api/v1/tasks/{id}/request-change` - Yêu cầu sửa (Mentor)

Chi tiết đầy đủ: http://localhost:8000/docs

## Tính năng Đã Hoàn thành

### Backend ✅
- ✅ Database Models và Schemas
- ✅ Authentication & Authorization (JWT)
- ✅ CRUD Users, Batches, Profiles, Tasks
- ✅ Import Excel cho TTS
- ✅ Task workflow (Create, Submit, Approve, Request Change)
- ✅ Seed data mẫu

### Frontend ✅
- ✅ Login và Protected Routes
- ✅ Layout riêng cho từng Role
- ✅ Dashboard cơ bản cho tất cả Role
- ✅ UI Components với Shadcn/UI
- ✅ Responsive design với Tailwind CSS

## Tính năng Cần Phát Triển

### Backend
- [ ] Evaluation APIs (Đánh giá cuối kỳ)
- [ ] Statistics APIs (Thống kê, biểu đồ)
- [ ] File upload (Avatar, CV, Task attachments, Reports)
- [ ] Export Excel/PDF APIs
- [ ] Email notifications
- [ ] Scheduled tasks (Check deadlines, auto-mark overdue)

### Frontend
- [ ] Module Admin: CRUD Users UI
- [ ] Module HR: CRUD Batches, Import Excel UI
- [ ] Module HR: Statistics Dashboard với Recharts
- [ ] Module Mentor: Tasks Management UI
- [ ] Module Mentor: Evaluation Form
- [ ] Module Intern: Tasks List với Tabs
- [ ] Module Intern: Submit Report Form
- [ ] File upload components
- [ ] Toast notifications
- [ ] Loading states & Error handling
- [ ] Pagination & Search

## Phong cách Thiết kế

**Theme**: Soft Corporate

**Màu sắc chủ đạo**:
- Primary: Navy Blue (#1e3a8a)
- Background: Light Gray (#f8fafc)
- Success: Green
- Warning: Orange/Yellow
- Error: Red

**Layout**:
- Admin/HR/Mentor: Sidebar bên trái + Header trên + Content giữa
- Intern: Giao diện tập trung, dashboard hiển thị nhiệm vụ ngay

## Cấu trúc Thư mục

```
.
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── main.py
│   ├── seed.py
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── README.md
└── README.md
```

## Hướng dẫn Phát triển Tiếp

### 1. Hoàn thiện Backend APIs
Bổ sung các endpoints còn thiếu trong `backend/app/api/v1/endpoints/`:
- `evaluations.py` - Đánh giá TTS
- `statistics.py` - Thống kê và báo cáo
- `uploads.py` - Upload files

### 2. Xây dựng Frontend Pages
Tạo các pages còn thiếu trong `frontend/src/pages/`:
- Admin: `UsersList.tsx`, `UserForm.tsx`
- HR: `BatchesList.tsx`, `BatchForm.tsx`, `InternsList.tsx`, `ImportExcel.tsx`, `Statistics.tsx`
- Mentor: `TasksList.tsx`, `TaskForm.tsx`, `EvaluationForm.tsx`
- Intern: `TasksList.tsx`, `TaskDetail.tsx`, `EvaluationView.tsx`

### 3. Implement API Calls
Sử dụng React Query trong `frontend/src/hooks/`:
- `useUsers.ts`, `useBatches.ts`, `useTasks.ts`, etc.

### 4. Add UI Components
Bổ sung Shadcn components cần thiết:
- Dialog, Select, Tabs, Toast, Table, Form, etc.

### 5. Testing
- Backend: Add pytest tests
- Frontend: Add Vitest + React Testing Library

## Deployment

### Backend
```bash
# Using Gunicorn
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend
```bash
npm run build
# Deploy dist/ folder to CDN hoặc static hosting
```

## License

MIT

## Contributors

Senior Full-stack Developer & UI/UX Designer

---

**Lưu ý**: Đây là version MVP (Minimum Viable Product). Hệ thống cần được phát triển thêm các tính năng nâng cao như file upload, email notifications, advanced statistics, và testing trước khi đưa vào production.
