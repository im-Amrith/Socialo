import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { 
  Ticket, AlertCircle, Clock, CheckCircle2, MoreHorizontal, Filter, Search 
} from 'lucide-react'
import { format, addDays, formatDistanceToNow, isPast, isToday } from 'date-fns'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function AdminDashboard() {
  const { dbUser } = useAuthStore()
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    if (dbUser?.role === 'ADMIN') {
      fetchComplaints()
    }
  }, [dbUser])

  const getSessionToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const fetchComplaints = async () => {
    try {
      const token = await getSessionToken()
      const res = await fetch(`${API_BASE}/api/complaints`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setComplaints(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const calculateSLA = (complaint: any) => {
    const due = complaint.due_date ? new Date(complaint.due_date) : addDays(new Date(complaint.created_at), 3)
    const overdue = isPast(due) && complaint.status !== 'RESOLVED'
    const dueToday = isToday(due) && complaint.status !== 'RESOLVED'
    return { due, overdue, dueToday }
  }

  const filteredComplaints = complaints.filter(c => {
    if (filterCategory && c.category !== filterCategory) return false;
    if (filterStatus && c.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTicket = (c.ticket_number || '').toLowerCase().includes(q) || strToInt(c.id).includes(q);
      const matchesTitle = (c.title || '').toLowerCase().includes(q);
      if (!matchesTicket && !matchesTitle) return false;
    }
    return true;
  }).sort((a, b) => {
    const slaA = calculateSLA(a);
    const slaB = calculateSLA(b);
    
    // Always float open & overdue tickets to the very top, regardless of date sorting
    const aIsOverdue = slaA.overdue ? 1 : 0;
    const bIsOverdue = slaB.overdue ? 1 : 0;
    
    if (aIsOverdue !== bIsOverdue) {
      return bIsOverdue - aIsOverdue; // 1 before 0
    }
    
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const stats = {
    total: complaints.length,
    open: complaints.filter(c => c.status === 'OPEN').length,
    inProgress: complaints.filter(c => c.status === 'IN_PROGRESS').length,
    resolved: complaints.filter(c => c.status === 'RESOLVED').length,
    overdue: complaints.filter(c => calculateSLA(c).overdue).length,
    dueToday: complaints.filter(c => calculateSLA(c).dueToday).length,
    byCategory: complaints.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  }

  const getPriorityColor = (priority: string) => {
    if (priority === 'HIGH') return 'bg-red-100 text-red-700'
    if (priority === 'MEDIUM') return 'bg-orange-100 text-orange-700'
    return 'bg-green-100 text-green-700'
  }

  const getStatusColor = (status: string, isOverdue: boolean) => {
    if (status === 'RESOLVED') return 'bg-gray-100 text-gray-700'
    if (isOverdue) return 'bg-red-100 text-red-700'
    if (status === 'IN_PROGRESS') return 'bg-[#FDF8E1] text-amber-800'
    return 'bg-[#FDF8E1] text-amber-800' // Open
  }

  const getStatusText = (status: string, isOverdue: boolean) => {
    if (status === 'RESOLVED') return 'Resolved'
    if (isOverdue) return 'Overdue'
    if (status === 'IN_PROGRESS') return 'In Progress'
    return 'Open'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-amber-950">Ticket Queue</h2>
          <p className="text-amber-800/80 text-sm mt-1">Manage and track all maintenance requests</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-amber-800/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-amber-900/10 rounded-lg bg-white/50 focus:bg-white focus:ring-2 focus:ring-amber-200 outline-none transition-all text-sm w-48 lg:w-64" 
            />
          </div>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-white border border-amber-900/10 rounded-lg text-amber-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
          >
            <option value="">All Categories</option>
            <option value="PLUMBING">Plumbing</option>
            <option value="ELECTRICAL">Electrical</option>
            <option value="CARPENTRY">Carpentry</option>
            <option value="CLEANING">Cleaning</option>
            <option value="SECURITY">Security</option>
            <option value="OTHER">Other</option>
          </select>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-amber-900/10 rounded-lg text-amber-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-white border border-amber-900/10 rounded-lg text-amber-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
        <div className="bg-[#FDF8E1] border border-amber-900/10 rounded-2xl p-5 flex flex-col items-center text-center justify-center relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2 text-amber-800/70 text-sm font-semibold">
            <Ticket className="w-4 h-4" /> Total
          </div>
          <div className="text-3xl font-bold text-amber-950">{stats.total}</div>
        </div>
        <div className="bg-white border border-amber-900/10 rounded-2xl p-5 flex flex-col items-center text-center justify-center">
          <div className="flex items-center gap-2 mb-2 text-amber-800/70 text-sm font-semibold">
            <AlertCircle className="w-4 h-4" /> Open
          </div>
          <div className="text-3xl font-bold text-amber-950">{stats.open}</div>
        </div>
        <div className="bg-white border border-amber-900/10 rounded-2xl p-5 flex flex-col items-center text-center justify-center">
          <div className="flex items-center gap-2 mb-2 text-amber-800/70 text-sm font-semibold">
            <div className="w-4 h-4 rounded-full border-2 border-dashed border-amber-400 animate-spin-slow"></div> In Progress
          </div>
          <div className="text-3xl font-bold text-amber-950">{stats.inProgress}</div>
        </div>
        <div className="bg-[#F6FAF6] border border-emerald-900/10 rounded-2xl p-5 flex flex-col items-center text-center justify-center">
          <div className="flex items-center gap-2 mb-2 text-emerald-800/70 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Resolved
          </div>
          <div className="text-3xl font-bold text-emerald-950">{stats.resolved}</div>
        </div>
        <div className="bg-[#FEF5F2] border border-red-900/10 rounded-2xl p-5 flex flex-col items-center text-center justify-center">
          <div className="flex items-center gap-2 mb-2 text-red-800/70 text-sm font-semibold">
            <AlertCircle className="w-4 h-4" /> Overdue
          </div>
          <div className="text-3xl font-bold text-red-950">{stats.overdue}</div>
        </div>
        <div className="bg-white border border-amber-900/10 rounded-2xl p-5 flex flex-col items-center text-center justify-center">
          <div className="flex items-center gap-2 mb-2 text-amber-800/70 text-sm font-semibold">
            <Clock className="w-4 h-4" /> Due Today
          </div>
          <div className="text-3xl font-bold text-amber-950">{stats.dueToday}</div>
        </div>
      </div>

      {/* Category Stats */}
      <div className="bg-white border border-amber-900/10 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-sm">
        <div className="font-semibold text-amber-950 flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-700"/> By Category:
        </div>
        {Object.entries(stats.byCategory).map(([cat, count]) => (
          <div key={cat} className="flex items-center gap-1.5 px-3 py-1 bg-[#FDF8E1] text-amber-900 rounded-full border border-amber-900/5">
            <span className="opacity-70 font-medium">{cat}:</span>
            <span className="font-bold">{count}</span>
          </div>
        ))}
        {Object.keys(stats.byCategory).length === 0 && (
          <span className="text-amber-800/50">No complaints yet</span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-amber-900/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-amber-900/5 text-xs font-semibold text-amber-800/60">
                <th className="py-4 px-6 font-medium">Ticket ID</th>
                <th className="py-4 px-6 font-medium">Resident</th>
                <th className="py-4 px-6 font-medium">Category</th>
                <th className="py-4 px-6 font-medium">Priority</th>
                <th className="py-4 px-6 font-medium">Status</th>
                <th className="py-4 px-6 font-medium">SLA Due</th>
                <th className="py-4 px-6 font-medium">Assigned To</th>
                <th className="py-4 px-6 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-amber-800/60">Loading...</td>
                </tr>
              ) : filteredComplaints.map((complaint, i) => {
                const { due, overdue } = calculateSLA(complaint)
                const isOverdueAndOpen = overdue && complaint.status !== 'RESOLVED'
                const rowBg = isOverdueAndOpen ? 'bg-orange-50/30 hover:bg-orange-50' : 'bg-white hover:bg-amber-50/30'
                
                return (
                  <tr 
                    key={complaint.id} 
                    onClick={() => navigate(`/tickets/${complaint.id}`)}
                    className={`${rowBg} border-b border-amber-900/5 transition-colors group cursor-pointer`}
                  >
                    <td className="py-4 px-6 text-sm font-bold text-amber-950">
                      {complaint.ticket_number || `#T-${strToInt(complaint.id)}`}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-amber-900/10 flex items-center justify-center bg-[#FDF8E1] text-amber-700">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-amber-950">{complaint.resident?.name || complaint.resident?.email}</div>
                          <div className="text-xs text-amber-800/60">{complaint.flat_number || complaint.resident?.flat_number || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-amber-900 font-medium">
                        {/* Icon mapped by category ideally, using generic for now */}
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                        {complaint.category}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${getPriorityColor(complaint.priority)}`}>
                        {complaint.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${getStatusColor(complaint.status, isOverdueAndOpen)}`}>
                        {getStatusText(complaint.status, isOverdueAndOpen)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-amber-950 font-medium">{format(due, 'MMM dd, hh:mm a')}</div>
                      {complaint.status !== 'RESOLVED' && (
                        <div className={`text-xs mt-0.5 ${isOverdueAndOpen ? 'text-red-600 font-semibold' : 'text-amber-800/60'}`}>
                          {isOverdueAndOpen ? `${formatDistanceToNow(due)} overdue` : `In ${formatDistanceToNow(due)}`}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-[10px] font-bold">
                           {complaint.assigned_tech_name ? complaint.assigned_tech_name[0] : '-'}
                         </div>
                         <div>
                            <div className="text-sm font-semibold text-amber-950">{complaint.assigned_tech_name || '—'}</div>
                            <div className="text-xs text-amber-800/60">{complaint.assigned_tech_role || 'Unassigned'}</div>
                         </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button className="p-2 text-amber-800 hover:bg-amber-100 rounded-lg transition-colors border border-transparent hover:border-amber-200">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          <div className="p-4 border-t border-amber-900/5 flex items-center justify-between text-sm text-amber-800/60">
            <div>Showing 1 to {complaints.length} of {stats.total} tickets</div>
            <div className="flex gap-1">
              <button className="px-3 py-1 rounded-md border border-amber-900/10 hover:bg-amber-50">&lt;</button>
              <button className="px-3 py-1 rounded-md bg-[#FDE29F] text-amber-950 font-bold">1</button>
              <button className="px-3 py-1 rounded-md border border-amber-900/10 hover:bg-amber-50">2</button>
              <button className="px-3 py-1 rounded-md border border-amber-900/10 hover:bg-amber-50">&gt;</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function UserIcon({ className }: { className: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}

function strToInt(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash).toString().substring(0, 4);
}
