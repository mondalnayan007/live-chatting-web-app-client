import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Avatar from '../ui/Avatar';

export default function ProfileModal({ profileUser, setProfileUser }) {
  return (
    <AnimatePresence>
      {profileUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-99999 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="bg-slate-900/95 border border-slate-800/80 w-full max-w-sm rounded-3xl overflow-hidden text-center pb-8 shadow-2xl relative z-10">
            <button onClick={() => setProfileUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition duration-150 cursor-pointer"><X size={18} /></button>
            <div className="h-24 bg-linear-to-r from-indigo-600 to-violet-600"></div>
            <div className="flex justify-center -mt-10 mb-4">
              <div className="ring-4 ring-slate-900 rounded-full shadow-2xl">
                <Avatar targetUser={profileUser} sizeClass="w-20 h-20" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">{profileUser.name}</h2>
            <p className="text-xs font-medium text-indigo-400 px-3 py-1 bg-indigo-500/10 rounded-full inline-block border border-indigo-500/20">{profileUser.gender} • {profileUser.age} Yrs • {profileUser.country}</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
