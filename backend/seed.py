from sqlalchemy.orm import Session
from app.db.base import SessionLocal, Base, engine

# Import all models first to ensure relationships are properly set up
from app.models import (
    User, UserRole, UserStatus, Department,
    InternBatch, BatchStatus,
    InternProfile,
    Task, TaskStatus,
    TaskReport,
    Evaluation
)
from app.core.security import get_password_hash
from datetime import datetime, timedelta


def create_seed_data():
    # Create all tables first
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if data already exists
        if db.query(User).count() > 0:
            print("Dữ liệu đã tồn tại. Bỏ qua seed.")
            return

        print("Đang tạo dữ liệu mẫu...")

        # Create Admin
        admin = User(
            username="admin",
            password=get_password_hash("admin123"),
            full_name="Quản trị viên",
            email="admin@bank.vn",
            role=UserRole.ADMIN,
            phone="0901000000",
            status=UserStatus.ACTIVE
        )
        db.add(admin)

        # Create HR
        hr_user = User(
            username="hr_user",
            password=get_password_hash("hr123"),
            full_name="Nguyễn Văn HR",
            email="hr@bank.vn",
            role=UserRole.HR,
            phone="0902000000",
            status=UserStatus.ACTIVE
        )
        db.add(hr_user)

        # Create Mentors
        mentor_a = User(
            username="mentor_a",
            password=get_password_hash("mentor123"),
            full_name="Trần Thị Hoa",
            email="mentor.a@bank.vn",
            role=UserRole.MENTOR,
            phone="0903000000",
            department=Department.KHDN,
            status=UserStatus.ACTIVE
        )
        db.add(mentor_a)

        mentor_b = User(
            username="mentor_b",
            password=get_password_hash("mentor123"),
            full_name="Lê Văn Nam",
            email="mentor.b@bank.vn",
            role=UserRole.MENTOR,
            phone="0904000000",
            department=Department.KHCN,
            status=UserStatus.ACTIVE
        )
        db.add(mentor_b)

        db.flush()

        # Create Intern Batches
        batch_closed = InternBatch(
            batch_name="Đợt thực tập Q4-2024",
            start_date=datetime(2024, 10, 1).date(),
            end_date=datetime(2024, 12, 31).date(),
            status=BatchStatus.CLOSED,
            description="Đợt thực tập quý 4 năm 2024"
        )
        db.add(batch_closed)

        batch_open = InternBatch(
            batch_name="Đợt thực tập Q1-2025",
            start_date=datetime(2025, 1, 1).date(),
            end_date=datetime(2025, 3, 31).date(),
            status=BatchStatus.OPEN,
            description="Đợt thực tập quý 1 năm 2025"
        )
        db.add(batch_open)

        db.flush()

        # Create Interns
        interns_data = [
            {
                "username": "intern1",
                "full_name": "Nguyễn Văn An",
                "email": "an.nv@student.edu.vn",
                "phone": "0905000001",
                "mentor_id": mentor_a.id,
                "university": "Đại học Kinh tế TP.HCM",
                "gpa": 3.5
            },
            {
                "username": "intern2",
                "full_name": "Trần Thị Bình",
                "email": "binh.tt@student.edu.vn",
                "phone": "0905000002",
                "mentor_id": mentor_a.id,
                "university": "Đại học Ngân hàng TP.HCM",
                "gpa": 3.7
            },
            {
                "username": "intern3",
                "full_name": "Lê Văn Cường",
                "email": "cuong.lv@student.edu.vn",
                "phone": "0905000003",
                "mentor_id": mentor_a.id,
                "university": "Đại học Ngoại thương",
                "gpa": 3.3
            },
            {
                "username": "intern4",
                "full_name": "Phạm Thị Diễm",
                "email": "diem.pt@student.edu.vn",
                "phone": "0905000004",
                "mentor_id": mentor_b.id,
                "university": "Đại học Kinh tế Quốc dân",
                "gpa": 3.8
            },
            {
                "username": "intern5",
                "full_name": "Hoàng Văn Em",
                "email": "em.hv@student.edu.vn",
                "phone": "0905000005",
                "mentor_id": mentor_b.id,
                "university": "Đại học Bách Khoa",
                "gpa": 3.6
            }
        ]

        intern_users = []
        for intern_data in interns_data:
            mentor_id = intern_data.pop("mentor_id")
            university = intern_data.pop("university")
            gpa = intern_data.pop("gpa")

            intern_user = User(
                **intern_data,
                password=get_password_hash("intern123"),
                role=UserRole.INTERN,
                status=UserStatus.ACTIVE
            )
            db.add(intern_user)
            db.flush()

            # Create Intern Profile
            profile = InternProfile(
                user_id=intern_user.id,
                batch_id=batch_open.id,
                mentor_id=mentor_id,
                university=university,
                gpa=gpa
            )
            db.add(profile)

            intern_users.append(intern_user)

        db.flush()

        # Create sample tasks
        tasks_data = [
            {
                "title": "Tìm hiểu về sản phẩm tín dụng",
                "description": "Nghiên cứu và viết báo cáo về các loại sản phẩm tín dụng của ngân hàng",
                "mentor_id": mentor_a.id,
                "intern_id": intern_users[0].id,
                "batch_id": batch_open.id,
                "deadline": datetime.utcnow() + timedelta(days=7),
                "status": TaskStatus.NEW
            },
            {
                "title": "Phân tích dữ liệu khách hàng",
                "description": "Sử dụng Excel để phân tích dữ liệu khách hàng mẫu",
                "mentor_id": mentor_a.id,
                "intern_id": intern_users[1].id,
                "batch_id": batch_open.id,
                "deadline": datetime.utcnow() + timedelta(days=5),
                "status": TaskStatus.SUBMITTED
            },
            {
                "title": "Tìm hiểu quy trình mở tài khoản",
                "description": "Quan sát và ghi chép quy trình mở tài khoản cho khách hàng cá nhân",
                "mentor_id": mentor_a.id,
                "intern_id": intern_users[2].id,
                "batch_id": batch_open.id,
                "deadline": datetime.utcnow() - timedelta(days=2),
                "status": TaskStatus.OVERDUE
            },
            {
                "title": "Nghiên cứu về Digital Banking",
                "description": "Tìm hiểu về xu hướng Digital Banking và viết báo cáo",
                "mentor_id": mentor_b.id,
                "intern_id": intern_users[3].id,
                "batch_id": batch_open.id,
                "deadline": datetime.utcnow() + timedelta(days=10),
                "status": TaskStatus.APPROVED
            },
            {
                "title": "Tạo báo cáo tổng hợp",
                "description": "Tổng hợp dữ liệu và tạo báo cáo hàng tuần",
                "mentor_id": mentor_b.id,
                "intern_id": intern_users[4].id,
                "batch_id": batch_open.id,
                "deadline": datetime.utcnow() + timedelta(days=3),
                "status": TaskStatus.REQUEST_CHANGE
            }
        ]

        for task_data in tasks_data:
            task = Task(**task_data)
            db.add(task)

        db.commit()
        print("✅ Tạo dữ liệu mẫu thành công!")
        print("\n📋 Thông tin đăng nhập:")
        print("=" * 50)
        print("Admin:")
        print("  Username: admin | Password: admin123")
        print("\nHR:")
        print("  Username: hr_user | Password: hr123")
        print("\nMentor:")
        print("  Username: mentor_a | Password: mentor123")
        print("  Username: mentor_b | Password: mentor123")
        print("\nIntern:")
        print("  Username: intern1/intern2/intern3/intern4/intern5")
        print("  Password: intern123")
        print("=" * 50)

    except Exception as e:
        print(f"❌ Lỗi khi tạo dữ liệu mẫu: {str(e)}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_seed_data()
