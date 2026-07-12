import { User } from 'lucide-react';

export default function Avatar({ targetUser, sizeClass = 'w-10 h-10', isActive = false }) {
  if (!targetUser) {
    return <div className={`${sizeClass} rounded-full bg-slate-800 animate-pulse`} />;
  }

  const isFemale = targetUser.profilePic === 'ICON_FEMALE' || targetUser.gender === 'Female';
  const isCustomPic = targetUser.profilePic && targetUser.profilePic !== 'ICON_MALE' && targetUser.profilePic !== 'ICON_FEMALE';

  return (
    <div className="relative shrink-0 select-none">
      {isCustomPic ? (
        <img src={targetUser.profilePic} className={`${sizeClass} rounded-full object-cover border border-slate-800 shadow-md`} alt="avatar" />
      ) : (
        <div className={`${sizeClass} rounded-full flex items-center justify-center border ${isFemale ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'} p-1.5 shadow-md`}>
          <User className="w-full h-full" />
        </div>
      )}
      {isActive && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-slate-950 rounded-full status-indicator-glow animate-pulse" />
      )}
    </div>
  );
}
