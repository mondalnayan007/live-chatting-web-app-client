import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Settings, ShieldAlert, Key } from 'lucide-react';
import Avatar from '../ui/Avatar';

function UsersSidebar({
  user,
  activeUsers,
  selectedUser,
  setSelectedUser,
  setProfileUser,
  handleLogout,
  unreadCounts,
  typingUsers,
  genderFilter,
  setGenderFilter,
  countryFilter,
  setCountryFilter,
  amIBlockingHim,
  isHeBlockingMe,
  isoCountries,
  showSettingsMenu,
  setShowSettingsMenu,
  setShowTermsPopup,
}) {
  return (
    <div className={`w-full md:w-[350px] lg:w-[380px] border-r border-slate-900/60 flex flex-col bg-slate-950/70 backdrop-blur-xl h-full relative z-20 shrink-0 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
      <div className="p-4 border-b border-slate-900/60 flex justify-between items-center shrink-0 bg-slate-900/20">
        <button onClick={() => setProfileUser(user)} className="flex items-center gap-3 p-1.5 rounded-2xl text-left hover:bg-slate-800/40 transition duration-200 cursor-pointer">
          <Avatar targetUser={user} sizeClass="w-9 h-9" />
          <div>
            <p className="text-xs font-bold leading-none flex items-center gap-1.5 text-slate-200">
              {user.name}
              {user.isGuest ? (
                <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-semibold tracking-wider uppercase">Guest</span>
              ) : (
                <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-semibold tracking-wider uppercase">Pro</span>
              )}
            </p>
            <p className="text-[9px] text-slate-400 mt-1">View Profile</p>
          </div>
        </button>
        <button onClick={handleLogout} className="text-slate-400 hover:text-rose-400 p-2 hover:bg-rose-500/10 rounded-xl transition duration-200 cursor-pointer"><LogOut size={18} /></button>
      </div>

      <div className="p-3 bg-slate-950/20 border-b border-slate-900/60 grid grid-cols-2 gap-2 shrink-0">
        <div className="relative">
          <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="w-full bg-slate-900/60 border border-slate-800 text-[11px] rounded-xl p-2.5 text-slate-200 outline-none focus:border-indigo-500/40 appearance-none cursor-pointer">
            <option value="All" className="bg-slate-900">All Genders</option>
            <option value="Male" className="bg-slate-900">Male</option>
            <option value="Female" className="bg-slate-900">Female</option>
          </select>
        </div>
        <div className="relative">
          <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="w-full bg-slate-900/60 border border-slate-800 text-[11px] rounded-xl p-2.5 text-slate-200 outline-none focus:border-indigo-500/40 appearance-none cursor-pointer">
            <option value="All" className="bg-slate-900">All Countries</option>
            {isoCountries.map((c, i) => <option key={i} value={c} className="bg-slate-900">{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0">
        {activeUsers.filter(u => (genderFilter === 'All' || u.gender === genderFilter) && (countryFilter === 'All' || u.country === countryFilter)).map(u => {
          const count = unreadCounts[u.name] || 0;
          const userIsTyping = typingUsers[u.name] || false;
          const isSelected = selectedUser?.name === u.name;
          return (
            <div
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={`p-3 rounded-2xl cursor-pointer flex items-center justify-between transition-all duration-300 border ${isSelected ? 'bg-indigo-600/10 border-indigo-500/50 shadow-md shadow-indigo-950/20' : 'bg-slate-900/15 border-slate-900/30 hover:bg-slate-800/15 hover:border-slate-800/40'}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div onClick={(e) => { e.stopPropagation(); setProfileUser(u); }} className="shrink-0">
                  <Avatar targetUser={u} sizeClass="w-10 h-10" isActive />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold truncate flex items-center gap-2 text-slate-200">
                    {u.name}
                    {amIBlockingHim(u.name) && (
                      <span className="text-[9px] bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/20 font-medium">Blocked</span>
                    )}
                  </h3>
                  {userIsTyping && !isHeBlockingMe(u.name) ? (
                    <p className="text-[11px] text-emerald-400 font-medium animate-pulse">typing...</p>
                  ) : (
                    <p className="text-[10px] text-slate-400 truncate">{u.country} • {u.gender}</p>
                  )}
                </div>
              </div>
              {count > 0 && (
                <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/25 animate-pulse">
                  {count}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3.5 border-t border-slate-900/60 bg-slate-950/50 relative shrink-0">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="flex items-center gap-2 p-2 rounded-xl text-slate-400 hover:text-slate-200 transition duration-200 text-xs hover:bg-slate-800/40 cursor-pointer">
            <Settings size={16} />
            <span>Settings Panel</span>
          </button>
          <div className="text-[10px] text-slate-500 font-medium select-none">Made with ❤️ by <span className="text-slate-400 font-semibold">NAYAN</span></div>
        </div>
        <AnimatePresence>
          {showSettingsMenu && (
            <motion.div initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.98 }} className="absolute bottom-14 left-3 right-3 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl p-1.5 z-50 flex flex-col shadow-2xl">
              <button type="button" onClick={() => window.alert('Security Active.')} className="w-full text-left text-xs p-2 text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 transition duration-150 cursor-pointer"><Key size={14} /> Verification</button>
              <button type="button" onClick={() => { setShowTermsPopup(true); setShowSettingsMenu(false); }} className="w-full text-left text-xs p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg flex items-center gap-2 transition duration-150 cursor-pointer"><ShieldAlert size={14} /> Terms & Conditions</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default UsersSidebar;
export { UsersSidebar };
