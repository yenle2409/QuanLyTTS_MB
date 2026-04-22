import { type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getCurrentUser, logout } from '@/lib/auth'
import {
  LayoutDashboard, Users, Calendar, ClipboardList,
  BarChart3, LogOut, CalendarDays, CalendarOff, ShieldCheck,
  FileText, BookOpen, MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MenuItem {
  icon: React.ElementType
  label: string
  tab?: string   // for tab-based dashboards
  path?: string  // for route-based nav
  badge?: number
}

interface DashboardLayoutProps {
  children: ReactNode
  role: 'admin' | 'hr' | 'mentor' | 'intern'
  // tab-based navigation props (optional)
  activeTab?: string
  onTabChange?: (tab: string) => void
  pendingLeaveCount?: number
}

function MBBankLogo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="44" height="44" rx="8" fill="white"/>
        <path d="M22 6 L24.9 14.6 L34 14.6 L26.9 19.8 L29.8 28.4 L22 23.2 L14.2 28.4 L17.1 19.8 L10 14.6 L19.1 14.6 Z" fill="#E8002D"/>
        <rect x="6" y="33" width="32" height="5" rx="2.5" fill="#003087"/>
        <text x="22" y="37.5" textAnchor="middle" fill="white" fontSize="5" fontWeight="bold" fontFamily="Arial, sans-serif">MB BANK</text>
      </svg>
      <div className="leading-tight">
        <div className="text-white font-black text-xl tracking-widest">MB</div>
        <div className="text-white/55 text-[9px] tracking-[0.25em] font-medium uppercase">Military Bank</div>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children, role, activeTab, onTabChange, pendingLeaveCount = 0,
}: DashboardLayoutProps) {
  const user = getCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => { logout(); navigate('/login') }

  // ── Menu definitions per role ──────────────────────────────────────────────
  const getMenuItems = (): MenuItem[] => {
    switch (role) {
      case 'admin':
        return [
          { icon: LayoutDashboard, label: 'Dashboard',           path: '/admin' },
          { icon: ShieldCheck,     label: 'Quản lý người dùng',  path: '/admin/users' },
        ]
      case 'hr':
        return [
          { icon: LayoutDashboard, label: 'Tổng quan',           tab: 'overview'    },
          { icon: Calendar,        label: 'Đợt thực tập',        tab: 'batches'     },
          { icon: Users,           label: 'Thực tập sinh',       tab: 'interns'     },
          { icon: ClipboardList,   label: 'Giám sát nhiệm vụ',   tab: 'tasks'       },
          { icon: CalendarDays,    label: 'Lịch thực tập',       tab: 'schedule'    },
          { icon: CalendarOff,     label: 'Đơn xin nghỉ',        tab: 'leaves',     badge: pendingLeaveCount },
          { icon: BarChart3,       label: 'Thống kê',            tab: 'statistics'  },
        ]
      case 'mentor':
        return [
          { icon: ClipboardList,   label: 'Nhiệm vụ',            tab: 'tasks'       },
          { icon: Users,           label: 'TTS phụ trách',       tab: 'interns'     },
          { icon: CalendarDays,    label: 'Lịch thực tập',       tab: 'schedule'    },
          { icon: BarChart3,       label: 'Feedback tuần',       tab: 'feedback'    },
          { icon: ShieldCheck,     label: 'Đánh giá',            tab: 'evaluations' },
        ]
      case 'intern':
        return [
          { icon: LayoutDashboard, label: 'Tổng quan',        tab: 'home'       }, 
          { icon: ClipboardList,   label: 'Nhiệm vụ của tôi',    tab: 'tasks'       },
          { icon: CalendarDays,    label: 'Lịch thực tập',       tab: 'calendar'    },
          { icon: FileText,        label: 'Tài liệu',            tab: 'documents'   },
          { icon: BookOpen,        label: 'Nhật ký',             tab: 'logbook'     },
          { icon: MessageSquare,   label: 'Feedback tuần',       tab: 'feedback'    },
          { icon: BarChart3,       label: 'Kết quả đánh giá',    tab: 'evaluation'  },
          { icon: LayoutDashboard, label: 'Hồ sơ',               tab: 'profile'     },
        ]
      default:
        return []
    }
  }

  const menuItems = getMenuItems()

  const roleLabel = { admin: 'Quản trị viên', hr: 'Nhân sự', mentor: 'Mentor', intern: 'Thực tập sinh' }[role]

  const handleMenuClick = (item: MenuItem) => {
    if (item.tab && onTabChange) {
      onTabChange(item.tab)
    } else if (item.path) {
      navigate(item.path)
    }
  }

  const isActive = (item: MenuItem) => {
    if (item.tab) return activeTab === item.tab
    return location.pathname === item.path
  }

  // page title from active menu item
  const pageTitle = menuItems.find(m => isActive(m))?.label || 'Dashboard'

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#e2e8f0' }}>
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-white flex flex-col">
        <div className="px-5 py-4 border-b border-primary-foreground/10 space-y-2">
          <MBBankLogo />
          <div className="ml-1 mt-1">
            <p className="text-[10px] text-primary-foreground/50 leading-none">Hệ thống Quản lý Thực tập</p>
            <span className="inline-block mt-1.5 text-[11px] bg-white/15 text-white/80 rounded px-2 py-0.5">
              {roleLabel}
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <button
                key={item.tab ?? item.path}
                onClick={() => handleMenuClick(item)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-left ${
                  active
                    ? 'bg-white text-primary'
                    : 'text-primary-foreground hover:bg-primary-foreground/10'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </span>
                {item.badge && item.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-primary-foreground/10">
          <div className="flex items-center space-x-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold">
                {user?.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-primary-foreground/60 truncate">{user?.email}</p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="ghost" className="w-full text-white hover:bg-primary-foreground/10">
            <LogOut className="w-4 h-4 mr-2" />Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-800">{pageTitle}</h2>
            <span className="text-sm text-gray-600">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6" style={{ backgroundColor: '#e2e8f0' }}>
          {children}
        </main>
      </div>
    </div>
  )
}