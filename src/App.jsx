import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { MessageSquare, Ban } from 'lucide-react';

import LoginForm from './components/auth/LoginForm';
import UsersSidebar from './components/sidebar/UsersSidebar';
import ChatWorkspace from './components/chat/ChatWorkspace';
import TermsModal from './components/modals/TermsModal';
import ProfileModal from './components/modals/ProfileModal';

const SERVER_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://live-chatting-web-app-server.onrender.com';
const GOOGLE_CLIENT_ID = '550936863221-hnd1i9amld9vsijieom0g3nm414g4h8p.apps.googleusercontent.com';

const isoCountries = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bangladesh', 'Belarus', 'Belgium', 'Brazil', 'Canada', 'China', 'Denmark', 'Egypt', 'France', 'Germany', 'India', 'Indonesia', 'Italy', 'Japan', 'Malaysia', 'Mexico', 'Nepal', 'Netherlands', 'New Zealand', 'Pakistan', 'Philippines', 'Russia', 'Saudi Arabia', 'Singapore', 'Spain', 'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'UAE', 'UK', 'USA', 'Vietnam'
];

function App() {
  const socketRef = useRef(null);
  const popupRef = useRef(null);
  const fileInputRef = useRef(null);
  const settingsMenuRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('chat_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [blocked, setBlocked] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(() => {
    const savedPartner = sessionStorage.getItem('active_chat_partner');
    return savedPartner ? JSON.parse(savedPartner) : null;
  });

  const [message, setMessage] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('emoji');
  const [allBlocks, setAllBlocks] = useState({});

  const [gifs, setGifs] = useState([]);
  const [gifSearch, setGifSearch] = useState('');
  const [loadingGifs, setLoadingGifs] = useState(false);

  const [formData, setFormData] = useState({ name: '', age: '', country: 'Bangladesh', gender: 'Male', profilePic: '', isGuest: true });
  const [isHydrating, setIsHydrating] = useState(true);
  const [profileUser, setProfileUser] = useState(null);
  const [genderFilter, setGenderFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');

  const [acceptedTermsLogin, setAcceptedTermsLogin] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showTermsPopup, setShowTermsPopup] = useState(false);

  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});

  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState('bottom');
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showBlockPopup, setShowBlockPopup] = useState(false);

  const [chatHistory, setChatHistory] = useState(() => {
    try {
      const savedChats = localStorage.getItem('global_chat_history_final');
      return savedChats ? JSON.parse(savedChats) : {};
    } catch (e) {
      return {};
    }
  });

  const [unreadCounts, setUnreadCounts] = useState(() => {
    try {
      const savedCounts = localStorage.getItem('global_unread_counts');
      return savedCounts ? JSON.parse(savedCounts) : {};
    } catch (e) {
      return {};
    }
  });

  const selectedUserRef = useRef(null);

  const amIBlockingHim = (partnerName) => {
    if (!user || !allBlocks || !allBlocks[user.name]) return false;
    return allBlocks[user.name].includes(partnerName);
  };

  const isHeBlockingMe = (partnerName) => {
    if (!partnerName || !allBlocks || !allBlocks[partnerName]) return false;
    return allBlocks[partnerName].includes(user?.name);
  };

  useEffect(() => {
    localStorage.setItem('global_unread_counts', JSON.stringify(unreadCounts));
  }, [unreadCounts]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
    if (selectedUser) {
      setUnreadCounts(prev => ({ ...prev, [selectedUser.name]: 0 }));
      sessionStorage.setItem('active_chat_partner', JSON.stringify(selectedUser));
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('chat_opened_or_seen', { fromName: user.name, toSocketId: selectedUser.id });
        socketRef.current.emit('get_chat_history', { sender: user.name, receiver: selectedUser.name });
      }
    }
    setActiveMenuMsgId(null);
    setEditingMsgId(null);
    setShowBlockPopup(false);
    setTimeout(() => scrollToBottom(), 100);
  }, [selectedUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedUser) scrollToBottom();
  }, [chatHistory]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) setShowPicker(false);
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) setShowSettingsMenu(false);
      if (!event.target.closest('.msg-action-container')) setActiveMenuMsgId(null);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    if (!selectedUser || !socketRef.current || amIBlockingHim(selectedUser.name) || isHeBlockingMe(selectedUser.name)) return;

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

  useEffect(() => {
    if (!showPicker || activeTab !== 'gif') return;

    const fetchGifs = async () => {
      setLoadingGifs(true);
      try {
        const query = gifSearch.trim() || 'trending';
        const res = await fetch(`https://api.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=14`);
        const data = await res.json();
        if (data.results) setGifs(data.results.map(g => g.media[0].tinygif.url));
      } catch (err) {
        setGifs([]);
      } finally {
        setLoadingGifs(false);
      }
    };

    const delayDebounce = setTimeout(() => { fetchGifs(); }, 400);
    return () => clearTimeout(delayDebounce);
  }, [gifSearch, showPicker, activeTab]);

  useEffect(() => {
    if (!user) {
      setIsHydrating(false);
      return;
    }

    socketRef.current = io(SERVER_URL, {
      transient: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      const savedUser = sessionStorage.getItem('chat_user');
      const currentUser = savedUser ? JSON.parse(savedUser) : user;

      if (currentUser) {
        socket.emit('join_directory', currentUser);
      }
      setIsHydrating(false);

      if (selectedUserRef.current && currentUser) {
        socket.emit('get_chat_history', {
          sender: currentUser.name.trim(),
          receiver: selectedUserRef.current.name.trim()
        });
      }
    });

    socket.on('load_chat_history', (dbHistory) => {
      if (!selectedUserRef.current) return;

      const formattedHistory = dbHistory.map(msg => ({
        id: msg.msgId,
        sender: msg.senderName === user.name ? 'You' : msg.senderName,
        text: msg.message,
        type: msg.senderName === user.name ? 'outgoing' : 'incoming',
        fileType: msg.fileType || 'text',
        time: msg.timestamp,
        reaction: msg.reaction || null
      }));

      setChatHistory(prev => ({
        ...prev,
        [selectedUserRef.current.name]: formattedHistory
      }));
    });

    socket.on('load_chat_history_from_db', (dbHistory) => {
      setChatHistory(prev => {
        const mergedHistory = { ...prev, ...dbHistory };
        try {
          localStorage.setItem('global_chat_history_final', JSON.stringify(mergedHistory));
        } catch (e) {
          console.error('Local storage limit exceed for large base64 image strings');
        }
        return mergedHistory;
      });
    });

    socket.on('update_directory', (users) => {
      const currentFilteredUsers = users.filter(u => u.name !== user?.name);
      setActiveUsers(currentFilteredUsers);

      if (selectedUserRef.current) {
        const fresh = currentFilteredUsers.find(u => u.name === selectedUserRef.current.name);
        if (fresh) setSelectedUser(fresh);
      }
    });

    socket.on('sync_global_blocks', (blocksData) => { setAllBlocks(blocksData || {}); });
    socket.on('receive_typing_status', ({ senderName, isTyping }) => { setTypingUsers(prev => ({ ...prev, [senderName]: isTyping })); });

    socket.on('partner_marked_seen', ({ fromName }) => {
      if (selectedUserRef.current && selectedUserRef.current.name === fromName) {
        setChatHistory(prev => {
          const userChat = prev[fromName] || [];
          const updatedChat = userChat.map(msg => msg.type === 'outgoing' ? { ...msg, status: 'seen' } : msg);
          return { ...prev, [fromName]: updatedChat };
        });
      }
    });

    socket.on('receive_private_message', ({ fromSocketId, senderName, message, msgId, fileType, timestamp }) => {
      if (socketRef.current && allBlocks && allBlocks[user.name] && allBlocks[user.name].includes(senderName)) return;

      const chatKey = senderName;

      setChatHistory(prev => {
        const userHistory = prev[chatKey] || [];
        if (userHistory.some(msg => msg.id === msgId)) return prev;

        const newMsg = {
          id: msgId,
          sender: senderName,
          text: message,
          type: 'incoming',
          fileType: fileType || 'text',
          time: timestamp
        };
        const updatedChat = [...userHistory, newMsg];

        if (!message.startsWith('[GIF]: ')) {
          try {
            const currentStored = JSON.parse(localStorage.getItem('global_chat_history_final') || '{}');
            currentStored[chatKey] = [...(currentStored[chatKey] || []), newMsg];
            localStorage.setItem('global_chat_history_final', JSON.stringify(currentStored));
          } catch (e) {
            console.error('Local storage error:', e);
          }
        }
        return { ...prev, [chatKey]: updatedChat };
      });

      const isChatWindowOpen = selectedUserRef.current && selectedUserRef.current.name === chatKey;
      socket.emit('message_delivery_ack', { toSocketId: fromSocketId, fromName: user.name, msgId, isSeen: isChatWindowOpen });

      if (!isChatWindowOpen) {
        setUnreadCounts(prev => ({ ...prev, [chatKey]: (prev[chatKey] || 0) + 1 }));
        toast.success(`New message from ${senderName}`);
      }
    });

    socket.on('receive_delivery_ack', ({ fromName, msgId, isSeen }) => {
      setChatHistory(prev => {
        const userChat = prev[fromName] || [];
        const updatedChat = userChat.map(msg => msg.id === msgId ? { ...msg, status: isSeen ? 'seen' : 'delivered' } : msg);
        return { ...prev, [fromName]: updatedChat };
      });
    });

    socket.on('message_deleted_global', ({ msgId }) => {
      if (!selectedUserRef.current) return;
      setChatHistory(prev => {
        const userChat = prev[selectedUserRef.current.name] || [];
        const updatedChat = userChat.map(msg => msg.id === msgId ? { ...msg, text: '🚫 This message was unsent', isUnsent: true, fileType: 'text' } : msg);
        return { ...prev, [selectedUserRef.current.name]: updatedChat };
      });
    });

    socket.on('message_reaction_global', ({ msgId, reaction, fromName }) => {
      setChatHistory(prev => {
        const userChat = prev[fromName] || [];
        const updatedChat = userChat.map(msg => msg.id === msgId ? { ...msg, reaction: msg.reaction === reaction ? null : reaction } : msg);
        return { ...prev, [fromName]: updatedChat };
      });
    });

    socket.on('message_edited_global', ({ msgId, newText }) => {
      if (!selectedUserRef.current) return;
      setChatHistory(prev => {
        const userChat = prev[selectedUserRef.current.name] || [];
        const updatedChat = userChat.map(msg => msg.id === msgId ? { ...msg, text: newText, isEdited: true } : msg);
        return { ...prev, [selectedUserRef.current.name]: updatedChat };
      });
    });

    return () => { socket.disconnect(); };
  }, [user]);

  const handleBlockToggle = () => {
    if (!selectedUser) return;
    if (amIBlockingHim(selectedUser.name)) {
      socketRef.current.emit('unblock_user_global', { blockerName: user.name, blockedName: selectedUser.name });
      toast.success(`Unblocked ${selectedUser.name}`);
    } else {
      socketRef.current.emit('block_user_global', { blockerName: user.name, blockedName: selectedUser.name });
      toast.error(`Blocked ${selectedUser.name}`);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert('Image too large! Max 2MB.');
      const reader = new FileReader();
      reader.onloadend = () => { setFormData({ ...formData, profilePic: reader.result }); };
      reader.readAsDataURL(file);
    }
  };

  const handleFileShare = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedUser) return;

    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      alert('⚠️ You cannot upload files larger than 25MB!');
      e.target.value = '';
      return;
    }

    if (amIBlockingHim(selectedUser.name) || isHeBlockingMe(selectedUser.name)) return toast.error('Action restricted!');

    const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
    if (!fileType) return alert('Only images and videos are supported.');

    const reader = new FileReader();
    reader.onloadend = () => { executeSendMessage(reader.result, fileType); };
    reader.readAsDataURL(file);
  };

  const handleGuestLogin = async (e) => {
    e.preventDefault();
    if (!formData.age) {
      toast.error('Please fill your Age, Country, Gender first, then click Google Login!');
      return;
    }
    if (Number(formData.age) < 18) {
      window.alert('You must be at least 18 years old to use this site.');
      return;
    }
    if (!formData.name.trim()) return toast.error('Name is required!');
    if (!acceptedTermsLogin) return toast.error('Please accept the Terms & Conditions.');
    executeLoginAPI({ ...formData, isGuest: true });
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    if (!formData.age) {
      toast.error('Please fill your Age, Country, Gender first, then click Google Login!');
      return;
    }
    if (Number(formData.age) < 18) {
      window.alert('You must be at least 18 years old to use this site.');
      return;
    }
    if (!acceptedTermsLogin) return toast.error('Please accept the Terms & Conditions.');

    try {
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const googleUser = JSON.parse(jsonPayload);

      const permanentUserData = {
        name: googleUser.name.replace(/\s+/g, '').slice(0, 10) + Math.floor(100 + Math.random() * 900),
        age: formData.age,
        country: formData.country,
        gender: formData.gender,
        profilePic: googleUser.picture,
        isGuest: false
      };

      executeLoginAPI(permanentUserData);
    } catch (err) {
      toast.error('Google Auth Decode Failed!');
    }
  };

  const executeLoginAPI = async (payloadData) => {
    try {
      const response = await fetch(`${SERVER_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadData)
      });
      const data = await response.json();
      if (!response.ok) return toast.error(data.message);

      const finalUser = data.user || payloadData;
      sessionStorage.setItem('chat_user', JSON.stringify(finalUser));
      setUser(finalUser);
      toast.success(finalUser.isGuest ? 'Logged in as Guest! 🕵️' : 'Verified with Google permanently! 🔒');
    } catch (error) {
      toast.error('Backend Server is Offline!');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser) return;
    if (amIBlockingHim(selectedUser.name)) return toast.error('You have blocked this user!');
    if (isHeBlockingMe(selectedUser.name)) return toast.error('You cannot send messages.');
    executeSendMessage(message, 'text');
  };

  const executeSendMessage = (textToSend, fileType = 'text') => {
    if (!selectedUser || !socketRef.current) return;
    const currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const uniqueMsgId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    socketRef.current.emit('send_private_message', {
      toSocketId: selectedUser.id,
      message: textToSend,
      msgId: uniqueMsgId,
      fileType,
      timestamp: currentTimeStr,
      senderName: user.name,
      receiverName: selectedUser.name
    });

    const chatKey = selectedUser.name;

    setChatHistory(prev => {
      const newMsg = { id: uniqueMsgId, sender: 'You', text: textToSend, type: 'outgoing', fileType, time: currentTimeStr, status: 'sent' };
      const updatedChat = [...(prev[chatKey] || []), newMsg];

      if (!textToSend.startsWith('[GIF]: ')) {
        try {
          const currentStored = JSON.parse(localStorage.getItem('global_chat_history_final') || '{}');
          currentStored[chatKey] = [...(currentStored[chatKey] || []), newMsg];
          localStorage.setItem('global_chat_history_final', JSON.stringify(currentStored));
        } catch (e) {
          console.error('Local storage error:', e);
        }
      }
      return { ...prev, [chatKey]: updatedChat };
    });

    if (fileType === 'text') setMessage('');
    setShowPicker(false);
  };

  const handleUnsendForEveryone = (msgId) => {
    socketRef.current.emit('delete_message_global', { toSocketId: selectedUser.id, msgId });
    setChatHistory(prev => {
      const updatedChat = (prev[selectedUser.name] || []).map(msg => msg.id === msgId ? { ...msg, text: '🚫 You unsent a message', isUnsent: true, fileType: 'text' } : msg);
      return { ...prev, [selectedUser.name]: updatedChat };
    });
    setActiveMenuMsgId(null);
  };

  const handleRemoveForMe = (msgId) => {
    setChatHistory(prev => ({ ...prev, [selectedUser.name]: (prev[selectedUser.name] || []).filter(msg => msg.id !== msgId) }));
    setActiveMenuMsgId(null);
  };

  const handleMessageReaction = (msgId, emoji) => {
    if (!selectedUser || !socketRef.current) return;

    setChatHistory(prev => {
      const chatKey = selectedUser.name;
      const userChat = prev[chatKey] || [];

      const updatedChat = userChat.map(msg => {
        const currentMsgId = msg.id || msg._id;

        if (currentMsgId === msgId) {
          const nextReaction = msg.reaction === emoji ? null : emoji;
          socketRef.current.emit('send_message_reaction', {
            toSocketId: selectedUser.id,
            msgId,
            reaction: nextReaction,
            senderName: user.name
          });
          return { ...msg, reaction: nextReaction };
        }
        return msg;
      });

      return { ...prev, [chatKey]: updatedChat };
    });
  };

  const handleEditSubmit = (msgId) => {
    socketRef.current.emit('edit_message_global', { toSocketId: selectedUser.id, msgId, newText: editText });
    setChatHistory(prev => {
      const updatedChat = (prev[selectedUser.name] || []).map(msg => msg.id === msgId ? { ...msg, text: editText, isEdited: true } : msg);
      return { ...prev, [selectedUser.name]: updatedChat };
    });
    setEditingMsgId(null);
  };

  const toggleActionMenu = (e, msgId) => {
    if (activeMenuMsgId === msgId) return setActiveMenuMsgId(null);
    setDropdownPosition(window.innerHeight - e.clientY < 160 ? 'top' : 'bottom');
    setActiveMenuMsgId(msgId);
  };

  const handleGifSelect = (gifUrl) => {
    if (amIBlockingHim(selectedUser.name) || isHeBlockingMe(selectedUser.name)) return toast.error('Action blocked!');
    executeSendMessage(`[GIF]: ${gifUrl}`, 'text');
  };

  const onEmojiClick = (emojiData) => setMessage(prev => prev + emojiData.emoji);
  const handleLogout = () => { sessionStorage.clear(); localStorage.clear(); window.location.reload(); };

  const renderMessageContent = (msg) => {
    if (msg.isUnsent) return <p className="italic text-slate-500 text-xs flex items-center gap-1.5"><Ban size={12} /> {msg.text}</p>;
    if (msg.fileType === 'image') return <img src={msg.text} alt="Shared" className="rounded-xl max-w-[240px] border border-slate-800 shadow-md cursor-zoom-in hover:scale-102 transition duration-200" />;
    if (msg.fileType === 'video') return <video src={msg.text} controls className="rounded-xl max-w-[240px] border border-slate-800 shadow-md" />;
    if (msg.text.startsWith('[GIF]: ')) return <img src={msg.text.replace('[GIF]: ', '')} alt="gif" className="rounded-xl max-w-[200px] border border-slate-850 shadow-md" />;
    return <div><p className="break-words leading-relaxed whitespace-pre-wrap">{msg.text}</p>{msg.isEdited && <span className="text-[8px] text-indigo-300 block text-right mt-1 opacity-70">(edited)</span>}</div>;
  };

  const renderTickIndicator = (msg) => {
    if (msg.status === 'seen') return <span className="text-emerald-400 font-extrabold text-[11px] ml-1">✓✓</span>;
    if (msg.status === 'delivered') return <span className="text-slate-400 font-bold text-[11px] ml-1">✓✓</span>;
    return <span className="text-slate-600 font-medium text-[11px] ml-1">✓</span>;
  };

  if (user && Number(user.age) < 18) {
    window.alert('Access denied: you must be at least 18 years old to use this site.');
    sessionStorage.clear();
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <h1 className="text-2xl font-bold">Access Restricted</h1>
      </div>
    );
  }

  if (isHydrating) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white relative overflow-hidden">
        <div className="bg-glow-orb-1"></div>
        <div className="bg-glow-orb-2"></div>
        <div className="relative z-10 flex flex-col items-center gap-4 animate-pulse">
          <div className="w-16 h-16 rounded-3xl glass-panel flex items-center justify-center shadow-indigo-500/20 shadow-2xl border border-indigo-500/30">
            <MessageSquare className="text-indigo-400 animate-bounce" size={32} />
          </div>
          <h1 className="text-sm font-bold tracking-wider uppercase bg-gradient-to-r from-indigo-200 to-slate-200 bg-clip-text text-transparent">Initializing AuraChat</h1>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="h-screen w-screen bg-slate-950 text-slate-100 flex relative overflow-hidden fixed inset-0 overscroll-none select-none font-sans">
        <div className="bg-glow-orb-1" />
        <div className="bg-glow-orb-2" />

        <Toaster position="top-center" containerStyle={{ zIndex: 99999 }} />

        {!user ? (
          <LoginForm
            formData={formData}
            setFormData={setFormData}
            acceptedTermsLogin={acceptedTermsLogin}
            setAcceptedTermsLogin={setAcceptedTermsLogin}
            handleImageUpload={handleImageUpload}
            handleGuestLogin={handleGuestLogin}
            handleGoogleLoginSuccess={handleGoogleLoginSuccess}
            isoCountries={isoCountries}
            setShowTermsPopup={setShowTermsPopup}
          />
        ) : (
          <>
            <UsersSidebar
              user={user}
              activeUsers={activeUsers}
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              setProfileUser={setProfileUser}
              handleLogout={handleLogout}
              unreadCounts={unreadCounts}
              typingUsers={typingUsers}
              genderFilter={genderFilter}
              setGenderFilter={setGenderFilter}
              countryFilter={countryFilter}
              setCountryFilter={setCountryFilter}
              amIBlockingHim={amIBlockingHim}
              isHeBlockingMe={isHeBlockingMe}
              isoCountries={isoCountries}
              showSettingsMenu={showSettingsMenu}
              setShowSettingsMenu={setShowSettingsMenu}
              setShowTermsPopup={setShowTermsPopup}
            />

            <ChatWorkspace
              user={user}
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              setProfileUser={setProfileUser}
              chatHistory={chatHistory}
              typingUsers={typingUsers}
              activeMenuMsgId={activeMenuMsgId}
              setActiveMenuMsgId={setActiveMenuMsgId}
              dropdownPosition={dropdownPosition}
              setDropdownPosition={setDropdownPosition}
              editingMsgId={editingMsgId}
              setEditingMsgId={setEditingMsgId}
              editText={editText}
              setEditText={setEditText}
              message={message}
              setMessage={setMessage}
              handleInputChange={handleInputChange}
              handleSendMessage={handleSendMessage}
              showPicker={showPicker}
              setShowPicker={setShowPicker}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              gifs={gifs}
              gifSearch={gifSearch}
              setGifSearch={setGifSearch}
              loadingGifs={loadingGifs}
              handleGifSelect={handleGifSelect}
              onEmojiClick={onEmojiClick}
              handleFileShare={handleFileShare}
              fileInputRef={fileInputRef}
              popupRef={popupRef}
              showBlockPopup={showBlockPopup}
              setShowBlockPopup={setShowBlockPopup}
              handleBlockToggle={handleBlockToggle}
              handleMessageReaction={handleMessageReaction}
              handleEditSubmit={handleEditSubmit}
              handleUnsendForEveryone={handleUnsendForEveryone}
              handleRemoveForMe={handleRemoveForMe}
              amIBlockingHim={amIBlockingHim}
              isHeBlockingMe={isHeBlockingMe}
              renderMessageContent={renderMessageContent}
              renderTickIndicator={renderTickIndicator}
              toggleActionMenu={toggleActionMenu}
              messagesEndRef={messagesEndRef}
            />
          </>
        )}

        <TermsModal
          showTermsPopup={showTermsPopup}
          setAcceptedTermsLogin={setAcceptedTermsLogin}
          setShowTermsPopup={setShowTermsPopup}
        />

        <ProfileModal profileUser={profileUser} setProfileUser={setProfileUser} />
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
export { App };
