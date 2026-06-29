import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Send, LogOut, X, Camera, MessageSquare, ArrowLeft, Smile, Search, MoreVertical, Ban, Paperclip, Trash2, Edit3, Check, Settings, ShieldAlert, Key } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const SERVER_URL = window.location.hostname === 'localhost' 
  ? "http://localhost:5000" 
  : "https://live-chatting-web-app-server.onrender.com"; // 👈 এখানে তোর লাইভ সার্ভারের ইউআরএল বসাবি
const GOOGLE_CLIENT_ID = "550936863221-hnd1i9amld9vsijieom0g3nm414g4h8p.apps.googleusercontent.com";

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
    } catch (e) { return {}; }
  });
  
  const [unreadCounts, setUnreadCounts] = useState(() => {
    try {
      const savedCounts = localStorage.getItem('global_unread_counts');
      return savedCounts ? JSON.parse(savedCounts) : {};
    } catch (e) { return {}; }
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

  // চ্যাট পার্টনার সিলেক্ট হওয়ার ওয়াচ-ইফেক্ট
  useEffect(() => {
    selectedUserRef.current = selectedUser;
    if (selectedUser) {
      setUnreadCounts(prev => ({ ...prev, [selectedUser.name]: 0 }));
      sessionStorage.setItem('active_chat_partner', JSON.stringify(selectedUser));
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('chat_opened_or_seen', { fromName: user.name, toSocketId: selectedUser.id });
        
        // নতুন চ্যাট পার্টনার সিলেক্ট হলেই ডাটাবেজ থেকে ওল্ড হিস্ট্রি চেয়ে পাঠানো হবে
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      } catch (err) { setGifs([]); } finally { setLoadingGifs(false); }
    };
    const delayDebounce = setTimeout(() => { fetchGifs(); }, 400);
    return () => clearTimeout(delayDebounce);
  }, [gifSearch, showPicker, activeTab]);

  // 🌟 [সকেটের মূল বড় USEEFFECT ব্লক] 🌟
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

    // 1. Database theke old history load er listener (Fixed with Reaction)
    socket.on('load_chat_history', (dbHistory) => {
      if (!selectedUserRef.current) return;
      
      const formattedHistory = dbHistory.map(msg => ({
        id: msg.msgId,
        sender: msg.senderName === user.name ? 'You' : msg.senderName,
        text: msg.message, 
        type: msg.senderName === user.name ? 'outgoing' : 'incoming',
        fileType: msg.fileType || 'text',
        time: msg.timestamp,
        // 🔥 ডাটাবেজ থেকে রিঅ্যাকশন ডাটা ফ্রন্টএন্ডের জন্য রিসিভ করা হলো
        reaction: msg.reaction || null 
      }));

      setChatHistory(prev => ({
        ...prev,
        [selectedUserRef.current.name]: formattedHistory
      }));
    });
    // 2. Local storage load listener block
    socket.on('load_chat_history_from_db', (dbHistory) => {
      setChatHistory(prev => {
        const mergedHistory = { ...prev, ...dbHistory };
        try {
          localStorage.setItem('global_chat_history_final', JSON.stringify(mergedHistory));
        } catch (e) {
          console.error("Local storage limit exceed for large base64 image strings");
        }
        return mergedHistory;
      });
    });

    // 🎯 সকেট থেকে অনলাইন ইউজার লিস্ট আপডেট হওয়ার লজিক (AI Bot সম্পূর্ণ রিমুভড)
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

    // 🔔 ফ্রন্টএন্ডে রিয়েল-টাইম প্রাইভেট মেসেজ রিসিভ করার ফিক্সড ফাংশন (AI সম্পূর্ণ রিমুভড)
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
          } catch(e) {
            console.error("Local storage error:", e);
          }
        }
        return { ...prev, [chatKey]: updatedChat };
      });

      // 🎯 [ফিক্স ২]: বর্তমানে চ্যাট উইন্ডো খোলা আছে কিনা তা নিখুঁতভাবে চেক করা (রিয়েল ইউজার ধরে)
      const isChatWindowOpen = selectedUserRef.current && selectedUserRef.current.name === chatKey;

      // মেসেজ ডেলিভারি একনলেজমেন্ট পাঠানো (সরাসরি অন্য ইউজারের কাছে যাবে)
      socket.emit('message_delivery_ack', { toSocketId: fromSocketId, fromName: user.name, msgId, isSeen: isChatWindowOpen });

      // যদি ওই চ্যাটবক্সটি ওপেন করা না থাকে, তবে আনরিড কাউন্ট বাড়বে এবং নোটিফিকেশন দেখাবে
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
        const updatedChat = userChat.map(msg => msg.id === msgId ? { ...msg, text: "🚫 This message was unsent", isUnsent: true, fileType: 'text' } : msg);
        return { ...prev, [selectedUserRef.current.name]: updatedChat };
      });
    });

    // 🎭 রিয়েল-টাইম রিঅ্যাকশন রিসিভ করা
    socket.on('message_reaction_global', ({ msgId, reaction, fromName }) => {
      setChatHistory(prev => {
        const userChat = prev[fromName] || [];
        const updatedChat = userChat.map(msg => 
          msg.id === msgId ? { ...msg, reaction: msg.reaction === reaction ? null : reaction } : msg
        );
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
      if (file.size > 2 * 1024 * 1024) return alert("Image too large! Max 2MB.");
      const reader = new FileReader();
      reader.onloadend = () => { setFormData({ ...formData, profilePic: reader.result }); };
      reader.readAsDataURL(file);
    }
  };

  const handleFileShare = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedUser) return;
    
    // ২৫ এমবি (25MB) ফাইল সাইজ চেক করার লজিক
    const MAX_FILE_SIZE = 25 * 1024 * 1024; 
    if (file.size > MAX_FILE_SIZE) {
      alert("⚠️ You cannot upload files larger than 25MB!");
      e.target.value = ""; 
      return; 
    }

    if (amIBlockingHim(selectedUser.name) || isHeBlockingMe(selectedUser.name)) return toast.error("Action restricted!");
    
    let fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;
    if (!fileType) return alert("Only images and videos are supported.");

    const reader = new FileReader();
    reader.onloadend = () => { executeSendMessage(reader.result, fileType); };
    reader.readAsDataURL(file);
  };

  const handleGuestLogin = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.age) return toast.error("Name and Age are required!");
    if (!acceptedTermsLogin) return toast.error("Please accept the Terms & Conditions.");
    executeLoginAPI({ ...formData, isGuest: true });
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    if (!formData.age) return toast.error("Please fill your Age, Country, Gender first, then click Google Login!");
    if (!acceptedTermsLogin) return toast.error("Please accept the Terms & Conditions.");
    
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
      toast.error("Google Auth Decode Failed!");
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
      toast.success(finalUser.isGuest ? "Logged in as Guest! 🕵️" : "Verified with Google permanently! 🔒");
    } catch (error) {
      toast.error("Backend Server is Offline!");
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedUser) return;
    if (amIBlockingHim(selectedUser.name)) return toast.error("You have blocked this user!");
    if (isHeBlockingMe(selectedUser.name)) return toast.error("You cannot send messages.");
    executeSendMessage(message, 'text');
  };

  const executeSendMessage = (textToSend, fileType = 'text') => {
    if (!selectedUser || !socketRef.current) return;
    const currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const uniqueMsgId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // সকেটের মাধ্যমে ব্যাকএন্ডে মেসেজ পাঠানোর পরিচ্ছন্ন অবজেক্ট (কোনো AI ফিল্টারিং ছাড়া)
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
        } catch (e) {}
      }
      return { ...prev, [chatKey]: updatedChat };
    });
    
    if (fileType === 'text') setMessage('');
    setShowPicker(false);
  };

  const handleUnsendForEveryone = (msgId) => {
    socketRef.current.emit('delete_message_global', { toSocketId: selectedUser.id, msgId });
    setChatHistory(prev => {
      const updatedChat = (prev[selectedUser.name] || []).map(msg => msg.id === msgId ? { ...msg, text: "🚫 You unsent a message", isUnsent: true, fileType: 'text' } : msg);
      return { ...prev, [selectedUser.name]: updatedChat };
    });
    setActiveMenuMsgId(null);
  };

  const handleRemoveForMe = (msgId) => {
    setChatHistory(prev => { return { ...prev, [selectedUser.name]: (prev[selectedUser.name] || []).filter(msg => msg.id !== msgId) }; });
    setActiveMenuMsgId(null);
  };

 // 🎭 পিওর সকেট ও ডাটাবেজ ব্যাকড রিঅ্যাকশন হ্যান্ডলার
  const handleMessageReaction = (msgId, emoji) => {
    if (!selectedUser || !socketRef.current) return;

    setChatHistory(prev => {
      const chatKey = selectedUser.name;
      const userChat = prev[chatKey] || [];
      
      const updatedChat = userChat.map(msg => {
        // তোর ডাটাবেজের আইডি সাধারণত '_id' বা 'id' হয়, সেটা চেক করে ম্যাচ করছি
        const currentMsgId = msg.id || msg._id; 
        
        if (currentMsgId === msgId) {
          const nextReaction = msg.reaction === emoji ? null : emoji;
          
          // 🚀 সরাসরি ব্যাকএন্ড সকেটে হিট পাঠাচ্ছি (যা ডাটাবেজে সেভ করবে)
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

      // লোকাল স্টোরেজের কোড এখান থেকে হাওয়া!
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
    if (amIBlockingHim(selectedUser.name) || isHeBlockingMe(selectedUser.name)) return toast.error("Action blocked!");
    executeSendMessage(`[GIF]: ${gifUrl}`, 'text');
  };
  
  const onEmojiClick = (emojiData) => setMessage(prev => prev + emojiData.emoji);
  const handleLogout = () => { sessionStorage.clear(); localStorage.clear(); window.location.reload(); };


  const renderAvatar = (targetUser, sizeClass = "w-10 h-10", isActive = false) => {
    if (!targetUser) return <div className={`${sizeClass} rounded-full bg-slate-800 animate-pulse`} />;
    const isFemale = targetUser.profilePic === 'ICON_FEMALE' || targetUser.gender === 'Female';
    const isCustomPic = targetUser.profilePic && targetUser.profilePic !== 'ICON_MALE' && targetUser.profilePic !== 'ICON_FEMALE';
    
    return (
      <div className="relative shrink-0 select-none">
        {isCustomPic ? (
          <img src={targetUser.profilePic} className={`${sizeClass} rounded-full object-cover border border-slate-800 shadow-md`} alt="avatar" />
        ) : (
          <div className={`${sizeClass} rounded-full flex items-center justify-center border ${isFemale ? "bg-pink-500/10 text-pink-400 border-pink-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"} p-1.5 shadow-md`}>
            <User className="w-full h-full" />
          </div>
        )}
        {isActive && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-slate-950 rounded-full status-indicator-glow animate-pulse" />
        )}
      </div>
    );
  };

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
        {/* Global background glow elements */}
        <div className="bg-glow-orb-1" />
        <div className="bg-glow-orb-2" />

        <Toaster position="top-center" containerStyle={{ zIndex: 99999 }} />

        {!user ? (
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
                  <input type="text" placeholder="e.g. JohnDeo" className="w-full glass-input rounded-xl p-3 mt-1.5 outline-none text-white text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20" onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold tracking-wide">Age <span className="text-rose-500">*</span></label>
                    <input type="number" placeholder="Required" className="w-full glass-input rounded-xl p-3 mt-1.5 outline-none text-white text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20" onChange={e => setFormData({...formData, age: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase font-bold tracking-wide">Gender</label>
                    <select className="w-full glass-input rounded-xl p-3 mt-1.5 outline-none text-white text-sm focus:border-indigo-500/50 cursor-pointer" onChange={e => setFormData({...formData, gender: e.target.value})}>
                      <option value="Male" className="bg-slate-900">Male</option>
                      <option value="Female" className="bg-slate-900">Female</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold tracking-wide">Country</label>
                  <select value={formData.country} className="w-full glass-input rounded-xl p-3 mt-1.5 outline-none text-white text-sm focus:border-indigo-500/50 cursor-pointer" onChange={e => setFormData({...formData, country: e.target.value})}>
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
                      onError={() => toast.error("Google Login Failed!")}
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
        ) : (
          <>
            {/* Sidebar user directory list */}
            <div className={`w-full md:w-[350px] lg:w-[380px] border-r border-slate-900/60 flex flex-col bg-slate-950/70 backdrop-blur-xl h-full relative z-20 shrink-0 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-4 border-b border-slate-900/60 flex justify-between items-center shrink-0 bg-slate-900/20">
                <button onClick={() => setProfileUser(user)} className="flex items-center gap-3 p-1.5 rounded-2xl text-left hover:bg-slate-800/40 transition duration-200 cursor-pointer">
                  {renderAvatar(user, "w-9 h-9")}
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
                      className={`p-3 rounded-2xl cursor-pointer flex items-center justify-between transition-all duration-300 border ${
                        isSelected 
                          ? 'bg-indigo-600/10 border-indigo-500/50 shadow-md shadow-indigo-950/20' 
                          : 'bg-slate-900/15 border-slate-900/30 hover:bg-slate-800/15 hover:border-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div onClick={(e) => { e.stopPropagation(); setProfileUser(u); }} className="shrink-0">
                          {renderAvatar(u, "w-10 h-10", true)}
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

              <div className="p-3.5 border-t border-slate-900/60 bg-slate-950/50 relative shrink-0" ref={settingsMenuRef}>
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
                      <button type="button" onClick={() => toast('Security Active.', { icon: '🔒' })} className="w-full text-left text-xs p-2 text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 transition duration-150 cursor-pointer"><Key size={14}/> Verification</button>
                      <button type="button" onClick={() => { setShowTermsPopup(true); setShowSettingsMenu(false); }} className="w-full text-left text-xs p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg flex items-center gap-2 transition duration-150 cursor-pointer"><ShieldAlert size={14}/> Terms & Conditions</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Chat Workspace Area */}
            <div className={`fixed inset-0 md:relative w-full md:w-[calc(100%-350px)] lg:w-[calc(100%-380px)] flex flex-col bg-slate-950/40 backdrop-blur-md z-40 md:z-auto ${selectedUser ? 'flex text-slate-200' : 'hidden md:flex'}`}>
              {selectedUser ? (
                <>
                  <div className="p-4 border-b border-slate-900/60 flex items-center justify-between bg-slate-950/60 backdrop-blur-lg shrink-0 sticky top-0 z-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={() => setSelectedUser(null)} className="p-2 bg-slate-900/60 border border-slate-800 rounded-xl md:hidden text-slate-300 cursor-pointer"><ArrowLeft size={18} /></button>
                      <div className="flex items-center gap-3 cursor-pointer min-w-0" onClick={() => setProfileUser(selectedUser)}>
                        {renderAvatar(selectedUser, "w-10 h-10", true)}
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
                          transition={{ duration: 0.2, ease: "easeOut" }}
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
                                  <div className={`absolute z-50 flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-full shadow-2xl 
                                    opacity-0 scale-95 pointer-events-none 
                                    group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto 
                                    transition-all duration-200 ease-out
                                    ${dropdownPosition === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} 
                                    ${isMyMsg ? 'right-0' : 'left-0'}`}
                                    style={{ transformOrigin: dropdownPosition === 'top' ? 'bottom' : 'top' }}
                                  >
                                    {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                                      <button 
                                        key={emoji} 
                                        type="button"
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          handleMessageReaction(currentMsgId, emoji); 
                                        }} 
                                        className="hover:scale-125 active:scale-95 transition-transform text-sm px-1 cursor-pointer"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}

                                <div 
                                  onClick={(e) => !msg.isUnsent && toggleActionMenu(e, currentMsgId)} 
                                  className={`p-3.5 px-4 rounded-2xl text-sm shadow-md cursor-pointer relative transition-all duration-200 ${
                                    isMyMsg 
                                      ? 'message-bubble-outgoing rounded-tr-none text-white' 
                                      : 'message-bubble-incoming rounded-tl-none text-slate-100'
                                  }`}
                                >
                                  {renderMessageContent(msg)}
                                  
                                  {msg.reaction && (
                                    <div className={`absolute -bottom-2.5 ${isMyMsg ? 'left-3' : 'right-3'} bg-slate-850 border border-slate-700 rounded-full px-2 py-0.5 text-[10px] shadow-md select-none z-10 animate-slide-up-fade`}>
                                      {msg.reaction}
                                    </div>
                                  )}
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

                  <div className="p-3 sm:p-4 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md shrink-0 relative z-30" ref={popupRef}>
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
                          <button type="button" onClick={() => setShowPicker(!showPicker)} className="p-3.5 bg-slate-900 border border-slate-800/80 rounded-2xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition duration-150 cursor-pointer"><Smile size={18}/></button>
                          <button type="button" onClick={() => fileInputRef.current.click()} className="p-3.5 bg-slate-900 border border-slate-800/80 rounded-2xl text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition duration-150 cursor-pointer"><Paperclip size={18}/></button>
                          <input type="text" value={message} onChange={handleInputChange} placeholder="Type a message..." className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 px-4 text-sm outline-none text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition duration-150" />
                          <button type="submit" className="p-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl shadow-lg transition duration-150 active:scale-95 cursor-pointer"><Send size={16}/></button>
                        </form>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-slate-950 to-slate-900/50 relative">
                  <div className="max-w-md p-8 bg-slate-900/20 border border-slate-800/50 rounded-3xl flex flex-col items-center backdrop-blur-md shadow-2xl relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 shadow-lg shadow-indigo-950/50">
                      <MessageSquare size={32} />
                    </div>
                    <h2 className="text-xl font-bold mb-2 bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">Hello, {user.name}! 👋</h2>
                    <p className="text-xs text-slate-400 max-w-[280px] leading-relaxed">Select an active profile from the sidebar directory to start exchanging messages securely.</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

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

        <AnimatePresence>
          {profileUser && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="bg-slate-900/95 border border-slate-800/80 w-full max-w-sm rounded-3xl overflow-hidden text-center pb-8 shadow-2xl relative z-10">
                <button onClick={() => setProfileUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition duration-150 cursor-pointer"><X size={18}/></button>
                <div className="h-24 bg-gradient-to-r from-indigo-600 to-violet-600"></div>
                <div className="flex justify-center -mt-10 mb-4">
                  <div className="ring-4 ring-slate-900 rounded-full shadow-2xl">
                    {renderAvatar(profileUser, "w-20 h-20")}
                  </div>
                </div>
                <h2 className="text-lg font-bold text-white mb-1">{profileUser.name}</h2>
                <p className="text-xs font-medium text-indigo-400 px-3 py-1 bg-indigo-500/10 rounded-full inline-block border border-indigo-500/20">{profileUser.gender} • {profileUser.age} Yrs • {profileUser.country}</p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </GoogleOAuthProvider>
  );
}