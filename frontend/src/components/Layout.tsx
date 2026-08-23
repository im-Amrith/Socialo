import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  FileEdit, 
  Users, 
  Ticket, 
  Bell, 
  HeadphonesIcon,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Menu
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()
  const { user, dbUser, signOut } = useAuthStore()
  const navigate = useNavigate()

  const isAdmin = dbUser?.role === 'ADMIN'

  const navItems = isAdmin ? [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Tickets', path: '/admin/tickets', icon: Ticket },
    { name: 'Community Board', path: '/admin/community', icon: Users },
  ] : [
    { name: 'My Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Submit Ticket', path: '/submit-ticket', icon: FileEdit },
    { name: 'Community Board', path: '/community', icon: Users },
  ]

  const topTabs = isAdmin ? [
    { name: 'Ticket Queue', path: '/admin' },
    { name: 'Overdue SLA', path: '/admin/overdue' },
    { name: 'Analytics', path: '/admin/analytics' },
  ] : [
    { name: 'My Dashboard', path: '/' },
    { name: 'Submit Ticket', path: '/submit-ticket' },
    { name: 'Community Board', path: '/community' },
  ]

  return (
    <div className="flex h-[100dvh] bg-[#FDF8E1] overflow-hidden text-amber-950">
      {/* Sidebar */}
      <aside 
        className={`hidden md:flex bg-[#FDF8E1] border-r border-amber-900/10 transition-all duration-300 flex-col ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-xl">
            <LayoutDashboard className="w-6 h-6 text-amber-700" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-lg leading-tight text-amber-900">Socialo</h1>
            </div>
          )}
        </div>

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute left-[calc(var(--sidebar-width)-12px)] top-8 bg-white border border-amber-200 rounded-full p-1 shadow-sm hover:bg-amber-50 z-10 hidden"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link 
                key={item.name} 
                to={item.path}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${isActive ? 'bg-amber-100/60 font-semibold text-amber-900' : 'text-amber-800 hover:bg-amber-50'}`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-amber-700' : 'text-amber-700/70'}`} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {!isCollapsed ? (
          <div className="p-4 mx-4 mb-6 bg-white/60 border border-amber-900/5 rounded-2xl">
            <div className="flex gap-3 items-start">
              <div className="bg-amber-100 p-2 rounded-full mt-1">
                <HeadphonesIcon className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-amber-900">Need Help?</h4>
                <p className="text-xs text-amber-800/70 mt-0.5 leading-relaxed">Our support team is here for you.</p>
                <button className="mt-3 w-full py-2 bg-amber-200 text-amber-900 text-xs font-bold rounded-lg hover:bg-amber-300 transition-colors">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 mb-6 flex justify-center">
            <button className="bg-amber-100 p-3 rounded-full hover:bg-amber-200" title="Contact Support">
              <HeadphonesIcon className="w-5 h-5 text-amber-700" />
            </button>
          </div>
        )}
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 md:h-20 bg-white/50 backdrop-blur-md border-b border-amber-900/5 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:block p-2 bg-white rounded-lg border border-amber-100 hover:bg-amber-50 transition-colors mr-4"
            >
              <Menu className="w-5 h-5 text-amber-900" />
            </button>
            
            <div className="hidden md:flex gap-2 h-full items-end -mb-0.5">
              {topTabs.map(tab => {
                const isActive = location.pathname === tab.path;
                return (
                  <Link
                    key={tab.name}
                    to={tab.path}
                    className={`px-6 py-4 text-sm font-bold rounded-t-2xl flex items-center gap-2 transition-colors ${isActive ? 'bg-[#FDF8E1] text-amber-950 border-t border-l border-r border-amber-900/10' : 'text-amber-800/70 hover:text-amber-900 hover:bg-amber-50/50'}`}
                  >
                    {tab.name === 'My Dashboard' && <LayoutDashboard className="w-4 h-4" />}
                    {tab.name === 'Submit Ticket' && <FileEdit className="w-4 h-4" />}
                    {tab.name === 'Community Board' && <Users className="w-4 h-4" />}
                    {tab.name}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-amber-800 hover:text-amber-900 p-2">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-orange-400 rounded-full border-2 border-white box-content"></span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center overflow-hidden border border-amber-300">
                <UserIcon className="w-5 h-5 text-amber-700" />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs text-amber-800/70 font-medium">Hello,</p>
                <p className="text-sm font-bold text-amber-950">{user?.email?.split('@')[0] || 'Resident'}</p>
              </div>
              <button onClick={() => { signOut(); navigate('/login'); }} className="ml-2 p-1.5 text-amber-700 hover:bg-amber-100 rounded-md transition-colors" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-amber-900/10 flex justify-around p-3 pb-safe z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
          return (
            <Link 
              key={item.name} 
              to={item.path} 
              className={`flex flex-col items-center gap-1 min-w-[70px] ${isActive ? 'text-amber-700' : 'text-amber-800/50'}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-0.5">{item.name === 'Community Board' ? 'Community' : item.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
