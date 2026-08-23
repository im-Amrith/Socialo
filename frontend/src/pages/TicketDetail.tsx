import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { 
  ChevronLeft, Send, ClipboardCheck, User, PenTool, Check, MessageSquare
} from 'lucide-react'
import { format } from 'date-fns'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function TicketDetail() {
  const { id } = useParams()
  const [complaint, setComplaint] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchComplaint()
  }, [id])

  const getSessionToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const fetchComplaint = async () => {
    try {
      const token = await getSessionToken()
      const res = await fetch(`${API_BASE}/api/complaints/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setComplaint(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const { dbUser } = useAuthStore()
  const isAdmin = dbUser?.role === 'ADMIN'

  const [techName, setTechName] = useState('')
  const [techRole, setTechRole] = useState('')
  const [note, setNote] = useState('')
  const [dueDateInput, setDueDateInput] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (complaint) {
      setTechName(complaint.assigned_tech_name || '')
      setTechRole(complaint.assigned_tech_role || '')
      
      // format due_date for datetime-local input (YYYY-MM-DDTHH:mm)
      if (complaint.due_date) {
        const d = new Date(complaint.due_date)
        setDueDateInput(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
      }
    }
  }, [complaint])

  if (loading) {
    return <div className="text-amber-800 p-8">Loading ticket details...</div>
  }

  const handleAssign = async () => {
    setIsUpdating(true)
    try {
      const token = await getSessionToken()
      const res = await fetch(`${API_BASE}/api/complaints/${id}/assign`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tech_name: techName, tech_role: techRole })
      })
      if (res.ok) {
        fetchComplaint()
      }
    } catch (e) {
      console.error(e)
    }
    setIsUpdating(false)
  }

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      const token = await getSessionToken()
      const res = await fetch(`${API_BASE}/api/complaints/${id}/status?new_status=${newStatus}&note=${encodeURIComponent(note)}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        fetchComplaint()
        setNote('')
      }
    } catch (e) {
      console.error(e)
    }
    setIsUpdating(false)
  }

  const handlePriorityChange = async (newPriority: string) => {
    setIsUpdating(true)
    try {
      const token = await getSessionToken()
      const res = await fetch(`${API_BASE}/api/complaints/${id}/priority?new_priority=${newPriority}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        fetchComplaint()
      }
    } catch (e) {
      console.error(e)
    }
    setIsUpdating(false)
  }

  const handleDueDateChange = async (newDate: string) => {
    if (!newDate) return;
    setIsUpdating(true)
    try {
      const token = await getSessionToken()
      // format to ISO with UTC
      const isoDate = new Date(newDate).toISOString()
      const res = await fetch(`${API_BASE}/api/complaints/${id}/due_date?due_date=${encodeURIComponent(isoDate)}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        fetchComplaint()
      }
    } catch (e) {
      console.error(e)
    }
    setIsUpdating(false)
  }

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this complaint? This action cannot be undone.")) return;
    
    setIsUpdating(true)
    try {
      const token = await getSessionToken()
      const res = await fetch(`${API_BASE}/api/complaints/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        window.location.href = isAdmin ? '/admin' : '/tickets'
      } else {
        const err = await res.json()
        alert(`Error deleting complaint: ${err.detail || 'Unknown error'}`)
      }
    } catch (e) {
      console.error(e)
    }
    setIsUpdating(false)
  }

  if (!complaint) {
    return <div className="text-amber-800 p-8">Ticket not found.</div>
  }

  // Synthesize timeline events based on the complaint's history
  const timeline = []
  
  // 1. Submitted
  timeline.push({
    title: 'Complaint Submitted',
    description: 'Your complaint has been submitted successfully.',
    date: complaint.created_at,
    actorRole: 'Resident',
    actorName: complaint.resident?.name || complaint.resident?.email,
    icon: Send,
    iconColor: 'text-orange-600',
    iconBg: 'bg-orange-100',
    rowBg: 'bg-[#FEF5F2]'
  })

  // 2. Received (Implicit)
  timeline.push({
    title: 'Complaint Received',
    description: 'Your complaint has been received and is under review.',
    date: complaint.created_at, // Use same time roughly
    actorRole: 'Admin',
    actorName: 'System',
    icon: ClipboardCheck,
    iconColor: 'text-amber-600',
    iconBg: 'bg-[#FDE29F]',
    rowBg: 'bg-[#FDF8E1]'
  })

  // 3. Process History Events
  if (complaint.history && Array.isArray(complaint.history)) {
    complaint.history.forEach((h: any) => {
      if (h.note && h.note.includes('Assigned to')) {
        timeline.push({
          title: 'Assigned to Technician',
          description: `Your complaint has been ${h.note.toLowerCase()}.`,
          date: h.timestamp,
          actorRole: 'Admin',
          actorName: 'Maintenance Team',
          icon: User,
          iconColor: 'text-amber-800',
          iconBg: 'bg-[#EFE2D6]',
          rowBg: 'bg-[#FDF8E1]'
        })
      } else if (h.new_status === 'IN_PROGRESS') {
        timeline.push({
          title: 'Work In Progress',
          description: `${complaint.assigned_tech_name || 'A technician'} has started working on your issue.`,
          date: h.timestamp,
          actorRole: 'Technician',
          actorName: complaint.assigned_tech_name || 'Technician',
          icon: PenTool,
          iconColor: 'text-amber-700',
          iconBg: 'bg-[#FDE29F]',
          rowBg: 'bg-[#FDF8E1]'
        })
      } else if (h.new_status === 'RESOLVED') {
        timeline.push({
          title: 'Issue Resolved',
          description: `The issue has been fixed. ${h.note ? h.note : 'Please confirm if the issue is resolved.'}`,
          date: h.timestamp,
          actorRole: 'Technician',
          actorName: complaint.assigned_tech_name || 'Technician',
          icon: Check,
          iconColor: 'text-emerald-700',
          iconBg: 'bg-emerald-100',
          rowBg: 'bg-[#F6FAF6]'
        })
      }
    })
  }

  const isOwner = dbUser?.id === complaint.resident_id

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <Link to={isAdmin ? "/admin" : "/tickets"} className="inline-flex items-center text-sm font-semibold text-amber-800 hover:text-amber-950 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Tickets
        </Link>
        {(isAdmin || isOwner) && (
          <button 
            onClick={handleDelete}
            disabled={isUpdating}
            className="px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm rounded-lg border border-red-200 transition-colors"
          >
            Delete Ticket
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="bg-[#FDF8E1] rounded-2xl p-6 border border-amber-900/10 min-w-[200px] flex flex-col justify-center">
          <div className="w-12 h-12 bg-white rounded-xl border border-amber-900/10 flex items-center justify-center mb-4 text-amber-700">
            {/* Map icon based on category ideally, fallback for now */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="text-sm font-semibold text-amber-950/60 mb-1">Ticket ID</div>
          <div className="text-2xl font-bold text-amber-950">{complaint.ticket_number || '#T-UNKNOWN'}</div>
        </div>

        <div className="pt-2">
          <h1 className="text-3xl font-serif font-bold text-amber-950 mb-4">{complaint.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-amber-800/80">
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              {complaint.flat_number || complaint.resident?.flat_number || 'N/A'}
            </div>
            <div className="w-1 h-1 rounded-full bg-amber-900/30"></div>
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
              {complaint.category}
            </div>
            <div className="w-1 h-1 rounded-full bg-amber-900/30"></div>
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              Reported on {format(new Date(complaint.created_at), 'MMM dd, yyyy \\at hh:mm a')}
            </div>
          </div>

          <div className="mt-6 text-amber-950/90 leading-relaxed whitespace-pre-wrap">
            {complaint.description}
          </div>

          {complaint.photo_url && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-amber-950/60 mb-3">Attached Image</h3>
              <div className="rounded-xl overflow-hidden border border-amber-900/10 inline-block bg-white shadow-sm">
                <img 
                  src={complaint.photo_url} 
                  alt="Complaint attachment" 
                  className="max-w-full md:max-w-md max-h-[400px] w-auto object-contain" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {isAdmin && complaint.status === 'RESOLVED' && (
        <div className="mt-8 bg-[#F6FAF6] rounded-2xl border border-emerald-900/10 p-6 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-800">
            <h2 className="text-xl font-bold">This Ticket is Resolved</h2>
          </div>
          <p className="mt-2 text-emerald-900/70 text-sm">The issue has been marked as resolved and cannot be edited further.</p>
        </div>
      )}

      {isAdmin && complaint.status !== 'RESOLVED' && (
        <div className="mt-8 bg-white rounded-2xl border border-amber-900/10 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-amber-950 mb-4">Admin Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-amber-900">Assign Technician</h3>
              <input 
                type="text" 
                placeholder="Technician Name" 
                value={techName}
                onChange={(e) => setTechName(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-amber-900/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
              <input 
                type="text" 
                placeholder="Technician Role" 
                value={techRole}
                onChange={(e) => setTechRole(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-amber-900/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
              <button 
                onClick={handleAssign}
                disabled={isUpdating}
                className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-lg transition-colors"
              >
                {isUpdating ? 'Assigning...' : 'Assign Technician'}
              </button>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-amber-900">Update Status</h3>
              <textarea 
                placeholder="Add a note (optional)" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-amber-900/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none h-24"
              />
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleStatusChange('OPEN')}
                  disabled={isUpdating || complaint.status === 'OPEN'}
                  className="px-4 py-2 border border-amber-900/10 hover:bg-amber-50 disabled:opacity-50 text-amber-950 font-bold rounded-lg transition-colors"
                >
                  Mark Open
                </button>
                <button 
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  disabled={isUpdating || complaint.status === 'IN_PROGRESS'}
                  className="px-4 py-2 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 text-blue-950 font-bold rounded-lg transition-colors"
                >
                  In Progress
                </button>
                <button 
                  onClick={() => handleStatusChange('RESOLVED')}
                  disabled={isUpdating || complaint.status === 'RESOLVED'}
                  className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 disabled:opacity-50 text-emerald-950 font-bold rounded-lg transition-colors"
                >
                  Resolve
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-amber-900">Priority</h3>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => handlePriorityChange('LOW')}
                  disabled={isUpdating || complaint.priority === 'LOW'}
                  className={`px-4 py-2 border rounded-lg transition-colors font-bold ${
                    complaint.priority === 'LOW' 
                      ? 'bg-blue-100 border-blue-200 text-blue-800' 
                      : 'border-amber-900/10 text-amber-950 hover:bg-amber-50 disabled:opacity-50'
                  }`}
                >
                  Low Priority
                </button>
                <button 
                  onClick={() => handlePriorityChange('MEDIUM')}
                  disabled={isUpdating || complaint.priority === 'MEDIUM'}
                  className={`px-4 py-2 border rounded-lg transition-colors font-bold ${
                    complaint.priority === 'MEDIUM' 
                      ? 'bg-amber-100 border-amber-200 text-amber-800' 
                      : 'border-amber-900/10 text-amber-950 hover:bg-amber-50 disabled:opacity-50'
                  }`}
                >
                  Medium Priority
                </button>
                <button 
                  onClick={() => handlePriorityChange('HIGH')}
                  disabled={isUpdating || complaint.priority === 'HIGH'}
                  className={`px-4 py-2 border rounded-lg transition-colors font-bold ${
                    complaint.priority === 'HIGH' 
                      ? 'bg-red-100 border-red-200 text-red-800' 
                      : 'border-amber-900/10 text-amber-950 hover:bg-amber-50 disabled:opacity-50'
                  }`}
                >
                  High Priority
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-amber-900">SLA Due Date</h3>
              <input 
                type="datetime-local" 
                value={dueDateInput}
                onChange={(e) => setDueDateInput(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-amber-900/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
              <button 
                onClick={() => handleDueDateChange(dueDateInput)}
                disabled={isUpdating || !dueDateInput}
                className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-lg transition-colors w-full"
              >
                Update Due Date
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-bold text-amber-950 mb-2">Issue History</h2>
        <p className="text-amber-800/80 text-sm mb-8">Track the progress of your complaint</p>

        <div className="relative pl-8 space-y-6">
          {/* Vertical line connecting events */}
          <div className="absolute left-[31px] top-4 bottom-8 w-0.5 bg-amber-900/10"></div>

          {timeline.map((event, idx) => {
            const Icon = event.icon
            return (
              <div key={idx} className="relative flex items-start gap-8">
                {/* Date & Time */}
                <div className="w-24 text-right pt-2 shrink-0">
                  <div className="text-xs font-semibold text-amber-950/80">{format(new Date(event.date), 'MMM dd, yyyy')}</div>
                  <div className="text-xs text-amber-800/60 mt-0.5">{format(new Date(event.date), 'hh:mm a')}</div>
                </div>

                {/* Timeline Node */}
                <div className={`absolute left-[32px] top-3 -translate-x-1/2 w-10 h-10 rounded-full border-4 border-white ${event.iconBg} flex items-center justify-center z-10 shadow-sm`}>
                  <Icon className={`w-4 h-4 ${event.iconColor}`} />
                </div>

                {/* Event Card */}
                <div className={`flex-1 rounded-xl p-5 border border-amber-900/5 ${event.rowBg} flex justify-between items-center shadow-sm`}>
                  <div>
                    <h3 className="text-base font-bold text-amber-950 mb-1">{event.title}</h3>
                    <p className="text-sm text-amber-800/80 leading-relaxed">{event.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold text-amber-950/60 mb-0.5">{event.actorRole}</div>
                    <div className="text-sm font-semibold text-amber-950">{event.actorName}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-12 p-6 bg-[#FDF8E1] border border-amber-900/10 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-700 shadow-sm border border-amber-900/5">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-amber-950">Need help with this issue?</h3>
            <p className="text-sm text-amber-800/80 mt-1">Contact our support team if you have any questions.</p>
          </div>
        </div>
        <button className="px-6 py-2.5 bg-[#FDE29F] hover:bg-[#FCD372] text-amber-950 font-bold rounded-xl transition-colors shadow-sm">
          Contact Support
        </button>
      </div>
    </div>
  )
}
