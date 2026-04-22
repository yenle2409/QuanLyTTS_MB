# Backend - Hệ thống Quản lý Thực tập sinh

API Backend cho Hệ thống Quản lý Thực tập sinh Ngân hàng.

## Tech Stack

- **Framework**: FastAPI
- **Database**: SQLite (Development) / PostgreSQL (Production)
- **ORM**: SQLAlchemy
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Pydantic

## Cài đặt

### 1. Cài đặt dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Cấu hình môi trường

Sao chép file `.env.example` thành `.env`:

```bash
copy .env.example .env
```

### 3. Tạo database và seed data

```bash
python seed.py
```

### 4. Chạy server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server sẽ chạy tại: http://localhost:8000

API Documentation (Swagger): http://localhost:8000/docs

## Thông tin đăng nhập mẫu

### Admin
- Username: `admin`
- Password: `admin123`

### HR
- Username: `hr_user`
- Password: `hr123`

### Mentor
- Username: `mentor_a` hoặc `mentor_b`
- Password: `mentor123`

### Intern (Thực tập sinh)
- Username: `intern1`, `intern2`, `intern3`, `intern4`, `intern5`
- Password: `intern123`

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Đăng nhập
- `GET /api/v1/auth/me` - Lấy thông tin user hiện tại
- `POST /api/v1/auth/change-password` - Đổi mật khẩu

### Users (Admin only)
- `GET /api/v1/users` - Danh sách người dùng
- `POST /api/v1/users` - Tạo người dùng mới
- `GET /api/v1/users/{id}` - Chi tiết người dùng
- `PUT /api/v1/users/{id}` - Cập nhật người dùng
- `DELETE /api/v1/users/{id}` - Xóa người dùng
- `POST /api/v1/users/{id}/reset-password` - Reset mật khẩu

### Batches (Đợt thực tập)
- `GET /api/v1/batches` - Danh sách đợt thực tập
- `POST /api/v1/batches` - Tạo đợt mới (HR)
- `GET /api/v1/batches/{id}` - Chi tiết đợt
- `PUT /api/v1/batches/{id}` - Cập nhật đợt (HR)
- `DELETE /api/v1/batches/{id}` - Xóa đợt (HR)

### Profiles (Hồ sơ TTS)
- `GET /api/v1/profiles` - Danh sách hồ sơ
- `POST /api/v1/profiles` - Tạo hồ sơ (HR)
- `PUT /api/v1/profiles/{id}` - Cập nhật hồ sơ (HR)
- `POST /api/v1/profiles/import-excel` - Import từ Excel (HR)

### Tasks (Nhiệm vụ)
- `GET /api/v1/tasks` - Danh sách nhiệm vụ
- `POST /api/v1/tasks` - Tạo nhiệm vụ (Mentor)
- `GET /api/v1/tasks/{id}` - Chi tiết nhiệm vụ
- `PUT /api/v1/tasks/{id}` - Cập nhật nhiệm vụ (Mentor)
- `DELETE /api/v1/tasks/{id}` - Xóa nhiệm vụ (Mentor)
- `POST /api/v1/tasks/{id}/reports` - Nộp báo cáo (Intern)
- `GET /api/v1/tasks/{id}/reports` - Xem báo cáo
- `POST /api/v1/tasks/{id}/reports/{report_id}/comment` - Nhận xét (Mentor)
- `POST /api/v1/tasks/{id}/approve` - Duyệt nhiệm vụ (Mentor)
- `POST /api/v1/tasks/{id}/request-change` - Yêu cầu sửa (Mentor)

## Cấu trúc thư mục

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py
│   │       │   ├── users.py
│   │       │   ├── batches.py
│   │       │   ├── profiles.py
│   │       │   └── tasks.py
│   │       └── api.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── deps.py
│   ├── db/
│   │   └── base.py
│   ├── models/
│   │   ├── user.py
│   │   ├── intern_batch.py
│   │   ├── intern_profile.py
│   │   ├── task.py
│   │   ├── task_report.py
│   │   └── evaluation.py
│   ├── schemas/
│   │   ├── user.py
│   │   ├── intern_batch.py
│   │   ├── intern_profile.py
│   │   ├── task.py
│   │   ├── task_report.py
│   │   └── evaluation.py
│   └── main.py
├── seed.py
├── requirements.txt
└── .env.example
```
