import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Send, LogOut, Bell, Loader2, ShieldUser, X, Camera, MessageSquare, Filter, ArrowLeft, Smile, Search, SmilePlus, Film, MoreVertical, Ban, CheckCircle, Paperclip, Trash2, Edit3, Check, Settings, ShieldAlert, Key, HelpCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import EmojiPicker, { Theme } from 'emoji-picker-react';

const isoCountries = ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bangladesh", "Belarus", "Belgium", "Brazil", "Canada", "China", "Denmark", "Egypt", "France", "Germany", "India", "Indonesia", "Italy", "Japan", "Malaysia", "Mexico", "Nepal", "Netherlands", "New Zealand", "Pakistan", "Philippines", "Russia", "Saudi Arabia", "Singapore", "Spain", "Sweden", "Switzerland", "Thailand", "Turkey", "UAE", "UK", "USA", "Vietnam"];

export default function App() {
  const socketRef = useRef(null);
  const popupRef = useRef(null);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null); 
  const settingsMenuRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('chat_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [activeUsers, setActiveUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(() => {
    const savedPartner = sessionStorage.getItem('active_chat_partner');
    return savedPartner ? JSON.parse(savedPartner) : null;
  });

  const [message, setMessage] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('emoji');
  const [showBlockMenu, setShowBlockMenu] = useState(false); 
  const [allBlocks, setAllBlocks] = useState({});

  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  
  const [formData, setFormData] = useState({ name: '', age: '', country: 'Bangladesh', gender: 'Male', profilePic: '' });
  const [isHydrating, setIsHydrating] = useState(true);
  const [profileUser, setProfileUser] = useState(null);
  const [genderFilter, setGenderFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');

  const [acceptedTermsLogin, setAcceptedTermsLogin] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);

  // টাইপিং স্টেটসমূহ
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});

  // মেসেজ অ্যাকশন স্টেটসমূহ
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState('bottom'); 
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');

  const [chatHistory, setChatHistory] = useState(() => {
    try {
      const savedChats = localStorage.getItem('global_chat_history_final');
      return savedChats ? JSON.parse(savedChats) : {};
    } catch (e) { return {}; }
  });
  
  const [unreadCounts, setUnreadCounts] = useState(() => {
    try {
      const savedCounts = localStorage.getItem('global_unread_counts');
      return savedCounts ? JSON.parse(savedCounts) : {};
    } catch (e) { return {}; }
  }); 
  const selectedUserRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('global_unread_counts', JSON.stringify(unreadCounts));
  }, [unreadCounts]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
    if (selectedUser) {
      setUnreadCounts(prev => ({ ...prev, [selectedUser.name]: 0 }));
      sessionStorage.setItem('active_chat_partner', JSON.stringify(selectedUser));
    }
    setShowBlockMenu(false);
    setActiveMenuMsgId(null); 
    setEditingMsgId(null);     
    scrollToBottom();
  }, [selectedUser]);

  // নতুন মেসেজ আসলে অটো স্ক্রোল ডাউন
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedUser && chatHistory[selectedUser.name]) {
      scrollToBottom();
    }
  }, [chatHistory, selectedUser]);

  // গ্লোবাল ক্লিক হ্যান্ডলার
  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) setShowPicker(false);
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowBlockMenu(false);
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) setShowSettingsMenu(false);
      if (!event.target.closest('.msg-action-container')) {
        setActiveMenuMsgId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // টাইপিং লজিক হ্যান্ডলার ও ইমিটেশন
  const handleInputChange = (e) => {
    setMessage(e.target.value);
    if (!selectedUser || !socketRef.current) return;

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing_status', { toSocketId: selectedUser.id, isTyping: true, senderName: user.name });
    }

    const lastTypingTime = Date.now();
    setTimeout(() => {
      const timeDiff = Date.now() - lastTypingTime;
      if (timeDiff >= 2000 && isTyping) {
        setIsTyping(false);
        socketRef.current.emit('typing_status', { toSocketId: selectedUserRef.current?.id, isTyping: false, senderName: user.name });
      }
    }, 2000);
  };

  // Tenor GIF API Engine
  useEffect(() => {
    if (!showPicker || activeTab !== 'gif') return;
    const fetchGifs = async () => {
      setLoadingGifs(true);
      try {
        const query = gifSearch.trim() || 'trending';
        const res = await fetch(`https://api.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=14`);
        const data = await res.json();
        if (data.results) setGifs(data.results.map(g => g.media[0].tinygif.url));
        else setGifs([]);
      } catch (err) { setGifs([]); } finally { setLoadingGifs(false); }
    };
    const delayDebounce = setTimeout(() => { fetchGifs(); }, 400);
    return () => clearTimeout(delayDebounce);
  }, [gifSearch, showPicker, activeTab]);

  // Socket.io Core Implementation
  useEffect(() => {
    if (!user) {
      setIsHydrating(false);
      return;
    }

    socketRef.current = io('https://live-chatting-web-app-server.onrender.com');
    const socket = socketRef.current;

    socket.on('connect', () => {
      socket.emit('join_directory', user);
      setIsHydrating(false);
    });

    socket.on('update_directory', (users) => {
      const currentFilteredUsers = users.filter(u => u.id !== socket.id);
      setActiveUsers(currentFilteredUsers);
      if (selectedUserRef.current) {
        const fresh = currentFilteredUsers.find(u => u.name === selectedUserRef.current.name);
        if (fresh) setSelectedUser(fresh);
      }
    });

    socket.on('sync_global_blocks', (blocksData) => {
      setAllBlocks(blocksData || {});
    });

    // টাইপিং সিগন্যাল রিসিভার
    socket.on('receive_typing_status', ({ senderName, isTyping }) => {
      setTypingUsers(prev => ({ ...prev, [senderName]: isTyping }));
    });

    socket.on('receive_private_message', ({ fromSocketId, senderName, message, msgId, fileType, timestamp }) => {
      if (senderName === user.name) return;

      setAllBlocks(currentBlocks => {
        if (currentBlocks[user.name] && currentBlocks[user.name].includes(senderName)) return currentBlocks; 
        
        setChatHistory(prev => {
          const userHistory = prev[senderName] || [];
          if (userHistory.some(msg => msg.id === msgId)) return prev; 

          const updated = { 
            ...prev, 
            [senderName]: [...userHistory, { id: msgId, sender: senderName, text: message, type: 'incoming', fileType: fileType || 'text', time: timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }] 
          };
          localStorage.setItem('global_chat_history_final', JSON.stringify(updated));
          return updated;
        });

        if (!selectedUserRef.current || selectedUserRef.current.name !== senderName) {
          setUnreadCounts(prev => ({ ...prev, [senderName]: (prev[senderName] || 0) + 1 }));
          toast.success(`New message from ${senderName}`);
        }
        return currentBlocks;
      });
    });

    socket.on('message_deleted_global', ({ msgId }) => {
      if (!selectedUserRef.current) return;
      setChatHistory(prev => {
        const userChat = prev[selectedUserRef.current.name] || [];
        const updatedChat = userChat.map(msg => msg.id === msgId ? { ...msg, text: "🚫 This message was unsent", isUnsent: true, fileType: 'text' } : msg);
        const updated = { ...prev, [selectedUserRef.current.name]: updatedChat };
        localStorage.setItem('global_chat_history_final', JSON.stringify(updated));
        return updated;
      });
    });

    socket.on('message_edited_global', ({ msgId, newText }) => {
      if (!selectedUserRef.current) return;
      setChatHistory(prev => {
        const userChat = prev[selectedUserRef.current.name] || [];
        const updatedChat = userChat.map(msg => msg.id === msgId ? { ...msg, text: newText, isEdited: true } : msg);
        const updated = { ...prev, [selectedUserRef.current.name]: updatedChat };
        localStorage.setItem('global_chat_history_final', JSON.stringify(updated));
        return updated;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const iBlockedThisUser = selectedUser ? (allBlocks[user?.name]?.includes(selectedUser.name) || false) : false;
  const thisUserBlockedMe = selectedUser ? (allBlocks[selectedUser.name]?.includes(user?.name) || false) : false;
  const isChatDisabled = iBlockedThisUser || thisUserBlockedMe;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) return alert("Image too large! Max 1MB.");
      const reader = new FileReader();
      reader.onloadend = () => { setFormData({ ...formData, profilePic: reader.result }); };
      reader.readAsDataURL(file);
    }
  };

  const handleFileShare = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedUser || isChatDisabled) return;
    if (file.size > 25 * 1024 * 1024) return alert("❌ Max file size is 25MB.");

    let fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
    if (!fileType) return alert("Only images and videos are supported.");

    const reader = new FileReader();
    toast.loading("Sending file...", { id: "file_upload" });
    reader.onloadend = () => {
      executeSendMessage(reader.result, fileType);
      toast.success("File sent!", { id: "file_upload" });
    };
    reader.readAsDataURL(file);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.age) return alert("Fill all fields");
    if (!acceptedTermsLogin) return toast.error("Please accept the Terms & Conditions.");

    const cleanedName = formData.name.trim();

    try {
      const response = await fetch('https://live-chatting-web-app-server.onrender.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanedName })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message);
        toast.error(data.message, { style: { background: '#ef4444', color: '#fff' } });
        return;
      }

      let finalProfilePic = formData.profilePic || (formData.gender === 'Female' ? 'ICON_FEMALE' : 'ICON_MALE');
      const userData = { ...formData, name: cleanedName, profilePic: finalProfilePic };
      
      sessionStorage.setItem('chat_user', JSON.stringify(userData));
      setUser(userData);
      toast.success(`Welcome, ${cleanedName}!`);

    } catch (error) {
      alert("Backend server is offline! Check your deployment link status.");
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser || isChatDisabled) return;
    executeSendMessage(message, 'text');
  };

  const executeSendMessage = (textToSend, fileType = 'text') => {
    const currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const uniqueMsgId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    socketRef.current.emit('send_private_message', { 
      toSocketId: selectedUser.id, 
      message: textToSend, 
      msgId: uniqueMsgId, 
      fileType,
      timestamp: currentTimeStr
    });

    // টাইপিং বন্ধ করা
    if (isTyping) {
      setIsTyping(false);
      socketRef.current.emit('typing_status', { toSocketId: selectedUser.id, isTyping: false, senderName: user.name });
    }

    setChatHistory(prev => {
      const updated = { ...prev, [selectedUser.name]: [...(prev[selectedUser.name] || []), { id: uniqueMsgId, sender: 'You', text: textToSend, type: 'outgoing', fileType, time: currentTimeStr }] };
      localStorage.setItem('global_chat_history_final', JSON.stringify(updated));
      return updated;
    });
    if (fileType === 'text') setMessage('');
    setShowPicker(false);
  };

  const handleUnsendForEveryone = (msgId) => {
    if (!selectedUser) return;
    socketRef.current.emit('delete_message_global', { toSocketId: selectedUser.id, msgId });
    setChatHistory(prev => {
      const updatedChat = (prev[selectedUser.name] || []).map(msg => msg.id === msgId ? { ...msg, text: "🚫 You unsent a message", isUnsent: true, fileType: 'text' } : msg);
      const updated = { ...prev, [selectedUser.name]: updatedChat };
      localStorage.setItem('global_chat_history_final', JSON.stringify(updated));
      return updated;
    });
    setActiveMenuMsgId(null);
  };

  const handleRemoveForMe = (msgId) => {
    setChatHistory(prev => {
      const updatedChat = (prev[selectedUser.name] || []).filter(msg => msg.id !== msgId);
      const updated = { ...prev, [selectedUser.name]: updatedChat };
      localStorage.setItem('global_chat_history_final', JSON.stringify(updated));
      return updated;
    });
    setActiveMenuMsgId(null);
  };

  const handleEditSubmit = (msgId) => {
    if (!editText.trim() || !selectedUser) return;
    socketRef.current.emit('edit_message_global', { toSocketId: selectedUser.id, msgId, newText: editText });
    setChatHistory(prev => {
      const updatedChat = (prev[selectedUser.name] || []).map(msg => msg.id === msgId ? { ...msg, text: editText, isEdited: true } : msg);
      const updated = { ...prev, [selectedUser.name]: updatedChat };
      localStorage.setItem('global_chat_history_final', JSON.stringify(updated));
      return updated;
    });
    setEditingMsgId(null);
  };

  const toggleActionMenu = (e, msgId) => {
    if (activeMenuMsgId === msgId) {
      setActiveMenuMsgId(null);
      return;
    }
    
    const clickY = e.clientY;
    const windowHeight = window.innerHeight;
    
    if (windowHeight - clickY < 160) {
      setDropdownPosition('top'); 
    } else {
      setDropdownPosition('bottom'); 
    }
    
    setActiveMenuMsgId(msgId);
  };

  const handleGifSelect = (gifUrl) => { if (!isChatDisabled) executeSendMessage(`[GIF]: ${gifUrl}`, 'text'); };
  const onEmojiClick = (emojiData) => { setMessage(prev => prev + emojiData.emoji); };
  const handleLogout = () => { sessionStorage.clear(); localStorage.clear(); window.location.reload(); };

  const renderAvatar = (targetUser, sizeClass = "w-10 h-10") => {
    if (!targetUser) return <div className={`${sizeClass} rounded-full bg-slate-700 animate-pulse`} />;
    if (targetUser.profilePic && targetUser.profilePic !== 'ICON_MALE' && targetUser.profilePic !== 'ICON_FEMALE') {
      return <img src={targetUser.profilePic} className={`${sizeClass} rounded-full object-cover border border-slate-700`} alt="avatar" />;
    }
    const isFemale = targetUser.profilePic === 'ICON_FEMALE' || targetUser.gender === 'Female';
    return <div className={`${sizeClass} rounded-full flex items-center justify-center border ${isFemale ? "bg-pink-600/30 text-pink-400 border-pink-500/40" : "bg-blue-600/30 text-blue-400 border-blue-500/40"} p-1.5`}><User className="w-full h-full" /></div>;
  };

  const renderMessageContent = (msg) => {
    if (msg.isUnsent) return <p className="italic text-slate-500 text-xs">{msg.text}</p>;
    if (msg.fileType === 'image') return <img src={msg.text} alt="Shared" className="rounded-xl max-w-[200px] sm:max-w-[280px] max-h-[350px] object-contain" />;
    if (msg.fileType === 'video') return <video src={msg.text} controls className="rounded-xl max-w-[220px] sm:max-w-[300px]" />;
    if (msg.text.startsWith('[GIF]: ')) return <img src={msg.text.replace('[GIF]: ', '')} alt="gif" className="rounded-xl max-w-[180px]" />;
    return <div><p className="break-all">{msg.text}</p>{msg.isEdited && <span className="text-[9px] text-blue-300 block text-right">(edited)</span>}</div>;
  };

  if (isHydrating) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex relative overflow-hidden fixed inset-0 overscroll-none select-none">
      <Toaster position="top-center" containerStyle={{ zIndex: 99999 }} reverseOrder={false} />

      {!user ? (
        /* --- LOGIN SCREEN --- */
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-800 text-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 my-auto">
            <h2 className="text-2xl font-bold text-center mb-6">Create Your Anonymous Profile</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex flex-col items-center mb-4">
                <div className="relative group cursor-pointer">
                  <div className="w-20 h-20 rounded-full bg-slate-700 border-2 border-dashed border-slate-500 flex items-center justify-center overflow-hidden">
                    {formData.profilePic ? <img src={formData.profilePic} className="w-full h-full object-cover" alt="preview" /> : <Camera className="text-slate-500" size={24} />}
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold">Nickname</label>
                <input type="text" required className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 mt-1 text-white outline-none" onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold">Age</label>
                  <input type="number" required className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 mt-1 text-white outline-none" onChange={e => setFormData({...formData, age: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold">Gender</label>
                  <select className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 mt-1 text-white outline-none" onChange={e => setFormData({...formData, gender: e.target.value})}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold">Country</label>
                <select value={formData.country} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 mt-1 text-white outline-none" onChange={e => setFormData({...formData, country: e.target.value})}>
                  {isoCountries.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <input type="checkbox" id="termsCheck" checked={acceptedTermsLogin} onChange={(e) => setAcceptedTermsLogin(e.target.checked)} className="w-4 h-4 mt-0.5 rounded bg-slate-700 cursor-pointer" />
                <label htmlFor="termsCheck" className="text-xs text-slate-300 cursor-pointer">
                  I agree to the <span onClick={() => setShowTermsPopup(true)} className="text-blue-400 hover:underline font-semibold cursor-pointer">Terms & Conditions</span>
                </label>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-bold transition">Join Directory</button>
            </form>
          </motion.div>
        </div>
      ) : (
        /* --- MAIN DASHBOARD SCREEN --- */
        <>
          {/* Left Sidebar */}
          <div className={`w-full md:w-1/3 border-r border-slate-800 flex flex-col bg-slate-900 h-full ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <button onClick={() => setProfileUser(user)} className="flex items-center gap-3 hover:bg-slate-800 p-2 rounded-xl text-left">
                {renderAvatar(user, "w-9 h-9")}
                <div><p className="text-xs font-bold leading-none">My Profile</p><p className="text-[10px] text-slate-500 mt-1">{user.name}</p></div>
              </button>
              <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 p-2 hover:bg-slate-800 rounded-xl"><LogOut size={20} /></button>
            </div>

            <div className="p-3 bg-slate-950/40 border-b border-slate-800 space-y-2 shrink-0">
              <div className="flex grid grid-cols-2 gap-2">
                <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-xs rounded-lg p-2">
                  <option value="All">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-xs rounded-lg p-2">
                  <option value="All">All Countries</option>
                  {isoCountries.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
              {activeUsers.filter(u => (genderFilter === 'All' || u.gender === genderFilter) && (countryFilter === 'All' || u.country === countryFilter)).map(u => {
                const count = unreadCounts[u.name] || 0;
                const userIsTyping = typingUsers[u.name] || false;
                
                return (
                  <div key={u.id} onClick={() => setSelectedUser(u)} className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition ${selectedUser?.name === u.name ? 'bg-blue-600/20 border border-blue-500' : 'bg-slate-800/50 hover:bg-slate-800'}`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div onClick={(e) => { e.stopPropagation(); setProfileUser(u); }} className="shrink-0">{renderAvatar(u, "w-10 h-10")}</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium truncate">{u.name}</h3>
                        {userIsTyping ? (
                          <p className="text-[11px] text-green-400 font-medium animate-pulse">typing...</p>
                        ) : (
                          <p className="text-[10px] text-slate-500 truncate">{u.country} • {u.gender}</p>
                        )}
                      </div>
                    </div>

                    {/* লাল ডট মেসেজ ইন্ডিকেটর */}
                    {count > 0 && (
                      <div className="ml-2 shrink-0 bg-red-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                        {count}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Settings Panel Area */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/40 relative shrink-0" ref={settingsMenuRef}>
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="flex-1 flex items-center gap-3 p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition text-sm font-medium">
                  <Settings size={18} className={`text-slate-400 transition-transform duration-300 ${showSettingsMenu ? 'rotate-45 text-blue-400' : ''}`} />
                  <span>Settings Panel</span>
                </button>
                <div className="text-[10px] text-slate-500 font-medium whitespace-nowrap pr-1 select-none">
                  Made with ❤️ by <span className="text-slate-400 font-semibold hover:text-blue-400 transition-colors">NAYAN</span>
                </div>
              </div>

              <AnimatePresence>
                {showSettingsMenu && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-14 left-3 right-3 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-0.5">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-700/50 mb-1">Preferences</div>
                    <button type="button" onClick={() => toast('Account Security Active.', { icon: '🔒' })} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left text-slate-300 hover:bg-slate-700 rounded-lg transition"><Key size={14} /> Account Verification</button>
                    <button type="button" onClick={() => toast('Notifications are live.', { icon: '🔔' })} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left text-slate-300 hover:bg-slate-700 rounded-lg transition"><Bell size={14} /> Chat Notifications</button>
                    <button type="button" onClick={() => toast.success('Privacy Guard Encrypted.')} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left text-slate-300 hover:bg-slate-700 rounded-lg transition"><ShieldUser size={14} /> Privacy Policy</button>
                    <button type="button" onClick={() => { setShowTermsPopup(true); setShowSettingsMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-left text-blue-400 hover:bg-blue-500/10 rounded-lg transition"><ShieldAlert size={14} /> Terms & Conditions</button>
                    <div className="border-t border-slate-700/50 my-1"></div>
                    <button type="button" onClick={() => toast('Support Desk Online', { icon: 'ℹ️' })} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-left text-slate-400 hover:bg-slate-700 rounded-lg transition"><HelpCircle size={14} /> Help Support</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Message Panel */}
          {/* flex-col, h-screen এবং overflow-hidden দিয়ে কিবোর্ড ও হেডার ফিক্সড রাখা হয়েছে */}
          <div className={`w-full md:w-2/3 flex flex-col bg-slate-950 h-screen md:h-full overflow-hidden ${selectedUser ? 'flex' : 'hidden md:flex'}`}>
            {selectedUser ? (
              <>
                {/* Fixed Top Header (মোবাইল কিবোর্ড ওপেন হলেও এটি উপরে সঠিক স্থানে আটকে থাকবে) */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40 shrink-0 z-10 sticky top-0">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-900 border border-slate-800 rounded-xl md:hidden text-slate-300 active:bg-slate-800"><ArrowLeft size={18} /></button>
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setProfileUser(selectedUser)}>
                      {renderAvatar(selectedUser, "w-10 h-10")}
                      <div>
                        <h2 className="font-bold leading-none text-white">{selectedUser.name}</h2>
                        {typingUsers[selectedUser.name] ? (
                          <p className="text-[10px] text-green-400 font-semibold uppercase mt-1 animate-pulse">Typing...</p>
                        ) : (
                          <p className="text-[10px] text-green-500 font-medium uppercase mt-1">Active Now</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- মেসেজ ডিসপ্লে এরিয়া --- */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 relative min-h-0 bg-slate-950/20">
                  {(chatHistory[selectedUser.name] || []).map((msg, idx) => {
                    const isMyMsg = msg.type === 'outgoing';
                    const currentMsgId = msg.id || `fallback-${idx}`;
                    const isEditingThis = editingMsgId === currentMsgId;
                    const isMenuOpen = activeMenuMsgId === currentMsgId;

                    return (
                      <div key={currentMsgId} className={`flex w-full items-end gap-1.5 msg-action-container ${isMyMsg ? 'justify-end' : 'justify-start'}`}>
                        
                        {!isMyMsg && !msg.isUnsent && (
                          <button onClick={(e) => toggleActionMenu(e, currentMsgId)} className="p-1 text-slate-500 hover:text-slate-300 rounded-lg opacity-0 group-hover:opacity-100 md:opacity-100 transition order-1">
                            <MoreVertical size={14} />
                          </button>
                        )}

                        <div className={`relative max-w-[75%] sm:max-w-[70%] group flex flex-col ${isMyMsg ? 'items-end' : 'items-start'}`}>
                          {isEditingThis ? (
                            <div className="bg-slate-800 border border-slate-700 p-2 rounded-2xl flex items-center gap-2 min-w-[220px] sm:min-w-[240px]">
                              <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} className="bg-slate-900 text-xs p-2 rounded-xl text-white outline-none flex-1 border border-slate-700" />
                              <button onClick={() => handleEditSubmit(currentMsgId)} className="p-1.5 bg-green-600 text-white rounded-lg"><Check size={14} /></button>
                              <button onClick={() => setEditingMsgId(null)} className="p-1.5 bg-slate-700 text-slate-300 rounded-lg"><X size={14} /></button>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <div onClick={(e) => !msg.isUnsent && toggleActionMenu(e, currentMsgId)} className={`p-3 rounded-2xl text-sm cursor-pointer transition ${isMyMsg ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none'} hover:brightness-110 shadow-md`}>
                                {renderMessageContent(msg)}
                              </div>
                              
                              {/* মেসেজ টাইম এবং সেন্ট/ডেলিভার্ড ইন্ডিকেটর (নতুন যুক্ত করা হয়েছে) */}
                              {!msg.isUnsent && (
                                <div className={`flex items-center gap-1 mt-1 text-[9px] text-slate-500 font-medium ${isMyMsg ? 'justify-end' : 'justify-start'}`}>
                                  <span>{msg.time || "12:00 PM"}</span>
                                  {isMyMsg && (
                                    <span className="text-blue-400 font-bold tracking-tight">✓✓</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <AnimatePresence>
                            {isMenuOpen && !isEditingThis && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: dropdownPosition === 'top' ? 10 : -10 }} 
                                animate={{ opacity: 1, scale: 1, y: 0 }} 
                                exit={{ opacity: 0, scale: 0.95 }} 
                                className={`absolute bg-slate-900 border border-slate-700 rounded-xl p-1 shadow-2xl z-50 flex flex-col min-w-[150px] ${isMyMsg ? 'right-0' : 'left-0'} ${dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
                              >
                                {isMyMsg && (!msg.fileType || msg.fileType === 'text') && (
                                  <button onClick={() => { setEditingMsgId(currentMsgId); setEditText(msg.text); setActiveMenuMsgId(null); }} className="flex items-center gap-2 text-left text-xs p-2 text-slate-300 hover:bg-slate-800 rounded-lg"><Edit3 size={13} /> Edit Message</button>
                                )}
                                {isMyMsg && (
                                  <button onClick={() => handleUnsendForEveryone(currentMsgId)} className="flex items-center gap-2 text-left text-xs p-2 text-red-400 hover:bg-red-500/10 rounded-lg"><Ban size={13} /> Unsend Everyone</button>
                                )}
                                <button onClick={() => handleRemoveForMe(currentMsgId)} className="flex items-center gap-2 text-left text-xs p-2 text-slate-400 hover:bg-slate-800 rounded-lg"><Trash2 size={13} /> Remove for Me</button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {isMyMsg && !msg.isUnsent && (
                          <button onClick={(e) => toggleActionMenu(e, currentMsgId)} className="p-1 text-slate-500 hover:text-slate-300 rounded-lg opacity-0 group-hover:opacity-100 md:opacity-100 transition">
                            <MoreVertical size={14} />
                          </button>
                        )}

                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Controls Container (কিবোর্ড ওপেন হলেও এটি ঠিকঠাক এডজাস্ট হবে) */}
                <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/50 relative shrink-0 pb-safe" ref={popupRef}>
                  
                  {/* Emoji & GIF Popover */}
                  <AnimatePresence>
                    {showPicker && !isChatDisabled && (
                      <motion.div initial={{ opacity: 0, y: 15, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: 0.98 }} className="absolute bottom-20 left-2 right-2 sm:left-4 z-50 shadow-2xl rounded-2xl bg-slate-800 border border-slate-700 max-w-[310px] w-auto overflow-hidden flex flex-col">
                        <div className="flex bg-slate-900/60 p-1.5 border-b border-slate-700/60">
                          <button type="button" onClick={() => setActiveTab('emoji')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'emoji' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}><SmilePlus size={15} />Emojis</button>
                          <button type="button" onClick={() => setActiveTab('gif')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'gif' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}><Film size={15} />GIFs</button>
                        </div>
                        <div className="p-2 bg-slate-800 flex flex-col items-center justify-center">
                          {activeTab === 'emoji' && <div className="w-full"><EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} width="100%" height={250} skinTonesDisabled={true} searchDisabled={true} /></div>}
                          {activeTab === 'gif' && (
                            <div className="w-full p-1">
                              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-2 mb-2"><Search size={15} className="text-slate-400" /><input type="text" placeholder="Search Tenor GIFs..." value={gifSearch} onChange={(e) => setGifSearch(e.target.value)} className="bg-transparent text-xs text-white outline-none w-full" /></div>
                              <div className="grid grid-cols-2 gap-2 max-h-[190px] overflow-y-auto p-0.5">{gifs.map((url, i) => <img key={i} src={url} alt="gif" onClick={() => handleGifSelect(url)} className="w-full h-20 object-cover rounded-lg cursor-pointer hover:scale-95 transition" />)}</div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <input type="file" ref={fileInputRef} onChange={handleFileShare} accept="image/*,video/*" className="hidden" />
                  
                  {/* Message Input Form */}
                  <form onSubmit={handleSendMessage} className="flex gap-1.5 sm:gap-2 items-center">
                    <button type="button" onClick={() => setShowPicker(!showPicker)} className={`p-2.5 sm:p-3 rounded-xl border transition shrink-0 ${showPicker ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><Smile size={18} /></button>
                    <button type="button" onClick={() => fileInputRef.current.click()} className="p-2.5 sm:p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white shrink-0"><Paperclip size={18} /></button>
                    <input type="text" value={message} onChange={handleInputChange} placeholder="Type a message..." className="flex-1 min-w-0 border bg-slate-800 border-slate-700 rounded-xl p-2.5 sm:p-3 text-sm outline-none text-white focus:border-blue-500" />
                    <button type="submit" className="p-2.5 sm:p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shrink-0"><Send size={16} /></button>
                  </form>
                </div>
              </>
            ) : (
              /* --- NEW USER GREETING CONTAINER --- */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-950/20">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ duration: 0.5 }}
                  className="max-w-md p-8 bg-slate-900/40 border border-slate-800/80 rounded-3xl shadow-2xl backdrop-blur-sm flex flex-col items-center"
                >
                  <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-5 text-blue-400 shadow-inner">
                    <MessageSquare size={32} />
                  </div>
                  <h2 className="text-xl font-bold mb-2 text-white">Hello, {user.name}! 👋</h2>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-6">
                    Welcome to your dashboard. Select any active profile from the sidebar directory list to launch an encrypted anonymous live conversation instantly.
                  </p>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-full border border-slate-800">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Ready to chat</span>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== TERMS AND CONDITIONS MODAL ==================== */}
      <AnimatePresence>
        {showTermsPopup && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[999999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-slate-800 border border-slate-700 w-full max-w-xl rounded-2xl p-6 shadow-2xl text-slate-100 flex flex-col">
              <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-4">
                <h3 className="text-md font-bold flex items-center gap-2"><ShieldAlert size={18} className="text-blue-400" /> Terms & Conditions (Industrial Standard)</h3>
                <button type="button" onClick={() => setShowTermsPopup(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>
              <div className="text-xs text-slate-300 space-y-3.5 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <p className="font-semibold text-white border-b border-slate-700 pb-1">Effective Date: May 2026</p>
                <div>
                  <h4 className="font-bold text-blue-400 mb-1">1. Acceptance of Terms</h4>
                  <p>By creating a profile or accessing this platform, you agree to be bound by these legally binding Terms and Conditions...</p>
                </div>
                <div>
                  <h4 className="font-bold text-blue-400 mb-1">2. Anonymity, Pseudonyms & Privacy Guard</h4>
                  <p>This application is designed as an anonymous directory chat...</p>
                </div>
                <div>
                  <h4 className="font-bold text-blue-400 mb-1">3. User Conduct & Prohibited Content</h4>
                  <p>You strictly agree not to transmit: spam, automated floods, malware...</p>
                </div>
              </div>
              <button type="button" onClick={() => { setAcceptedTermsLogin(true); setShowTermsPopup(false); }} className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-xs font-semibold py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20">Accept Agreement & Proceed</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {profileUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative text-center pb-8">
              <button onClick={() => setProfileUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X /></button>
              <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
              <div className="flex justify-center -mt-12 mb-4">{renderAvatar(profileUser, "w-24 h-24")}</div>
              <h2 className="text-xl font-bold">{profileUser.name}</h2>
              <p className="text-blue-400 text-xs mb-4">{profileUser.gender} • {profileUser.age} Yrs</p>
              <div className="flex justify-center gap-4 text-sm">
                <div className="bg-slate-900/50 p-2 px-4 rounded-xl border border-slate-700/50"><p className="text-xs text-slate-500">Country</p><p>{profileUser.country}</p></div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}