import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';

export default function LoginForm({
  formData,
  setFormData,
  acceptedTermsLogin,
  setAcceptedTermsLogin,
  handleImageUpload,
  handleGuestLogin,
  handleGoogleLoginSuccess,
  isoCountries,
  setShowTermsPopup,
}) {
  return (
    <div className="absolute inset-0 bg-slate-950 flex items-center justify-center p-4 z-50 overflow-y-auto w-full h-full">
      <div className="bg-glow-orb-1" />
      <div className="bg-glow-orb-2" />

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-8 rounded-3xl w-full max-w-md border border-slate-800 shadow-2xl relative z-10 backdrop-blur-xl">
        <h2 className="text-2xl font-extrabold text-center mb-1 bg-gradient-to-r from-indigo-200 via-slate-100 to-indigo-100 bg-clip-text text-transparent">Welcome to AuraChat</h2>
        <p className="text-xs text-slate-400 text-center mb-6">Choose how you want to join the channel</p>

        <form onSubmit={handleGuestLogin} className="space-y-4">
          <div className="flex flex-col items-center mb-4">
            <div className="relative cursor-pointer group">
              <div className="w-20 h-20 rounded-full glass-panel border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden transition duration-300 group-hover:border-indigo-500/50">
                {formData.profilePic ? <img src={formData.profilePic} className="w-full h-full object-cover" alt="preview" /> : <Camera className="text-slate-500 group-hover:text-indigo-400 transition" size={24} />}
              </div>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">(Avatar optional for guest)</p>
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-bold tracking-wide">Nickname <span className="text-rose-500">*</span></label>
            <input type="text" placeholder="e.g. JohnDeo" className="w-full glass-input rounded-xl p-3 mt-1.5 outline-none text-white text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20" onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold tracking-wide">Age <span className="text-rose-500">*</span></label>
              <input type="number" placeholder="Required" className="w-full glass-input rounded-xl p-3 mt-1.5 outline-none text-white text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20" onChange={e => setFormData({ ...formData, age: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold tracking-wide">Gender</label>
              <select className="w-full glass-input rounded-xl p-3 mt-1.5 outline-none text-white text-sm focus:border-indigo-500/50 cursor-pointer" onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                <option value="Male" className="bg-slate-900">Male</option>
                <option value="Female" className="bg-slate-900">Female</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold tracking-wide">Country</label>
            <select value={formData.country} className="w-full glass-input rounded-xl p-3 mt-1.5 outline-none text-white text-sm focus:border-indigo-500/50 cursor-pointer" onChange={e => setFormData({ ...formData, country: e.target.value })}>
              {isoCountries.map((c, i) => <option key={i} value={c} className="bg-slate-900">{c}</option>)}
            </select>
          </div>

          <div className="flex items-start gap-2.5 pt-2">
            <input type="checkbox" id="terms" checked={acceptedTermsLogin} onChange={(e) => setAcceptedTermsLogin(e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer mt-0.5" />
            <label htmlFor="terms" className="text-xs text-slate-300 select-none">I agree to the <span onClick={() => setShowTermsPopup(true)} className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer font-semibold transition">Terms & Conditions</span></label>
          </div>

          <div className="space-y-4 pt-2">
            <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-indigo-950/50 transition duration-150 active:scale-95 text-white cursor-pointer">
              Login as Guest (Temporary)
            </button>

            <div className="flex items-center justify-center gap-3 my-2 text-slate-500 text-xs">
              <span className="h-[1px] w-full bg-slate-800" />
              <span className="font-semibold tracking-wide">OR</span>
              <span className="h-[1px] w-full bg-slate-800" />
            </div>

            <div className="w-full flex justify-center overflow-hidden custom-google-login shadow-md rounded-xl">
              <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onError={() => toast.error('Google Login Failed!')}
                theme="dark"
                size="large"
                width="384px"
                shape="pill"
              />
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
