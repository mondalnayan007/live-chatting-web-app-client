import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MoreVertical, Ban, Paperclip, Smile, Send, Search, X, Check, Edit3, Trash2 } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import Avatar from '../ui/Avatar';

function ChatWorkspace({
  user,
  selectedUser,
  setSelectedUser,
  setProfileUser,
  chatHistory,
  typingUsers,
  activeMenuMsgId,
  setActiveMenuMsgId,
  dropdownPosition,
  setDropdownPosition,
  editingMsgId,
  setEditingMsgId,
  editText,
  setEditText,
  message,
  setMessage,
  handleInputChange,
  handleSendMessage,
  showPicker,
  setShowPicker,
  activeTab,
  setActiveTab,
  gifs,
  gifSearch,
  setGifSearch,
  loadingGifs,
  handleGifSelect,
  onEmojiClick,
  handleFileShare,
  fileInputRef,
  showBlockPopup,
  setShowBlockPopup,
  handleBlockToggle,
  handleMessageReaction,
  handleEditSubmit,
  handleUnsendForEveryone,
  handleRemoveForMe,
  amIBlockingHim,
  isHeBlockingMe,
  renderMessageContent,
  renderTickIndicator,
  toggleActionMenu,
  messagesEndRef,
}) {
  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-slate-950 to-slate-900/50 relative">
        <div className="max-w-md p-8 bg-slate-900/20 border border-slate-800/50 rounded-3xl flex flex-col items-center backdrop-blur-md shadow-2xl relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 shadow-lg shadow-indigo-950/50">
            <Send size={32} />
          </div>
          <h2 className="text-xl font-bold mb-2 bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">Hello, {user.name}! 👋</h2>
          <p className="text-xs text-slate-400 max-w-[280px] leading-relaxed">Select an active profile from the sidebar directory to start exchanging messages securely.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 md:relative w-full md:w-[calc(100%-350px)] lg:w-[calc(100%-380px)] flex flex-col bg-slate-950/40 backdrop-blur-md z-40 md:z-auto flex text-slate-200">
      <div className="p-4 border-b border-slate-900/60 flex items-center justify-between bg-slate-950/60 backdrop-blur-lg shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-900/60 border border-slate-800 rounded-xl md:hidden text-slate-300 cursor-pointer"><ArrowLeft size={18} /></button>
          <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setProfileUser(selectedUser)}>
            <Avatar targetUser={selectedUser} sizeClass="w-10 h-10" isActive />
            <div className="min-w-0">
              <h2 className="font-bold leading-none text-slate-100 truncate text-sm sm:text-base">{selectedUser.name}</h2>
              {typingUsers[selectedUser.name] && !isHeBlockingMe(selectedUser.name) ? (
                <p className="text-[10px] text-emerald-400 font-semibold uppercase mt-1 animate-pulse tracking-wide">Typing...</p>
              ) : (
                <p className="text-[10px] text-emerald-500 font-medium uppercase mt-1 tracking-wide flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block status-indicator-glow animate-pulse"></span>Active Now</p>
              )}
            </div>
          </div>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setShowBlockPopup(!showBlockPopup)} className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition duration-200 cursor-pointer"><MoreVertical size={18} /></button>
          <AnimatePresence>
            {showBlockPopup && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowBlockPopup(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} className="absolute right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl p-1.5 z-50 shadow-2xl min-w-[140px]">
                  <button type="button" onClick={() => { handleBlockToggle(); setShowBlockPopup(false); }} className={`w-full text-left text-xs p-2.5 rounded-lg flex items-center gap-2 font-medium transition duration-150 cursor-pointer ${amIBlockingHim(selectedUser.name) ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-rose-400 hover:bg-rose-500/10'}`}><Ban size={14} /><span>{amIBlockingHim(selectedUser.name) ? 'Unblock User' : 'Block User'}</span></button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative min-h-0 bg-slate-950/20 scroll-smooth">
        {(chatHistory[selectedUser.name] || []).map((msg, idx) => {
          const isMyMsg = msg.type === 'outgoing';
          const currentMsgId = msg.id || `fallback-${idx}`;
          const isEditingThis = editingMsgId === currentMsgId;
          const isMenuOpen = activeMenuMsgId === currentMsgId;

          return (
            <motion.div
              key={currentMsgId}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`flex w-full items-end gap-2 msg-action-container ${isMyMsg ? 'justify-end' : 'justify-start'}`}
            >
              {!isMyMsg && !msg.isUnsent && (
                <button onClick={(e) => toggleActionMenu(e, currentMsgId)} className="p-1 text-slate-500 hover:text-slate-300 md:opacity-100 order-1 transition duration-150 cursor-pointer"><MoreVertical size={14} /></button>
              )}
              <div className={`relative max-w-[75%] group flex flex-col ${isMyMsg ? 'items-end' : 'items-start'}`}>
                {isEditingThis ? (
                  <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex items-center gap-2 shadow-2xl">
                    <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} className="bg-slate-950 text-xs p-2 px-3 rounded-xl border border-slate-800 outline-none text-white w-full focus:border-indigo-500" />
                    <button onClick={() => handleEditSubmit(currentMsgId)} className="p-1.5 bg-indigo-600 rounded-xl text-white hover:bg-indigo-500 transition duration-150 cursor-pointer"><Check size={12} /></button>
                    <button onClick={() => setEditingMsgId(null)} className="p-1.5 bg-slate-800 rounded-xl text-slate-300 hover:bg-slate-700 transition duration-150 cursor-pointer"><X size={12} /></button>
                  </div>
                ) : (
                  <div className="flex flex-col relative group pb-1">
                    {!msg.isUnsent && (
                      <div className={`absolute z-50 flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-full shadow-2xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200 ease-out ${dropdownPosition === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${isMyMsg ? 'right-0' : 'left-0'}`} style={{ transformOrigin: dropdownPosition === 'top' ? 'bottom' : 'top' }}>
                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                          <button key={emoji} type="button" onClick={(e) => { e.stopPropagation(); handleMessageReaction(currentMsgId, emoji); }} className="hover:scale-125 active:scale-95 transition-transform text-sm px-1 cursor-pointer">{emoji}</button>
                        ))}
                      </div>
                    )}

                    <div onClick={(e) => !msg.isUnsent && toggleActionMenu(e, currentMsgId)} className={`p-3.5 px-4 rounded-2xl text-sm shadow-md cursor-pointer relative transition-all duration-200 ${isMyMsg ? 'message-bubble-outgoing rounded-tr-none text-white' : 'message-bubble-incoming rounded-tl-none text-slate-100'}`}>
                      {renderMessageContent(msg)}
                      {msg.reaction && <div className={`absolute -bottom-2.5 ${isMyMsg ? 'left-3' : 'right-3'} bg-slate-850 border border-slate-700 rounded-full px-2 py-0.5 text-[10px] shadow-md select-none z-10 animate-slide-up-fade`}>{msg.reaction}</div>}
                    </div>

                    {!msg.isUnsent && (
                      <div className={`flex items-center mt-1 text-[9px] text-slate-500 font-medium ${isMyMsg ? 'justify-end' : 'justify-start'} ${msg.reaction ? 'pt-2' : ''}`}>
                        <span>{msg.time}</span>
                        {isMyMsg && renderTickIndicator(msg)}
                      </div>
                    )}
                  </div>
                )}
                <AnimatePresence>
                  {isMenuOpen && !isEditingThis && (
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -5 }} className={`absolute bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-xl p-1 z-50 flex flex-col min-w-[130px] shadow-2xl ${isMyMsg ? 'right-0' : 'left-0'} ${dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                      {isMyMsg && (!msg.fileType || msg.fileType === 'text') && <button onClick={() => { setEditingMsgId(currentMsgId); setEditText(msg.text); setActiveMenuMsgId(null); }} className="flex items-center gap-2 text-xs p-2 text-slate-300 hover:bg-slate-800 rounded-lg transition duration-150 cursor-pointer"><Edit3 size={12} /> Edit</button>}
                      {isMyMsg && <button onClick={() => handleUnsendForEveryone(currentMsgId)} className="flex items-center gap-2 text-xs p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition duration-150 cursor-pointer"><Ban size={12} /> Unsend</button>}
                      <button onClick={() => handleRemoveForMe(currentMsgId)} className="flex items-center gap-2 text-xs p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition duration-150 cursor-pointer"><Trash2 size={12} /> Remove</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {isMyMsg && !msg.isUnsent && (
                <button onClick={(e) => toggleActionMenu(e, currentMsgId)} className="p-1 text-slate-500 hover:text-slate-300 transition duration-150 cursor-pointer"><MoreVertical size={14} /></button>
              )}
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 sm:p-4 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md shrink-0 relative z-30">
        {amIBlockingHim(selectedUser.name) ? (
          <div className="bg-rose-950/20 border border-rose-900/40 p-3.5 rounded-2xl text-center text-xs text-rose-400 font-medium">You have blocked this profile. Unblock to chat.</div>
        ) : isHeBlockingMe(selectedUser.name) ? (
          <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl text-center text-xs text-slate-500 font-medium">Sending restricted. You can no longer reply to this conversation.</div>
        ) : (
          <>
            <AnimatePresence>
              {showPicker && (
                <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} className="absolute bottom-20 left-2 right-2 sm:left-4 z-50 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 max-w-[310px] flex flex-col overflow-hidden shadow-2xl animate-slide-up-fade">
                  <div className="flex bg-slate-950 p-2 border-b border-slate-800/80">
                    <button type="button" onClick={() => setActiveTab('emoji')} className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${activeTab === 'emoji' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Emojis</button>
                    <button type="button" onClick={() => setActiveTab('gif')} className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${activeTab === 'gif' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>GIFs</button>
                  </div>
                  <div className="p-2 bg-slate-900">
                    {activeTab === 'emoji' && <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} width="100%" height={230} skinTonesDisabled searchDisabled />}
                    {activeTab === 'gif' && (
                      <div>
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 rounded-xl p-2 mb-2"><Search size={14} className="text-slate-400" /><input type="text" placeholder="Search GIFs..." value={gifSearch} onChange={(e) => setGifSearch(e.target.value)} className="bg-transparent text-xs outline-none w-full text-white" /></div>
                        <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">{gifs.map((url, i) => <img key={i} src={url} alt="gif" onClick={() => handleGifSelect(url)} className="w-full h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition" />)}</div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <input type="file" ref={fileInputRef} onChange={handleFileShare} accept="image/*,video/*" className="hidden" />
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
              <button type="button" onClick={() => setShowPicker(!showPicker)} className="p-3.5 bg-slate-900 border border-slate-800/80 rounded-2xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition duration-150 cursor-pointer"><Smile size={18} /></button>
              <button type="button" onClick={() => fileInputRef.current.click()} className="p-3.5 bg-slate-900 border border-slate-800/80 rounded-2xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition duration-150 cursor-pointer"><Paperclip size={18} /></button>
              <input type="text" value={message} onChange={handleInputChange} placeholder="Type a message..." className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 px-4 text-sm outline-none text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition duration-150" />
              <button type="submit" className="p-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl shadow-lg transition duration-150 active:scale-95 cursor-pointer"><Send size={16} /></button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default ChatWorkspace;
export { ChatWorkspace };
