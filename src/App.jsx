import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Send, LogOut, Bell, Loader2, ShieldUser, X, Camera, MessageSquare, ArrowLeft, Smile, Search, SmilePlus, Film, MoreVertical, Ban, Paperclip, Trash2, Edit3, Check, Settings, ShieldAlert, Key, HelpCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import EmojiPicker, { Theme } from 'emoji-picker-react';

// আপনার প্রোডাকশন/লাইভ সার্ভারের ইউআরএল সেট করা হলো
const SERVER_URL = "https://live-chatting-web-app-server.onrender.com";

const isoCountries = ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bangladesh", "Belarus", "Belgium", "Brazil", "Canada", "China", "Denmark", "Egypt", "France", "Germany", "India", "Indonesia", "Italy", "Japan", "Malaysia", "Mexico", "Nepal", "Netherlands", "New Zealand", "Pakistan", "Philippines", "Russia", "Saudi Arabia", "Singapore", "Spain", "Sweden", "Switzerland", "Thailand", "Turkey", "UAE", "UK", "USA", "Vietnam"];

export default function App() {
  const socketRef = useRef(null);
  const popupRef = useRef(null);
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

  // লাইভ ইন্ডিকেটরস এবং টাইপিং স্ট্যাটাস ট্র্যাকার
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});

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

  // একটিভ চ্যাট ওপেন এবং সিন ট্র্যাকিং ট্রিগার
  useEffect(() => {
    selectedUserRef.current = selectedUser;
    if (selectedUser) {
      setUnreadCounts(prev => ({ ...prev, [selectedUser.name]: 0 }));
      sessionStorage.setItem('active_chat_partner', JSON.stringify(selectedUser));
      
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('chat_opened_or_seen', { fromName: user.name, toSocketId: selectedUser.id });
      }
    }
    setActiveMenuMsgId(null); 
    setEditingMsgId(null);     
    setTimeout(() => scrollToBottom(), 100);
  }, [selectedUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedUser) {
      scrollToBottom();
    }
  }, [chatHistory]);

  // পপআপ এবং ড্রপডাউন ক্লোজার লজিক
  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) setShowPicker(false);
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) setShowSettingsMenu(false);
      if (!event.target.closest('.msg-action-container')) setActiveMenuMsgId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // টাইপিং ইন্ডিকেটর হ্যান্ডলার
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
      if (timeDiff >= 2000) {
        setIsTyping(false);
        if (socketRef.current && selectedUserRef.current) {
          socketRef.current.emit('typing_status', { toSocketId: selectedUserRef.current.id, isTyping: false, senderName: user.name });
        }
      }
    }, 2000);
  };

  // Tenor GIF লাইব্রেরি ইন্টিগ্রেশন
  useEffect(() => {
    if (!showPicker || activeTab !== 'gif') return;
    const fetchGifs = async () => {
      setLoadingGifs(true);
      try {
        const query = gifSearch.trim() || 'trending';
        const res = await fetch(`https://api.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=14`);
        const data = await res.json();
        if (data.results) setGifs(data.results.map(g => g.media[0].tinygif.url));
      } catch (err) { setGifs([]); } finally { setLoadingGifs(false); }
    };
    const delayDebounce = setTimeout(() => { fetchGifs(); }, 400);
    return () => clearTimeout(delayDebounce);
  }, [gifSearch, showPicker, activeTab]);

  // কোর সকেট লাইফসাইকেল লিসেনার্স
  useEffect(() => {
    if (!user) {
      setIsHydrating(false);
      return;
    }

    socketRef.current = io(SERVER_URL, { transient: true });
    const socket = socketRef.current;

    socket.on('connect', () => {
      socket.emit('join_directory', user);
      setIsHydrating(false);
    });

    socket.on('update_directory', (users) => {
      const currentFilteredUsers = users.filter(u => u.name !== user.name);
      setActiveUsers(currentFilteredUsers);
      
      if (selectedUserRef.current) {
        const fresh = currentFilteredUsers.find(u => u.name === selectedUserRef.current.name);
        if (fresh) setSelectedUser(fresh);
      }
    });

    socket.on('sync_global_blocks', (blocksData) => {
      setAllBlocks(blocksData || {});
    });

    // টাইপিং ইন্ডিকেটর স্ট্যাটাস সিঙ্ক
    socket.on('receive_typing_status', ({ senderName, isTyping }) => {
      setTypingUsers(prev => ({ ...prev, [senderName]: isTyping }));
    });

    // পার্টনার আপনার চ্যাট উইন্ডো ওপেন করলে ব্লু ডাবল টিক আপডেট করা
    socket.on('partner_marked_seen', ({ fromName }) => {
      if (selectedUserRef.current && selectedUserRef.current.name === fromName) {
        setChatHistory(prev => {
          const userChat = prev[fromName] || [];
          const updatedChat = userChat.map(msg => msg.type === 'outgoing' ? { ...msg, status: 'seen' } : msg);
          const updated = { ...prev, [fromName]: updatedChat };
          localStorage.setItem('global_chat_history_final', JSON.stringify(updated));
          return updated;
        });
      }
    });

    // প্রাইভেট মেসেজ রিসিভ করা এবং অটো-ডেলিভারি মেসেজ পাঠানো
    socket.on('receive_private_message', ({ fromSocketId, senderName, message, msgId, fileType, timestamp }) => {
      const isChatWindowOpen = selectedUserRef.current && selectedUserRef.current.name === senderName;
      
      socket.emit('message_delivery_ack', { 
        toSocketId: fromSocketId, 
        fromName: user.name, 
        msgId, 
        isSeen: isChatWindowOpen 
      });

      setChatHistory(prev => {
        const userHistory = prev[senderName] || [];
        if (userHistory.some(msg => msg.id === msgId)) return prev; 

        const updated = { 
          ...prev, 
          [senderName]: [...userHistory, { id: msgId, sender: senderName, text: message, type: 'incoming', fileType: fileType || 'text', time: timestamp }] 
        };
        localStorage.setItem('global_chat_history_final', JSON.stringify(updated));
        return updated;
      });

      if (!isChatWindowOpen) {
        setUnreadCounts(prev => ({ ...prev, [senderName]: (prev[senderName] || 0) + 1 }));
        toast.success(`New message from ${senderName}`);
      }
    });

    // ডাবল টিক ট্র্যাকার একনলেজমেন্ট রিসিভার
    socket.on('receive_delivery_ack', ({ fromName, msgId, isSeen }) => {
      setChatHistory(prev => {
        const userChat = prev[fromName] || [];
        const updatedChat = userChat.map(msg => {
          if (msg.id === msgId) {
            return { ...msg, status: isSeen ? 'seen' : 'delivered' };
          }
          return msg;
        });
        const updated = { ...prev, [fromName]: updatedChat };
        localStorage.setItem('global_chat_history_final', JSON.stringify(updated));
        return updated;
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
    if (!file || !selectedUser) return;
    let fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
    if (!fileType) return alert("Only images and videos are supported.");

    const reader = new FileReader();
    reader.onloadend = () => { executeSendMessage(reader.result, fileType); };
    reader.readAsDataURL(file);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.age) return;
    if (!acceptedTermsLogin) return toast.error("Please accept the Terms & Conditions.");

    try {
      const response = await fetch(`${SERVER_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name.trim() })
      });
      const data = await response.json();
      if (!response.ok) return toast.error(data.message);

      let finalProfilePic = formData.profilePic || (formData.gender === 'Female' ? 'ICON_FEMALE' : 'ICON_MALE');
      const userData = { ...formData, name: formData.name.trim(), profilePic: finalProfilePic };
      
      sessionStorage.setItem('chat_user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      toast.error("Backend Server is Offline!");
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser) return;
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

    setChatHistory(prev => {
      const updated = { ...prev, [selectedUser.name]: [...(prev[selectedUser.name] || []), { id: uniqueMsgId, sender: 'You', text: textToSend, type: 'outgoing', fileType, time: currentTimeStr, status: 'sent' }] };
      localStorage.setItem('global_chat_history_final', JSON.stringify(updated));
      return updated;
    });
    if (fileType === 'text') setMessage('');
    setShowPicker(false);
  };

  const handleUnsendForEveryone = (msgId) => {
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
    if (activeMenuMsgId === msgId) return setActiveMenuMsgId(null);
    setDropdownPosition(window.innerHeight - e.clientY < 160 ? 'top' : 'bottom');
    setActiveMenuMsgId(msgId);
  };

  const handleGifSelect = (gifUrl) => executeSendMessage(`[GIF]: ${gifUrl}`, 'text');
  const onEmojiClick = (emojiData) => setMessage(prev => prev + emojiData.emoji);
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
    if (msg.fileType === 'image') return <img src={msg.text} alt="Shared" className="rounded-xl max-w-[200px]" />;
    if (msg.fileType === 'video') return <video src={msg.text} controls className="rounded-xl max-w-[200px]" />;
    if (msg.text.startsWith('[GIF]: ')) return <img src={msg.text.replace('[GIF]: ', '')} alt="gif" className="rounded-xl max-w-[180px]" />;
    return <div><p className="break-all">{msg.text}</p>{msg.isEdited && <span className="text-[9px] text-blue-300 block text-right">(edited)</span>}</div>;
  };

  const renderTickIndicator = (msg) => {
    if (msg.status === 'seen') return <span className="text-cyan-400 font-extrabold text-[11px] ml-1">✓✓</span>;
    if (msg.status === 'delivered') return <span className="text-slate-500 font-bold text-[11px] ml-1">✓✓</span>;
    return <span className="text-slate-600 font-medium text-[11px] ml-1">✓</span>;
  };

  if (isHydrating) return <div className="h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex relative overflow-hidden fixed inset-0 overscroll-none select-none">
      <Toaster position="top-center" containerStyle={{ zIndex: 99999 }} />

      {!user ? (
        /* --- ওরিজিনাল লগইন ইন্টারফেস --- */
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-800 p-8 rounded-2xl w-full max-w-md border border-slate-700">
            <h2 className="text-2xl font-bold text-center mb-6">Create Your Anonymous Profile</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex flex-col items-center mb-4">
                <div className="relative cursor-pointer">
                  <div className="w-20 h-20 rounded-full bg-slate-700 border-2 border-dashed border-slate-500 flex items-center justify-center overflow-hidden">
                    {formData.profilePic ? <img src={formData.profilePic} className="w-full h-full object-cover" alt="preview" /> : <Camera className="text-slate-500" size={24} />}
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold">Nickname</label>
                <input type="text" required className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 mt-1 outline-none text-white" onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold">Age</label>
                  <input type="number" required className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 mt-1 outline-none text-white" onChange={e => setFormData({...formData, age: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold">Gender</label>
                  <select className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 mt-1 outline-none text-white" onChange={e => setFormData({...formData, gender: e.target.value})}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold">Country</label>
                <select value={formData.country} className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2.5 mt-1 outline-none text-white" onChange={e => setFormData({...formData, country: e.target.value})}>
                  {isoCountries.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-start gap-2.5 pt-2">
                <input type="checkbox" id="terms" checked={acceptedTermsLogin} onChange={(e) => setAcceptedTermsLogin(e.target.checked)} className="w-4 h-4 rounded bg-slate-700 cursor-pointer" />
                <label htmlFor="terms" className="text-xs text-slate-300">I agree to <span onClick={() => setShowTermsPopup(true)} className="text-blue-400 underline cursor-pointer font-semibold">Terms & Conditions</span></label>
              </div>
              <button type="submit" className="w-full bg-blue-600 py-3 rounded-lg font-bold">Join Directory</button>
            </form>
          </motion.div>
        </div>
      ) : (
        /* --- ওরিজিনাল ড্যাশবোর্ড প্যানেল --- */
        <>
          {/* Sidebar */}
          <div className={`w-full md:w-1/3 border-r border-slate-800 flex flex-col bg-slate-900 h-full ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <button onClick={() => setProfileUser(user)} className="flex items-center gap-3 p-1 rounded-xl text-left hover:bg-slate-800">
                {renderAvatar(user, "w-9 h-9")}
                <div><p className="text-xs font-bold leading-none">My Profile</p><p className="text-[10px] text-slate-500 mt-1">{user.name}</p></div>
              </button>
              <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 p-2"><LogOut size={20} /></button>
            </div>

            {/* ফিল্টারিং প্যানেল */}
            <div className="p-3 bg-slate-950/40 border-b border-slate-800 grid grid-cols-2 gap-2 shrink-0">
              <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-xs rounded-lg p-2 text-white">
                <option value="All">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-xs rounded-lg p-2 text-white">
                <option value="All">All Countries</option>
                {isoCountries.map((c, i) => <option key={i} value={c}>{c}</option>)}
              </select>
            </div>

            {/* ইউজার লিস্ট */}
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
                    {count > 0 && <div className="bg-red-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-lg animate-pulse">{count}</div>}
                  </div>
                );
              })}
            </div>

            {/* ফুটার সেটিংস প্যানেল */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/40 relative shrink-0" ref={settingsMenuRef}>
              <div className="flex items-center justify-between">
                <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="flex items-center gap-3 p-2 rounded-xl text-slate-400 hover:text-white transition text-sm">
                  <Settings size={18} />
                  <span>Settings Panel</span>
                </button>
                <div className="text-[10px] text-slate-500 font-medium select-none">Made with ❤️ by <span className="text-slate-400 font-semibold">NAYAN</span></div>
              </div>
              <AnimatePresence>
                {showSettingsMenu && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute bottom-14 left-3 right-3 bg-slate-800 border border-slate-700 rounded-xl p-1.5 z-50 flex flex-col">
                    <button type="button" onClick={() => toast('Security Active.', { icon: '🔒' })} className="w-full text-left text-xs p-2 text-slate-300 hover:bg-slate-700 rounded-lg flex items-center gap-2"><Key size={14}/> Verification</button>
                    <button type="button" onClick={() => { setShowTermsPopup(true); setShowSettingsMenu(false); }} className="w-full text-left text-xs p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg flex items-center gap-2"><ShieldAlert size={14}/> Terms & Conditions</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Chat Window */}
          <div className={`w-full md:w-2/3 flex flex-col bg-slate-950 h-screen md:h-full overflow-hidden ${selectedUser ? 'flex' : 'hidden md:flex'}`}>
            {selectedUser ? (
              <>
                {/* Header Chat Info */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40 shrink-0 sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-900 border border-slate-800 rounded-xl md:hidden text-slate-300"><ArrowLeft size={18} /></button>
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

                {/* Messages Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 relative min-h-0">
                  {(chatHistory[selectedUser.name] || []).map((msg, idx) => {
                    const isMyMsg = msg.type === 'outgoing';
                    const currentMsgId = msg.id || `fallback-${idx}`;
                    const isEditingThis = editingMsgId === currentMsgId;
                    const isMenuOpen = activeMenuMsgId === currentMsgId;

                    return (
                      <div key={currentMsgId} className={`flex w-full items-end gap-1.5 msg-action-container ${isMyMsg ? 'justify-end' : 'justify-start'}`}>
                        {!isMyMsg && !msg.isUnsent && (
                          <button onClick={(e) => toggleActionMenu(e, currentMsgId)} className="p-1 text-slate-500 hover:text-slate-300 md:opacity-100 order-1"><MoreVertical size={14} /></button>
                        )}

                        <div className={`relative max-w-[75%] group flex flex-col ${isMyMsg ? 'items-end' : 'items-start'}`}>
                          {isEditingThis ? (
                            <div className="bg-slate-800 border border-slate-700 p-1.5 rounded-xl flex items-center gap-1.5">
                              <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)} className="bg-slate-900 text-xs p-1.5 rounded-lg outline-none text-white" />
                              <button onClick={() => handleEditSubmit(currentMsgId)} className="p-1 bg-green-600 rounded text-white"><Check size={12} /></button>
                              <button onClick={() => setEditingMsgId(null)} className="p-1 bg-slate-700 rounded text-slate-300"><X size={12} /></button>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <div onClick={(e) => !msg.isUnsent && toggleActionMenu(e, currentMsgId)} className={`p-3 rounded-2xl text-sm ${isMyMsg ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-100 rounded-tl-none'} shadow-md cursor-pointer`}>
                                {renderMessageContent(msg)}
                              </div>
                              {!msg.isUnsent && (
                                <div className={`flex items-center mt-1 text-[9px] text-slate-500 font-medium ${isMyMsg ? 'justify-end' : 'justify-start'}`}>
                                  <span>{msg.time}</span>
                                  {isMyMsg && renderTickIndicator(msg)}
                                </div>
                              )}
                            </div>
                          )}

                          <AnimatePresence>
                            {isMenuOpen && !isEditingThis && (
                              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`absolute bg-slate-900 border border-slate-700 rounded-xl p-1 z-50 flex flex-col min-w-[130px] ${isMyMsg ? 'right-0' : 'left-0'} ${dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                                {isMyMsg && (!msg.fileType || msg.fileType === 'text') && <button onClick={() => { setEditingMsgId(currentMsgId); setEditText(msg.text); setActiveMenuMsgId(null); }} className="flex items-center gap-2 text-xs p-2 text-slate-300 hover:bg-slate-700 rounded-lg"><Edit3 size={12} /> Edit</button>}
                                {isMyMsg && <button onClick={() => handleUnsendForEveryone(currentMsgId)} className="flex items-center gap-2 text-xs p-2 text-red-400 hover:bg-red-500/10 rounded-lg"><Ban size={12} /> Unsend</button>}
                                <button onClick={() => handleRemoveForMe(currentMsgId)} className="flex items-center gap-2 text-xs p-2 text-slate-400 hover:bg-slate-700 rounded-lg"><Trash2 size={12} /> Remove</button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {isMyMsg && !msg.isUnsent && (
                          <button onClick={(e) => toggleActionMenu(e, currentMsgId)} className="p-1 text-slate-500 hover:text-slate-300"><MoreVertical size={14} /></button>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input ও বাটন কন্ট্রোল এরিয়া */}
                <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/50 relative shrink-0" ref={popupRef}>
                  <AnimatePresence>
                    {showPicker && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-20 left-2 right-2 sm:left-4 z-50 rounded-2xl bg-slate-800 border border-slate-700 max-w-[310px] flex flex-col overflow-hidden shadow-2xl">
                        <div className="flex bg-slate-900 p-1.5 border-b border-slate-700">
                          <button type="button" onClick={() => setActiveTab('emoji')} className={`flex-1 py-1.5 text-xs font-bold rounded-xl ${activeTab === 'emoji' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Emojis</button>
                          <button type="button" onClick={() => setActiveTab('gif')} className={`flex-1 py-1.5 text-xs font-bold rounded-xl ${activeTab === 'gif' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>GIFs</button>
                        </div>
                        <div className="p-2 bg-slate-800">
                          {activeTab === 'emoji' && <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} width="100%" height={230} skinTonesDisabled searchDisabled />}
                          {activeTab === 'gif' && (
                            <div>
                              <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-2 mb-2"><Search size={14} /><input type="text" placeholder="Search GIFs..." value={gifSearch} onChange={(e) => setGifSearch(e.target.value)} className="bg-transparent text-xs outline-none w-full" /></div>
                              <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">{gifs.map((url, i) => <img key={i} src={url} alt="gif" onClick={() => handleGifSelect(url)} className="w-full h-16 object-cover rounded-lg cursor-pointer" />)}</div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <input type="file" ref={fileInputRef} onChange={handleFileShare} accept="image/*,video/*" className="hidden" />

                  <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                    <button type="button" onClick={() => setShowPicker(!showPicker)} className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-400"><Smile size={18}/></button>
                    <button type="button" onClick={() => fileInputRef.current.click()} className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-400"><Paperclip size={18}/></button>
                    <input type="text" value={message} onChange={handleInputChange} placeholder="Type a message..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm outline-none text-white focus:border-blue-500" />
                    <button type="submit" className="p-3 bg-blue-600 text-white rounded-xl"><Send size={16}/></button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <div className="max-w-md p-8 bg-slate-900/40 border border-slate-800 rounded-3xl flex flex-col items-center">
                  <MessageSquare size={32} className="text-blue-400 mb-4" />
                  <h2 className="text-xl font-bold mb-2">Hello, {user.name}! 👋</h2>
                  <p className="text-xs text-slate-400">Select an active profile from the directory to start messaging.</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Terms and Conditions Modal */}
      <AnimatePresence>
        {showTermsPopup && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6">
              <h3 className="font-bold text-sm mb-2">Terms & Conditions</h3>
              <p className="text-xs text-slate-400 mb-4">By interacting with this anonymous channel, you agree to follow absolute end-to-end community messaging compliance policies.</p>
              <button type="button" onClick={() => { setAcceptedTermsLogin(true); setShowTermsPopup(false); }} className="w-full bg-blue-600 py-2.5 rounded-xl text-xs font-semibold">Accept & Close</button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Popup Viewer */}
      <AnimatePresence>
        {profileUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-2xl overflow-hidden text-center pb-8 relative">
              <button onClick={() => setProfileUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={18}/></button>
              <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
              <div className="flex justify-center -mt-10 mb-3">{renderAvatar(profileUser, "w-20 h-20")}</div>
              <h2 className="text-lg font-bold">{profileUser.name}</h2>
              <p className="text-xs text-blue-400">{profileUser.gender} • {profileUser.age} Yrs • {profileUser.country}</p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}