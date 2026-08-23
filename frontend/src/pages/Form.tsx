import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Send, UploadCloud, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default function Form() {
  const navigate = useNavigate()
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('OTHER')
  const [priority, setPriority] = useState('MEDIUM')
  const [flatNumber, setFlatNumber] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const getSessionToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      let finalPhotoUrl = photoUrl;
      const token = await getSessionToken()
      
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        
        // Request signed URL from backend (bypasses RLS)
        const signRes = await fetch(`${API_BASE}/api/upload/sign?file_extension=${fileExt}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!signRes.ok) {
           console.error("Upload error: Failed to get signed URL");
           alert("Failed to upload image.");
        } else {
           const signData = await signRes.json();
           const uploadUrl = signData.signed_url || signData.signedUrl || signData.url;
           
           // Upload directly using PUT
           const uploadRes = await fetch(uploadUrl, {
             method: 'PUT',
             body: photoFile,
             headers: {
               'Content-Type': photoFile.type
             }
           });
           
           if (!uploadRes.ok) {
             console.error("Upload error: Failed to put to signed URL");
             alert("Failed to upload image.");
           } else {
             // Retrieve the public URL
             const { data: publicUrlData } = supabase.storage.from('complaint-photos').getPublicUrl(signData.path);
             finalPhotoUrl = publicUrlData.publicUrl;
           }
        }
      }

      const res = await fetch(`${API_BASE}/api/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title, description, category, priority, photo_url: finalPhotoUrl, flat_number: flatNumber
        })
      })
      if (res.ok) {
        navigate('/tickets')
      } else {
        const errorData = await res.json();
        console.error("Submission failed:", errorData);
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-amber-900/10 relative overflow-hidden">
        
        <div className="max-w-xl relative z-10 mb-10">
          <h2 className="text-3xl font-serif font-bold text-amber-950 mb-3">Submit a Maintenance Ticket</h2>
          <p className="text-amber-800/80 text-sm leading-relaxed">Let us know what needs attention. Our team will take care of the rest.</p>
        </div>

        <img 
          src="/header_illustration.jpg" 
          alt="Illustration" 
          className="absolute rounded-bl-[15px] right-0 top-0 h-40 w-auto object-cover opacity-70 mix-blend-multiply"
        />

        <form onSubmit={handleCreateComplaint} className="relative z-10 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-amber-950 mb-2">Category</label>
              <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full p-3 border border-amber-900/10 rounded-xl bg-[#FDF8E1]/30 focus:bg-white focus:ring-2 focus:ring-amber-200 outline-none transition-all text-sm text-amber-950">
                <option>PLUMBING</option>
                <option>ELECTRICAL</option>
                <option>ELEVATOR</option>
                <option>SECURITY</option>
                <option>CLEANING</option>
                <option>GARDENING</option>
                <option>OTHER</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-amber-950 mb-2">Priority</label>
              <select value={priority} onChange={e=>setPriority(e.target.value)} className="w-full p-3 border border-amber-900/10 rounded-xl bg-[#FDF8E1]/30 focus:bg-white focus:ring-2 focus:ring-amber-200 outline-none transition-all text-sm text-amber-950">
                <option>LOW</option>
                <option>MEDIUM</option>
                <option>HIGH</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-amber-950 mb-2">Flat Number</label>
              <input required value={flatNumber} onChange={e=>setFlatNumber(e.target.value)} className="w-full p-3 border border-amber-900/10 rounded-xl bg-[#FDF8E1]/30 focus:bg-white focus:ring-2 focus:ring-amber-200 outline-none transition-all text-sm text-amber-950" placeholder="e.g. A-1204" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-amber-950 mb-2">Subject</label>
              <input required value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-3 border border-amber-900/10 rounded-xl bg-[#FDF8E1]/30 focus:bg-white focus:ring-2 focus:ring-amber-200 outline-none transition-all text-sm text-amber-950" placeholder="Briefly describe the issue" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-950 mb-2">Description</label>
            <textarea required value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-3 border border-amber-900/10 rounded-xl bg-[#FDF8E1]/30 focus:bg-white focus:ring-2 focus:ring-amber-200 outline-none transition-all h-32 resize-none text-sm text-amber-950" placeholder="Provide additional details about the problem..." />
          </div>

          <div>
            <label className="block text-sm font-semibold text-amber-950 mb-2">Upload Photos <span className="text-amber-800/60 font-normal">(Optional)</span></label>
            <div className="border-2 border-dashed border-amber-200 bg-[#FDF8E1]/30 hover:bg-[#FDF8E1]/50 transition-colors rounded-2xl p-8 text-center relative group cursor-pointer">
              <input 
                type="file" 
                accept="image/*" 
                onChange={e => setPhotoFile(e.target.files ? e.target.files[0] : null)} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="bg-amber-100 p-3 rounded-full text-amber-600 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-amber-950 mt-2">
                  Drag and drop photos here <br/>
                  <span className="text-orange-500">or click to browse</span>
                </p>
                <p className="text-xs text-amber-800/60 mt-1">JPG, PNG up to 5MB each</p>
                {photoFile && <p className="text-sm font-bold text-emerald-600 mt-2">Selected: {photoFile.name}</p>}
              </div>
            </div>
            
            <div className="mt-4 flex gap-4 items-center">
               <input value={photoUrl} onChange={e=>setPhotoUrl(e.target.value)} className="flex-1 p-3 border border-amber-900/10 rounded-xl bg-[#FDF8E1]/30 focus:bg-white focus:ring-2 focus:ring-amber-200 outline-none transition-all text-xs text-amber-950" placeholder="Or paste image URL instead..." />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-amber-800/80 font-medium">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            Your information is kept secure and used only for maintenance purposes.
          </div>

          <button disabled={submitting} type="submit" className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#FDE29F] hover:bg-[#FCD882] text-amber-950 font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 w-full md:w-auto">
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>
      </div>
    </div>
  )
}
