import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [complaints, setComplaints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchComplaints()
    }
  }, [user])

  const getSessionToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const fetchComplaints = async () => {
    try {
      const token = await getSessionToken()
      const res = await fetch(`${API_BASE}/api/complaints`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  if (loading) {
    return <div className="text-amber-800">Loading your tickets...</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-serif font-bold text-amber-950">My Tickets</h2>
          <p className="text-amber-800/80 text-sm mt-1">Track the status of your maintenance requests.</p>
        </div>
      </div>

      <div className="space-y-4">
        {complaints.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-amber-900/10 shadow-sm">
            <h3 className="text-lg font-bold text-amber-950 mb-2">No tickets found</h3>
            <p className="text-amber-800/70 text-sm">Head over to the Submit Ticket tab to create one.</p>
          </div>
        ) : (
          complaints.map(complaint => (
            <Link to={`/tickets/${complaint.id}`} key={complaint.id} className="block p-6 bg-white border border-amber-900/10 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-200 group-hover:bg-amber-400 transition-colors"></div>
              <div className="flex justify-between items-start mb-2 pl-2">
                <h3 className="text-xl font-bold text-amber-950">{complaint.title}</h3>
                <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${complaint.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {complaint.status}
                </span>
              </div>
              <p className="text-amber-900/70 mb-4 pl-2 text-sm">{complaint.description}</p>
              
              <div className="mt-4 pt-4 border-t border-amber-900/5 flex flex-wrap gap-3 pl-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FDF8E1] text-amber-800 rounded-lg text-xs font-semibold">
                  Category: {complaint.category}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FDF8E1] text-amber-800 rounded-lg text-xs font-semibold">
                  Priority: {complaint.priority}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
