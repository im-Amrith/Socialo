import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Search, Pin, Shield, Sparkles, AlertTriangle, Hammer, Calendar, Droplets, Banknote, UserCog, Megaphone, Trash2, X } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const CATEGORIES = [
  'Security', 'Housekeeping', 'General', 'Maintenance',
  'Events', 'Facilities', 'Accounts', 'Admin', 'Safety'
]

// Icon mapping
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Security': return Shield
    case 'Housekeeping': return Sparkles
    case 'Maintenance': return Hammer
    case 'Events': return Calendar
    case 'Facilities': return Droplets
    case 'Accounts': return Banknote
    case 'Admin': return UserCog
    case 'Safety': return AlertTriangle
    default: return Megaphone
  }
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Security': return 'text-amber-700 bg-amber-100'
    case 'Housekeeping': return 'text-orange-700 bg-orange-100'
    case 'Maintenance': return 'text-slate-700 bg-slate-100'
    case 'Events': return 'text-purple-700 bg-purple-100'
    case 'Facilities': return 'text-blue-700 bg-blue-100'
    case 'Accounts': return 'text-emerald-700 bg-emerald-100'
    case 'Admin': return 'text-indigo-700 bg-indigo-100'
    case 'Safety': return 'text-red-700 bg-red-100'
    default: return 'text-gray-700 bg-gray-100'
  }
}

export default function CommunityBoard() {
  const { dbUser } = useAuthStore()
  const isAdmin = dbUser?.role === 'ADMIN'
  
  const [notices, setNotices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    category: 'General',
    is_important: false
  })

  const getSessionToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  const fetchNotices = async () => {
    try {
      const token = await getSessionToken()
      const res = await fetch(`${API_BASE}/api/notices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setNotices(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotices()
  }, [])

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const token = await getSessionToken()
      const res = await fetch(`${API_BASE}/api/notices`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newNotice)
      })
      if (res.ok) {
        setShowModal(false)
        setNewNotice({ title: '', content: '', category: 'General', is_important: false })
        fetchNotices()
      } else {
        alert("Failed to create notice")
      }
    } catch (e) {
      console.error(e)
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this notice?")) return
    try {
      const token = await getSessionToken()
      const res = await fetch(`${API_BASE}/api/notices/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        fetchNotices()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredNotices = notices.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory ? n.category === filterCategory : true
    return matchesSearch && matchesCategory
  })

  const pinnedNotices = filteredNotices.filter(n => n.is_important)
  const regularNotices = filteredNotices.filter(n => !n.is_important)

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-amber-900/10 pb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-amber-950">Digital Notice Board</h1>
          <p className="text-amber-800/80 mt-1">Stay updated with the latest news, events and important notices from your community.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <button 
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-amber-900 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium flex items-center gap-2"
            >
              <Megaphone className="w-4 h-4" />
              Add Notice
            </button>
          )}
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-white border border-amber-900/10 rounded-lg text-amber-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 min-w-[150px]"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <div className="relative">
            <Search className="w-4 h-4 text-amber-800/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search announcements..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-amber-900/10 rounded-lg bg-white focus:ring-2 focus:ring-amber-200 outline-none transition-all text-sm w-48 md:w-64" 
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-amber-800/60 p-8 text-center">Loading notices...</div>
      ) : (
        <div className="space-y-12">
          {/* Pinned / Important Section */}
          {pinnedNotices.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-lg font-bold text-amber-950 mb-4">
                <Pin className="w-5 h-5 text-amber-700" />
                Pinned / Important
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pinnedNotices.map((notice) => {
                  const Icon = getCategoryIcon(notice.category)
                  return (
                    <div key={notice.id} className="relative bg-[#fef3c7] rounded-2xl p-6 shadow-sm border border-amber-200/50 flex flex-col hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-700">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md">
                            <Pin className="w-3 h-3" /> Important
                          </span>
                          {isAdmin && (
                            <button onClick={() => handleDelete(notice.id)} className="text-amber-900/40 hover:text-red-600 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h3 className="font-bold text-lg text-amber-950 mb-2">{notice.title}</h3>
                      <p className="text-amber-900/80 text-sm mb-6 flex-grow whitespace-pre-wrap">{notice.content}</p>
                      <div className="flex justify-between items-center text-xs text-amber-800/60 pt-4 border-t border-amber-900/10">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(notice.created_at), 'MMM dd, yyyy')}
                        </div>
                        <span className="font-medium">{notice.category} Team</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* All Announcements Section */}
          <section>
            <h2 className="text-lg font-bold text-amber-950 mb-4">All Announcements</h2>
            {regularNotices.length === 0 ? (
              <div className="text-amber-800/60 p-8 text-center bg-white/50 rounded-2xl border border-amber-900/5">
                No announcements found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularNotices.map((notice) => {
                  const Icon = getCategoryIcon(notice.category)
                  const colorClass = getCategoryColor(notice.category)
                  return (
                    <div key={notice.id} className="relative bg-white rounded-2xl p-6 shadow-sm border border-amber-900/5 flex flex-col hover:shadow-md transition-shadow group">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${colorClass} opacity-80`}>
                            {notice.category}
                          </span>
                          {isAdmin && (
                            <button onClick={() => handleDelete(notice.id)} className="text-amber-900/20 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h3 className="font-bold text-lg text-amber-950 mb-2">{notice.title}</h3>
                      <p className="text-amber-900/70 text-sm mb-6 flex-grow whitespace-pre-wrap">{notice.content}</p>
                      <div className="flex justify-between items-center text-xs text-amber-800/50 pt-4 border-t border-amber-900/5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(notice.created_at), 'MMM dd, yyyy')}
                        </div>
                        <span className="font-medium">{notice.category} Team</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Add Notice Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-amber-950/20 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-amber-900/10 flex justify-between items-center bg-[#FDF8E1]">
              <h2 className="font-bold text-amber-950">Add Community Notice</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-amber-900/10 rounded-full text-amber-950 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateNotice} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-1">Title</label>
                <input 
                  type="text" 
                  required
                  value={newNotice.title}
                  onChange={e => setNewNotice({...newNotice, title: e.target.value})}
                  className="w-full px-4 py-2 bg-amber-50/50 border border-amber-900/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200"
                  placeholder="e.g. Water Supply Interruption"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-1">Category</label>
                <select 
                  required
                  value={newNotice.category}
                  onChange={e => setNewNotice({...newNotice, category: e.target.value})}
                  className="w-full px-4 py-2 bg-amber-50/50 border border-amber-900/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-1">Content</label>
                <textarea 
                  required
                  rows={4}
                  value={newNotice.content}
                  onChange={e => setNewNotice({...newNotice, content: e.target.value})}
                  className="w-full px-4 py-2 bg-amber-50/50 border border-amber-900/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
                  placeholder="Details of the notice..."
                />
              </div>

              <label className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={newNotice.is_important}
                  onChange={e => setNewNotice({...newNotice, is_important: e.target.checked})}
                  className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="font-semibold text-amber-900 flex items-center gap-1"><Pin className="w-3 h-3"/> Pin to top (Important)</div>
                  <div className="text-xs text-amber-800/70">Highlight this notice and send a high-priority email.</div>
                </div>
              </label>
              
              <div className="pt-4 border-t border-amber-900/10 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-amber-900 hover:bg-amber-100 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-amber-900 text-white rounded-lg hover:bg-amber-800 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Posting...' : 'Post Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
