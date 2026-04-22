# HƯỚNG DẪN CHẠY HỆ THỐNG

Hướng dẫn chi tiết từng bước để chạy Hệ thống Quản lý Thực tập sinh Ngân hàng.

## 📋 Yêu cầu hệ thống

- **Python**: 3.9 trở lên
- **Node.js**: 18 trở lên
- **npm**: 9 trở lên

## 🚀 Bước 1: Cài đặt Backend

### 1.1. Di chuyển vào thư mục backend

```bash
cd backend
```

### 1.2. Cài đặt Python dependencies

```bash
pip install -r requirements.txt
```

### 1.3. Tạo database và seed data mẫu

```bash
python seed.py
```

Sau khi chạy xong, bạn sẽ thấy:
```
✅ Tạo dữ liệu mẫu thành công!

📋 Thông tin đăng nhập:
==================================================
Admin:
  Username: admin | Password: admin123

HR:
  Username: hr_user | Password: hr123

Mentor:
  Username: mentor_a | Password: mentor123
  Username: mentor_b | Password: mentor123

Intern:
  Username: intern1/intern2/intern3/intern4/intern5
  Password: intern123
==================================================
```

### 1.4. Chạy backend server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend đang chạy tại:
- API: http://localhost:8000
- API Documentation (Swagger): http://localhost:8000/docs

✅ **Backend đã sẵn sàng!**

---

## 🎨 Bước 2: Cài đặt Frontend

Mở terminal mới (giữ backend server đang chạy).

### 2.1. Di chuyển vào thư mục frontend

```bash
cd frontend
```

### 2.2. Cài đặt Node.js dependencies

```bash
npm install
```

Quá trình cài đặt có thể mất vài phút. Hãy chờ đợi cho đến khi hoàn tất.

### 2.3. Chạy frontend development server

```bash
npm run dev
```

Frontend đang chạy tại: http://localhost:5173

✅ **Frontend đã sẵn sàng!**

---

## 🎯 Bước 3: Truy cập và Đăng nhập

1. Mở trình duyệt và truy cập: http://localhost:5173

2. Bạn sẽ thấy trang Login

3. Đăng nhập với một trong các tài khoản sau:

### Tài khoản Admin
```
Username: admin
Password: admin123
```
- Quản lý tất cả người dùng trong hệ thống
- Phân quyền và reset mật khẩu

### Tài khoản HR
```
Username: hr_user
Password: hr123
```
- Quản lý đợt thực tập
- Quản lý hồ sơ thực tập sinh
- Import Excel
- Phân công Mentor
- Xem thống kê

### Tài khoản Mentor
```
Username: mentor_a  hoặc  mentor_b
Password: mentor123
```
- Xem danh sách TTS được phân công
- Tạo và giao nhiệm vụ
- Duyệt báo cáo của TTS
- Đánh giá TTS cuối kỳ

### Tài khoản Intern (Thực tập sinh)
```
Username: intern1  (hoặc intern2, intern3, intern4, intern5)
Password: intern123
```
- Xem nhiệm vụ được giao
- Nộp báo cáo nhiệm vụ
- Xem kết quả đánh giá

---

## 🔍 Bước 4: Khám phá Hệ thống

### Với tài khoản Admin
1. Đăng nhập với `admin/admin123`
2. Xem Dashboard với thống kê tổng quan
3. Navigated bên trái để quản lý người dùng

### Với tài khoản HR
1. Đăng nhập với `hr_user/hr123`
2. Xem Dashboard với thống kê TTS và nhiệm vụ
3. Truy cập các menu: Đợt thực tập, Thực tập sinh, Giám sát, Thống kê

### Với tài khoản Mentor
1. Đăng nhập với `mentor_a/mentor123`
2. Xem Dashboard với số liệu TTS và task
3. Truy cập menu để quản lý TTS, tạo task, đánh giá

### Với tài khoản Intern
1. Đăng nhập với `intern1/intern123`
2. Xem Dashboard với nhiệm vụ sắp đến hạn
3. Truy cập "Nhiệm vụ của tôi" để xem chi tiết

---

## 📚 API Documentation

Backend cung cấp API documentation tự động với Swagger UI:

Truy cập: http://localhost:8000/docs

Tại đây bạn có thể:
- Xem tất cả API endpoints
- Test API trực tiếp
- Xem request/response schemas

---

## ⚠️ Khắc phục sự cố

### Backend không chạy được

**Lỗi: ModuleNotFoundError**
```bash
# Đảm bảo đã cài đặt dependencies
pip install -r requirements.txt
```

**Lỗi: Database locked**
```bash
# Xóa database và tạo lại
rm internship_management.db
python seed.py
```

### Frontend không chạy được

**Lỗi: Cannot find module**
```bash
# Xóa node_modules và cài lại
rm -rf node_modules
npm install
```

**Lỗi: Port 5173 đã được sử dụng**
```bash
# Dừng process đang dùng port hoặc dùng port khác
npm run dev -- --port 5174
```

### Không kết nối được Backend và Frontend

1. Đảm bảo Backend đang chạy ở port 8000
2. Kiểm tra Vite config trong `frontend/vite.config.ts`
3. Kiểm tra CORS settings trong `backend/app/core/config.py`

---

## 🛠️ Build Production

### Backend
```bash
cd backend
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Frontend
```bash
cd frontend
npm run build
# Kết quả build sẽ ở thư mục dist/
```

---

## 📝 Ghi chú

- **Database**: Hệ thống sử dụng SQLite cho development. Để dùng PostgreSQL cho production, cập nhật `DATABASE_URL` trong `.env`
- **Security**: Đổi `SECRET_KEY` trong `.env` trước khi deploy production
- **Seed Data**: Dữ liệu mẫu chỉ được tạo 1 lần. Nếu muốn reset, xóa file `internship_management.db` và chạy lại `python seed.py`

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra log của Backend và Frontend terminal
2. Xem API docs tại http://localhost:8000/docs
3. Đọc README.md trong thư mục backend/ và frontend/

---

**Chúc bạn thành công! 🎉**
