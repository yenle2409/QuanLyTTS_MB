import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/lib/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { user } = await login({ username, password })
      switch (user.role) {
        case 'admin': navigate('/admin'); break
        case 'hr': navigate('/hr'); break
        case 'mentor': navigate('/mentor'); break
        case 'intern': navigate('/intern'); break
        default: navigate('/')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Tên đăng nhập hoặc mật khẩu không đúng')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .mb-login-root {
          font-family: 'Be Vietnam Pro', sans-serif;
          min-height: 100vh;
          display: flex;
          background: #f0f4f8;
          overflow: hidden;
          position: relative;
        }

        /* Left panel */
        .mb-left {
          flex: 1.1;
          background: linear-gradient(150deg, #003087 0%, #001f5b 50%, #00113a 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 52px;
          position: relative;
          overflow: hidden;
        }

        .mb-left::before {
          content: '';
          position: absolute;
          top: -120px; right: -120px;
          width: 480px; height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,80,200,0.35) 0%, transparent 70%);
          pointer-events: none;
        }

        .mb-left::after {
          content: '';
          position: absolute;
          bottom: -80px; left: -80px;
          width: 360px; height: 360px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,160,255,0.18) 0%, transparent 70%);
          pointer-events: none;
        }

        .mb-grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        .mb-logo-area {
          display: flex;
          align-items: center;
          gap: 14px;
          z-index: 1;
        }

        .mb-logo-icon {
          width: 48px; height: 48px;
          background: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .mb-logo-text {
          display: flex;
          flex-direction: column;
        }

        .mb-logo-name {
          font-size: 22px;
          font-weight: 800;
          color: white;
          letter-spacing: 0.5px;
          line-height: 1;
        }

        .mb-logo-sub {
          font-size: 11px;
          font-weight: 400;
          color: rgba(255,255,255,0.6);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-top: 3px;
        }

        .mb-hero-content {
          z-index: 1;
        }

        .mb-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 100px;
          padding: 6px 14px;
          margin-bottom: 28px;
        }

        .mb-hero-badge span {
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.85);
          letter-spacing: 0.5px;
        }

        .mb-hero-badge-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #4dd8ff;
          box-shadow: 0 0 8px #4dd8ff;
        }

        .mb-hero-title {
          font-size: 38px;
          font-weight: 800;
          color: white;
          line-height: 1.2;
          letter-spacing: -0.5px;
          margin-bottom: 16px;
        }

        .mb-hero-title span {
          color: #4dd8ff;
        }

        .mb-hero-desc {
          font-size: 15px;
          font-weight: 400;
          color: rgba(255,255,255,0.6);
          line-height: 1.7;
          max-width: 340px;
        }

        .mb-features {
          display: flex;
          flex-direction: column;
          gap: 14px;
          z-index: 1;
        }

        .mb-feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mb-feature-icon {
          width: 36px; height: 36px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .mb-feature-text {
          font-size: 13px;
          font-weight: 400;
          color: rgba(255,255,255,0.65);
        }

        /* Right panel */
        .mb-right {
          flex: 0.9;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
          background: #f0f4f8;
          position: relative;
        }

        .mb-card {
          width: 100%;
          max-width: 400px;
          background: white;
          border-radius: 24px;
          padding: 44px 40px;
          box-shadow:
            0 0 0 1px rgba(0,48,135,0.06),
            0 8px 40px rgba(0,48,135,0.1),
            0 2px 8px rgba(0,0,0,0.04);
          animation: cardFadeIn 0.5s ease forwards;
        }

        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .mb-card-header {
          text-align: center;
          margin-bottom: 36px;
        }

        .mb-card-icon {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, #003087 0%, #0050c8 100%);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          box-shadow: 0 8px 24px rgba(0,48,135,0.3);
        }

        .mb-card-title {
          font-size: 22px;
          font-weight: 700;
          color: #001f5b;
          margin-bottom: 6px;
          line-height: 1.2;
        }

        .mb-card-sub {
          font-size: 13.5px;
          color: #8899aa;
          font-weight: 400;
        }

        .mb-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }

        .mb-divider-line {
          flex: 1;
          height: 1px;
          background: #e8edf4;
        }

        .mb-divider-text {
          font-size: 11px;
          font-weight: 500;
          color: #aab8c8;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        /* Form */
        .mb-form { display: flex; flex-direction: column; gap: 20px; }

        .mb-field { display: flex; flex-direction: column; gap: 7px; }

        .mb-label {
          font-size: 13px;
          font-weight: 600;
          color: #334466;
          letter-spacing: 0.2px;
        }

        .mb-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .mb-input-icon {
          position: absolute;
          left: 14px;
          color: #8899aa;
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .mb-input {
          width: 100%;
          height: 48px;
          padding: 0 44px;
          border: 1.5px solid #dde5ef;
          border-radius: 12px;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          color: #001f5b;
          background: #f8fafd;
          transition: all 0.2s;
          outline: none;
          -webkit-appearance: none;
        }

        .mb-input::placeholder { color: #b0bcc8; font-weight: 400; }

        .mb-input:focus {
          border-color: #003087;
          background: white;
          box-shadow: 0 0 0 3px rgba(0,48,135,0.08);
        }

        .mb-input-toggle {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          cursor: pointer;
          color: #8899aa;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 6px;
          transition: color 0.2s;
        }

        .mb-input-toggle:hover { color: #003087; }

        .mb-error {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #fff5f5;
          border: 1px solid #ffd0d0;
          border-radius: 10px;
          padding: 10px 14px;
          color: #cc2200;
          font-size: 13px;
          font-weight: 500;
          animation: errorShake 0.3s ease;
        }

        @keyframes errorShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .mb-btn {
          width: 100%;
          height: 50px;
          background: linear-gradient(135deg, #003087 0%, #0050c8 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-family: inherit;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.3px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 16px rgba(0,48,135,0.35);
          position: relative;
          overflow: hidden;
        }

        .mb-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .mb-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(0,48,135,0.45);
        }

        .mb-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(0,48,135,0.3);
        }

        .mb-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .mb-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .mb-demo-box {
          margin-top: 24px;
          padding: 14px 16px;
          background: #f5f8ff;
          border: 1px solid #dde8ff;
          border-radius: 12px;
        }

        .mb-demo-title {
          font-size: 11px;
          font-weight: 700;
          color: #003087;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .mb-demo-accounts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 16px;
        }

        .mb-demo-account {
          font-size: 11.5px;
          color: #556688;
          font-weight: 400;
        }

        .mb-demo-account strong {
          font-weight: 600;
          color: #003087;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .mb-left { display: none; }
          .mb-right { padding: 24px 20px; background: linear-gradient(150deg, #003087 0%, #001f5b 100%); }
          .mb-card { padding: 32px 24px; }
        }
      `}</style>

      <div className="mb-login-root">
        {/* Left decorative panel */}
        <div className="mb-left">
          <div className="mb-grid-overlay" />

          <div className="mb-logo-area">
            <div className="mb-logo-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="3" y="3" width="10" height="10" rx="2" fill="#003087"/>
                <rect x="15" y="3" width="10" height="10" rx="2" fill="#0050c8"/>
                <rect x="3" y="15" width="10" height="10" rx="2" fill="#0050c8"/>
                <rect x="15" y="15" width="10" height="10" rx="2" fill="#003087"/>
              </svg>
            </div>
            <div className="mb-logo-text">
              <span className="mb-logo-name">MB Bank</span>
              <span className="mb-logo-sub">Military Commercial Bank</span>
            </div>
          </div>

          <div className="mb-hero-content">
            <div className="mb-hero-badge">
              <div className="mb-hero-badge-dot" />
              <span>Hệ thống nội bộ</span>
            </div>
            <h1 className="mb-hero-title">
              Quản lý<br />
              <span>Thực tập sinh</span><br />
              MB Bank
            </h1>
            <p className="mb-hero-desc">
              Nền tảng quản lý toàn diện dành cho chương trình thực tập tại MB Bank — theo dõi tiến độ, đánh giá hiệu suất và phát triển nhân tài.
            </p>
          </div>

          <div className="mb-features">
            {[
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                ),
                text: 'Quản lý đa vai trò: Admin, HR, Mentor, Intern'
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                ),
                text: 'Theo dõi tiến độ và đánh giá hiệu suất'
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                ),
                text: 'Bảo mật cao, phân quyền chặt chẽ'
              },
            ].map((f, i) => (
              <div key={i} className="mb-feature-item">
                <div className="mb-feature-icon">{f.icon}</div>
                <span className="mb-feature-text">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right login panel */}
        <div className="mb-right">
          <div className="mb-card">
            <div className="mb-card-header">
              <div className="mb-card-icon">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h2 className="mb-card-title">Chào mừng trở lại</h2>
              <p className="mb-card-sub">Đăng nhập vào tài khoản của bạn</p>
            </div>

            <div className="mb-divider">
              <div className="mb-divider-line" />
              <span className="mb-divider-text">Thông tin đăng nhập</span>
              <div className="mb-divider-line" />
            </div>

            <form
              onSubmit={handleSubmit}
              className="mb-form"
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              <div className="mb-field">
                <label className="mb-label" htmlFor="username">Tên đăng nhập</label>
                <div className="mb-input-wrap">
                  <span className="mb-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input
                    id="username"
                    className="mb-input"
                    placeholder="Nhập tên đăng nhập"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="mb-field">
                <label className="mb-label" htmlFor="password">Mật khẩu</label>
                <div className="mb-input-wrap">
                  <span className="mb-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="password"
                    className="mb-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="mb-input-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-error">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink: 0, marginTop: '1px'}}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" className="mb-btn" disabled={loading}>
                {loading ? (
                  <>
                    <div className="mb-spinner" />
                    Đang xác thực...
                  </>
                ) : (
                  <>
                    Đăng nhập
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mb-demo-box">
              <div className="mb-demo-title">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Tài khoản demo
              </div>
              <div className="mb-demo-accounts">
                <span className="mb-demo-account"><strong>admin</strong> / admin123</span>
                <span className="mb-demo-account"><strong>hr_user</strong> / hr123</span>
                <span className="mb-demo-account"><strong>mentor_a</strong> / 111111</span>
                <span className="mb-demo-account"><strong>ht1</strong> / 111111</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}