import { motion, AnimatePresence } from 'framer-motion';

export default function TermsModal({ showTermsPopup, setAcceptedTermsLogin, setShowTermsPopup }) {
  return (
    <AnimatePresence>
      {showTermsPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999999] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-900/90 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative z-10">
            <h3 className="font-bold text-base mb-3 text-slate-100">Terms & Conditions</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">By interacting with this anonymous channel, you agree to follow absolute end-to-end community messaging compliance policies. Abuse, harassment, and toxic messaging will lead to a permanent ban.</p>
            <button type="button" onClick={() => { setAcceptedTermsLogin(true); setShowTermsPopup(false); }} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 py-3 rounded-2xl text-xs font-semibold text-white shadow-lg active:scale-98 transition duration-150 cursor-pointer">Accept & Close</button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
