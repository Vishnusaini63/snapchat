import React, { useEffect, useState, useRef } from "react";
import "../styles/chat.css";
import axios from "axios"; // 🔥 Import Axios

import socket from "./socket.js";
import FriendProfileView from "./FriendProfileView.jsx"; // 🔥 NEW: Import FriendProfileView
import Camera from "./Camera.jsx"; // 🔥 NEW: Import Camera for Live Capture
import Call from "./Call";
const ringtone = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
const receiveSound = new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3");
const themes = {
  default: '#fafafa',
  dark: '#0f172a',
  ocean: 'linear-gradient(135deg, #667eea, #764ba2)',
  sunset: 'linear-gradient(135deg, #ff7e5f, #feb47b)',
  neon: 'linear-gradient(135deg, #00c6ff, #0072ff)',
  snapchat: 'linear-gradient(135deg, #FFFC00, #00c6ff)'
};

const formatDateLabel = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

const ChatBox = ({ friend, onBack, user }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]); // 🔥 Initial empty, fetch from DB
  const [typing, setTyping] = useState(false);
  const [isFriendInChat, setIsFriendInChat] = useState(false); // 🔥 Dancing status
  const [showScrollBtn, setShowScrollBtn] = useState(false); // 🔥 NEW: Scroll button visibility
  const chatBodyRef = useRef(null); // 🔥 NEW: Ref for scroll container
  const [isFriendRecording, setIsFriendRecording] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [friendStatus, setFriendStatus] = useState("");
  const [contextMenu, setContextMenu] = useState(null); // Popup state
  const [replyTo, setReplyTo] = useState(null); // Reply state
  const [editingMessage, setEditingMessage] = useState(null); // Edit state
  const [deletePopup, setDeletePopup] = useState(null);
  const [showFriendProfile, setShowFriendProfile] = useState(false); // 🔥 NEW: State for friend profile view
  const [previewMedia, setPreviewMedia] = useState(null); // 🔥 NEW: State for media preview
  const [editPopup, setEditPopup] = useState(null);
const inputRef = useRef(null);
const [showMenu, setShowMenu] = useState(false);
const [showSelectOptions, setShowSelectOptions] = useState(null); // 🔥 Choice popup state
const [isSelectMode, setIsSelectMode] = useState(false); // 🔥 Multi-select mode
const [selectedMessages, setSelectedMessages] = useState([]); // 🔥 Track IDs
const [showForwardPicker, setShowForwardPicker] = useState(false); // 🔥 Forward modal
const [friendsList, setFriendsList] = useState([]); // 🔥 Friends for forwarding
const [chatWallpaper, setChatWallpaper] = useState(null);
const fileInputDocRef = useRef(null);
const fileInputRef = useRef(null);
const [showLiveCamera, setShowLiveCamera] = useState(false); // 🔥 State for live camera
const [showThemePopup, setShowThemePopup] = useState(false);
const [chatTheme, setChatTheme] = useState("default");
const [wallpaperType, setWallpaperType] = useState("everyone");
const [recording, setRecording] = useState(false);
const mediaRecorderRef = useRef(null);
const isCancelledRef = useRef(false);
const [recordingTime, setRecordingTime] = useState(0);
const [deleteAfter, setDeleteAfter] = useState("never");
const [isCallMuted, setIsCallMuted] = useState(false);
const emojiCategories = [
  {
    name: "Smileys & Emotion",
    emojis: ["😀", "😂", "😊", "😍", "🤩", "🤔", "🥳", "😇", "🥰", "😋", "😎", "😭", "🥺", "😡", "🤯", "😴", "😷", "🤒", "🤑", "😈"]
  },
  {
    name: "People & Body",
    emojis: ["👋", "👍", "👏", "🙏", "💪", "🧑‍🤝‍🧑", "🚶", "🏃", "💃", "🕺", "👨", "👩", "👶", "👴", "👵", "👮", "🧑‍⚕️", "🧑‍🎓", "🧑‍🏫", "🧑‍🍳"]
  },
  {
    name: "Animals & Nature",
    emojis: ["🐶", "🐱", "🦁", "🐻", "🐼", "🦊", "🐯", "🐨", "🐒", "🦋", "🌸", "🌳", "🌞", "🌧️", "⚡", "🌈", "🌊", "🔥", "🌍", "🌕"]
  },
  {
    name: "Food & Drink",
    emojis: ["🍕", "🍔", "🍟", "🍎", "🍩", "☕", "🍹", "🍺", "🍷", "🍦", "🎂", "🍪", "🍫", "🍓", "🍇", "🍉", "🍍", "🥑", "🍣", "🍜"]
  },
  {
    name: "Travel & Places",
    emojis: ["🚗", "✈️", "🚆", "🏠", "🏝️", "🏙️", "🗽", "🗼", "🌉", "🗺️", "📍", "🏕️", "🏖️", "🚢", "🚀", "🎡", "🎢", "⛪", "🕌", "⛩️"]
  },
  {
    name: "Activities",
    emojis: ["⚽", "🏏", "🎮", "🎵", "🎯", "🎉", "🎁", "🎤", "🎸", "🥁", "🎨", "🎭", "🎬", "📚", "📖", "✏️", "📝", "📊", "📈", "📉"]
  },
  {
    name: "Symbols",
    emojis: ["❤️", "⭐", "✔️", "❌", "🔔", "♻️", "✅", "❎", "❓", "❕", "❗", "💯", "⚠️", "💡", "🔗", "🔒", "🔓", "⚙️", "🛠️", "💡"]
  }
];
const audioChunks = useRef([]);
const fileInputMediaRef = useRef(null); // 🔥 NEW: Ref for media file input
const startTimeRef = useRef(null);
const [showEmojiPicker, setShowEmojiPicker] = useState(false);
const [isChatMuted, setIsChatMuted] = useState(false);
const isChatMutedRef = useRef(false)


  // 🔥 Context Menu Handlers
  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      msg: msg
    });
  };
const menuItem = {
  padding: "10px 15px",
  cursor: "pointer"
};

  const handleSelectChoice = (msg, type) => {
    setIsSelectMode(true);
    if (type === 'all') {
      setSelectedMessages(messages.map(m => m.id || m.localId));
    } else {
      setSelectedMessages([msg.id || msg.localId]);
    }
    setShowSelectOptions(null);
  };

  const toggleSelect = (msgId) => {
    setSelectedMessages(prev => 
      prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
    );
  };

  const deleteSelected = () => {
    if (window.confirm(`Delete ${selectedMessages.length} messages?`)) {
      selectedMessages.forEach(msgId => {
        const msg = messages.find(m => (m.id === msgId || m.localId === msgId));
        if (msg && msg.id) {
          if (String(msg.sender) === String(user.id)) {
            socket.emit("deleteMessage", { messageId: msg.id, sender: user.id, receiver: friend.id });
          } else {
            socket.emit("deleteForMe", { messageId: msg.id, userId: user.id });
          }
        }
      });
      setIsSelectMode(false);
      setSelectedMessages([]);
    }
  };

  const openForwardPicker = async () => {
    try {
      const res = await axios.get("https://snapchat-vgrt.onrender.com/api/auth/friends", {
        headers: { authorization: "Bearer " + localStorage.getItem("token") }
      });
      setFriendsList(res.data);
      setShowForwardPicker(true);
    } catch (err) {
      console.error("Forward picker error", err);
    }
  };

  const forwardMessages = (toFriend) => {
    selectedMessages.forEach(msgId => {
      const msg = messages.find(m => (m.id === msgId || m.localId === msgId));
      if (msg) {
        const fwdLocalId = `fwd_${Date.now()}_${Math.random()}`;
        if (msg.type === 'text') {
          socket.emit("sendMessage", { localId: fwdLocalId, sender: user.id, receiver: toFriend.id, text: msg.text, type: 'text' });
        } else if (['image', 'video', 'voice', 'document'].includes(msg.type)) {
          socket.emit("send_media", { localId: fwdLocalId, senderId: user.id, receiverId: toFriend.id, mediaUrl: msg.text, mediaType: msg.type });
        }
      }
    });
    setShowForwardPicker(false);
    setIsSelectMode(false);
    setSelectedMessages([]);
    alert("Forwarded successfully! 🚀");
  };

  const closeMenu = () => setContextMenu(null);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Message copied! 📋");
    closeMenu();
  };

  const downloadMedia = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const parts = url.split('.');
      const ext = parts.length > 1 ? parts.pop().split('?')[0] : 'file';
      link.download = `${filename}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed", err);
      window.open(url, '_blank'); // Fallback if blob download fails
    }
  };

  const editMsg = (msg) => {
  setEditPopup(msg);
};

const editForMe = (text) => {
  socket.emit("editMessageForMe", {
    messageId: editPopup.id || editPopup.localId, // ✅ FIX
    userId: user.id,
    newText: text
  });
  setEditPopup(null);
};

const editForEveryone = (text) => {
    if (!editPopup.id) {
    alert("Message not saved yet ❌");
    return;
  }
  const messageIdToEdit = editPopup.id;
  socket.emit("editMessageEveryone", {
    messageId: messageIdToEdit, // ✅ ONLY ID
    newText: text,
    sender: user.id,
    receiver: friend.id
  });
  setEditPopup(null);
};
const deleteMsg = (msg) => {
  setDeletePopup(msg);
};
const deleteForMe = () => {
  socket.emit("deleteForMe", {
    messageId: deletePopup.id,
    userId: user.id
  });

  setDeletePopup(null);
};

const deleteForEveryone = () => {
  socket.emit("deleteMessage", {
    messageId: deletePopup.id,
    sender: user.id,
    receiver: friend.id
  });
  setDeletePopup(null);
};

  const startEdit = (msg) => {
    setEditingMessage(msg);
    setMessage(msg.text);
    closeMenu();
  };

  const handleLiveCapture = async (blob, type, duration) => {
    setShowLiveCamera(false);
    const formData = new FormData();
    formData.append("media", blob, type === "image" ? "capture.jpg" : "capture.webm");

    try {
      const res = await axios.post("https://snapchat-vgrt.onrender.com/api/upload-media", formData);
      const { url } = res.data;
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const localId = Date.now().toString();

      socket.emit("send_media", {
        localId: localId,
        senderId: user.id,
        receiverId: friend.id,
        mediaUrl: url,
        mediaType: type,
        fullDate: new Date().toDateString(),
        time: timeNow,
        duration: duration || 0
        ,deleteMode: deleteAfter || "never" // 🔥 ADD THIS
      });

      setMessages(prev => [...prev, {
        localId: localId, 
        sender: user.id, 
        receiver: friend.id, 
        text: url, 
        type: type, 
        fullDate: new Date().toDateString(),
        time: timeNow,
        duration: duration || 0,
        status: "sending"
      }]);
    } catch (err) {
      console.error("Live media upload failed", err);
    }
  };
const handleReact = (emoji, msg) => {

  // ❌ agar id nahi hai to react mat bhej
  if (!msg.id) {
    alert("Message not saved yet ❌");
    return;
  }

  // 🔥 Optimistic UI
  setMessages(prev => prev.map(m => 
    (m.id === msg.id || m.localId === msg.localId)
      ? { 
          ...m, 
          reactions: { ...(m.reactions || {}), [user.id]: emoji } 
        } 
      : m
  ));

  // 🔥 Server emit
  socket.emit("sendReaction", { 
    messageId: msg.id, // ✅ only DB id
    userId: user.id,
    emoji: emoji,
    toUserId: friend.id
  });

  closeMenu();
};

const [ongoingCall, setOngoingCall] = useState(() => {
  const call = JSON.parse(localStorage.getItem("ongoingCall"));
  return call || null;
});
const [callAccepted, setCallAccepted] = useState(false); // Only used for caller
const [callType, setCallType] = useState(() => {
  const call = JSON.parse(localStorage.getItem("ongoingCall"));
  return call ? call.type : null;
});
const [callMinimized, setCallMinimized] = useState(false);

const startCall = (type) => {
  const callData = {
    withUserId: friend.id,
    type: type,
    isInitiator: true // 👈 Caller hai
  };

  setCallType(type);
  setOngoingCall(callData); // 🔥 Turant UI dikhao caller ko
  localStorage.setItem("ongoingCall", JSON.stringify(callData));

  // 🔔 Start Outgoing Ringtone
  ringtone.loop = true;
  ringtone.play().catch(() => {});

  socket.emit("callUser", {
    to: friend.id,
    from: user.id,
    name: user.username,
    callType: type // ✅ ADD THIS
  });


};

const acceptCall = () => {
  ringtone.pause();
  ringtone.currentTime = 0;
localStorage.setItem("ongoingCall", JSON.stringify({
  withUserId: callIncoming.from,
  type: callIncoming.callType
}));
  socket.emit("answerCall", {
    to: callIncoming.from,
    from: user.id   // 🔥 ADD THIS
  });
setCallAccepted(true);
  setCallMinimized(false); // 🔥 ADD THIS
};

const rejectCall = () => {
  ringtone.pause();
  ringtone.currentTime = 0;

  const type = callIncoming?.callType || "voice";

  socket.emit("rejectCall", {
    to: callIncoming.from,
    from: user.id,   // 🔥 ADD THIS
    callType: type // ✅ Send type for logging
  });

  // 🔥 OPTIMISTIC UI UPDATE
  const icon = type === "video" ? "📹" : "📞";
  const typeText = type === "video" ? "Video" : "Voice";
  const callLogMsg = `❌ ${icon} ${typeText} Missed Call`;

  setMessages(prev => [...prev, {
    sender: callIncoming.from, // Show as Incoming message
    receiver: user.id,
    text: callLogMsg,
    fullDate: new Date().toDateString(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: type === "video" ? "video_call" : "voice_call",
    duration: 0,
    status: 'read'
  }]);

  setCallIncoming(null);
  setCallAccepted(false); // Ensure screen closes
  setCallType(null);
  localStorage.removeItem("ongoingCall");
  ringtone.pause();
  ringtone.currentTime = 0;
  setOngoingCall(null);
};
const endCall = async ({ duration=0, callType } = {}) => {

  // 🔥 Emit endCall to server so it notifies the other user
  socket.emit("endCall", {
    from: user.id,
    to: friend.id,
    duration,
    callType
  });


  // 🔥 UI log (same as before)
  const mins = Math.floor((duration || 0) / 60);
  const secs = (duration || 0) % 60;
  const timeStr = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  const icon = callType === "video" ? "📹" : "📞";
  const typeText = callType === "video" ? "Video" : "Voice";
  const logText = `${icon} ${typeText} call ended • ${timeStr}`;

  setMessages(prev => [...prev, {
    sender: user.id,
    receiver: friend.id,
    text: logText,
    fullDate: new Date().toDateString(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: callType === "video" ? "video_call" : "voice_call",
    duration: duration || 0,
    status: 'read'
  }]);

  // 🔥 reset
  setCallAccepted(false);

  ringtone.pause();
  ringtone.currentTime = 0;
  localStorage.removeItem("ongoingCall");
setOngoingCall(null);
};
  const messagesEndRef = useRef(null);

  // auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
    const handleScroll = () => {
    if (chatBodyRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
      // Agar user bottom se 300px se zyada upar hai, to button dikhao
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 300);
    }
  };
useEffect(() => {
  const handleMinimize = () => {
    setCallMinimized(true);
  };

  window.addEventListener("minimizeCall", handleMinimize);

  return () => {
    window.removeEventListener("minimizeCall", handleMinimize);
  };
}, []);

useEffect(() => {
  const handleResume = () => {
    setCallMinimized(false); // 🔥 call wapas open
  };

  window.addEventListener("resumeCall", handleResume);

  return () => {
    window.removeEventListener("resumeCall", handleResume);
  };
}, []);
  useEffect(() => {
    // Smart auto-scroll: Tabhi scroll karo jab user bottom ke paas ho
    if (chatBodyRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      if (isNearBottom) scrollToBottom();
    }
  }, [messages]);

  // 🖼️ Wallpaper fetch logic with safety check
  useEffect(() => {
    if (!user?.id || !friend?.id) {
      setChatWallpaper(null);
      return;
    }
    axios.get(`https://snapchat-vgrt.onrender.com/api/chat/wallpaper/${user.id}/${friend.id}`)
      .then(res => {
        if (res.data?.wallpaper) {
          setChatWallpaper(res.data.wallpaper + "?t=" + Date.now());
        } else {
          setChatWallpaper(null);
        }
      })
      .catch(err => console.error("Wallpaper load failed", err));
  }, [friend.id, user.id]);

  // 📸 SCREENSHOT & RECORDING DETECTION (Enhanced)
  useEffect(() => {
    if (!user?.id || !friend?.id) return;

    const handleScreenshotAction = (e) => {
      // Detect common screenshot/recording shortcuts
      const isPrtSc = e.key === "PrintScreen" || e.keyCode === 44; // Windows PrtSc
      const isMacScreenshot = e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key); // Mac shortcuts
      const isWinSnipping = e.metaKey && e.shiftKey && (e.key === "S" || e.key === "s"); // Windows Snipping Tool (Win+Shift+S)

      if (isPrtSc || isMacScreenshot || isWinSnipping) {
        console.log("Screenshot/Recording Attempt Detected! 📸");
        
        const notificationMsg = {
          localId: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sender: user.id,
          receiver: friend.id,
          text: `📸 ${user.username} took a screenshot/recording of the chat!`,
          fullDate: new Date().toDateString(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sending',
          type: 'text'
        };

        // Emit to server so friend receives it
        socket.emit("sendMessage", notificationMsg);
        
        // Show in my own chat window immediately
        setMessages(prev => [...prev, notificationMsg]);
      }
    };

    // Listen on keydown and keyup for better capture reliability
    window.addEventListener("keydown", handleScreenshotAction);
    window.addEventListener("keyup", handleScreenshotAction);

    return () => {
      window.removeEventListener("keydown", handleScreenshotAction);
      window.removeEventListener("keyup", handleScreenshotAction);
    };
  }, [friend.id, user.id, user.username]);

  // 🎨 Theme fetch logic with safety check
  useEffect(() => {
    if (!user?.id || !friend?.id) return;
    axios.get(`https://snapchat-vgrt.onrender.com/api/chat/theme/${user.id}/${friend.id}`)
      .then(res => {
        if (res.data?.theme) setChatTheme(res.data.theme);
      })
      .catch(err => console.error("Theme load failed", err));
  }, [friend.id, user.id]);

useEffect(() => {
  if (previewMedia?.id) {
    console.log("🔥 OPEN FROM PREVIEW:", previewMedia.id);

    socket.emit("messageOpened", {
      messageId: previewMedia.id
    });
  }
}, [previewMedia]);

useEffect(() => {
  const call = JSON.parse(localStorage.getItem("ongoingCall"));
  if (call) setOngoingCall(call);
}, []);
useEffect(() => {
  const interval = setInterval(() => {
    const call = JSON.parse(localStorage.getItem("ongoingCall"));
    setOngoingCall(call);
  }, 1000);

  return () => clearInterval(interval);
}, []);
  // 🟢 FETCH CHAT HISTORY FROM DB (Replaces LocalStorage)
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user?.id || !friend?.id) return; // 🔥 Safety check added here too
      try {
        const res = await axios.get(`https://snapchat-vgrt.onrender.com/api/messages/history/${user.id}/${friend.id}`);
        
    const formattedMessages = res.data.map(msg => ({
  id: msg.id,
  sender: msg.sender_id,
  receiver: msg.receiver_id,
  text: msg.edited_text || msg.message,
  time: new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  fullDate: new Date(msg.created_at || Date.now()).toDateString(),
  status: msg.status,
  type: msg.type || 'text',
  duration: msg.duration || 0,
  localId: msg.local_id || msg.id.toString(),
  isEdited: msg.is_edited === 1 || !!msg.edited_text,
  reactions: typeof msg.reactions === "string"
    ? JSON.parse(msg.reactions)
    : msg.reactions || null,

  replyTo: msg.reply_to || null // ✅ FIXED
}));

        setMessages(formattedMessages);

        // 🔥 Mark all messages as read on server when history is loaded
        if (user?.id && friend?.id) {
          socket.emit("markAllAsRead", { senderId: friend.id, receiverId: user.id });
        }
      } catch (err) {
        console.error("Failed to load chat history", err);
      }
    };

    fetchMessages();
  }, [friend.id, user.id]);

useEffect(() => {
  if (!user?.id || !friend?.id) return;

  const fetchDeleteMode = async () => {
    try {
      const res = await axios.get(
        `https://snapchat-vgrt.onrender.com/api/chat/delete-mode/${user.id}/${friend.id}`
      );

      console.log("CHATBOX MODE:", res.data); // debug

    setDeleteAfter(res.data.deleteMode || "never"); 
    } catch (err) {
      console.error("Error fetching delete mode:", err);
    }
  };

  fetchDeleteMode();
}, [user.id, friend.id]);

useEffect(() => {
  const fetchMuteSettings = async () => {
    try {
      const res = await axios.get(
        `https://snapchat-vgrt.onrender.com/api/chat/mute-settings/${user.id}/${friend.id}`
      );

      if (res.data) {
        setIsChatMuted(!!res.data.isChatMuted);
        setIsCallMuted(!!res.data.isCallMuted);   // ✅ ADD THIS

        isChatMutedRef.current = !!res.data.isChatMuted;
      }
    } catch (err) {
      console.log("Mute settings not found for this friend.");
    }
  };

  fetchMuteSettings();

const handleMuteUpdate = (data) => {
  // 🛡️ Ensure this update belongs to current user
  if (String(data.userId) === String(user.id) && String(data.friendId) === String(friend.id)) {
    setIsChatMuted(data.isChatMuted);
    setIsCallMuted(data.isCallMuted);   // ✅ ADD THIS LINE

    isChatMutedRef.current = data.isChatMuted;
  }
};

  socket.on("muteSettingsUpdated", handleMuteUpdate);

  return () => socket.off("muteSettingsUpdated", handleMuteUpdate);

}, [user.id, friend.id]);
  
  // 🟢 Handle Connection & Online Status (Merged for reliability)
  useEffect(() => {
const formatLastSeen = (dateStr) => {
  if (!dateStr) return "Last seen recently";

 const date = new Date(dateStr + "Z");

  if (isNaN(date.getTime())) {
    console.log("Invalid date:", dateStr); // debug
    return "Last seen recently";
  }

  const now = new Date();

  const isToday =
    date.toDateString() === now.toDateString();

  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

  if (isToday) return `Last seen today at ${time}`;

  return `Last seen ${date.toLocaleDateString()}`;
};

  const handleStatus = (data) => {
  console.log('[ChatBox] Received friendStatus event:', data);

  if (String(data.userId) === String(friend.id)) {

    if (data.status === "online") {
      setFriendStatus("Online");
    } else {
      setFriendStatus(formatLastSeen(data.lastSeen));
    }

  }
};

    const handleOnline = (data) => {
      console.log('[ChatBox] Received userOnline event:', data);
      if (String(data.userId) === String(friend.id)) setFriendStatus("Online");
    };

const handleOffline = (data) => {
  console.log('[ChatBox] Received userOffline event:', data);

  if (String(data.userId) === String(friend.id)) {
    setFriendStatus(formatLastSeen(data.lastSeen));
  }
};

    // 1. Attach Listeners
    socket.on("friendStatus", handleStatus);
    socket.on("userOnline", handleOnline);
    socket.on("userOffline", handleOffline);

    // 2. Connect & Register Logic
    const initChat = () => {
      if (!socket.connected) socket.connect();

      // Emit immediately
      socket.emit("registerUser", String(user.id));
      socket.emit("getFriendStatus", { friendId: String(friend.id) });
    };

    initChat();
    socket.on("connect", initChat);

    // 🔄 Re-check when window focuses (Fix for "Already in chat" appearing offline)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') initChat();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      socket.off("friendStatus", handleStatus);
      socket.off("userOnline", handleOnline);
      socket.off("userOffline", handleOffline);
      socket.off("connect", initChat);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [friend.id, user.id]);

  // 🕺 Presence Listener: Dono chat me hain ya nahi
  useEffect(() => {
    if (!user?.id || !friend?.id) return;
    
    socket.emit("enterChat", { userId: user.id, friendId: friend.id });
    
    

    const handlePresence = (data) => {
      if (String(data.friendId) === String(friend.id)) {
        setIsFriendInChat(data.inChat);
      }
    };

    socket.on("presenceUpdate", handlePresence);

    return () => {
      socket.emit("leaveChat", { userId: user.id, friendId: friend.id });
      socket.off("presenceUpdate", handlePresence);
    };
  }, [friend.id, user.id]);

  useEffect(() => {
    // ✅ Bulk read signal removed from mount
  }, [friend.id]);


  // join room
  useEffect(() => {
    const handleReceiveMessage = (data) => {
      console.log("Incoming Message Data:", data); // 🛠️ Debugging ke liye
      const senderId = data.sender || data.senderId;

    if (String(senderId) === String(friend.id)) {
     const msgWithDefault = {
  ...data, 
  type: data.mediaType || data.type || (data.audioUrl || (typeof data.text === 'string' && data.text.includes('.webm')) ? 'voice' : 'text'), 
  text: data.text || data.audioUrl || data.message, // 🔥 FIX
  sender: senderId,
  fullDate: data.fullDate || new Date().toDateString(),
  duration: data.duration !== undefined ? Number(data.duration) : 0, // 🔥 FIX
  time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};
        setMessages((prev) => {
          // 🛡️ डुप्लीकेट चेक: ID और localId दोनों से चेक करें
          const isDuplicate = prev.some(m => 
            (data.id && String(m.id) === String(data.id)) || 
            (data.localId && String(m.localId) === String(data.localId))
          );
          if (isDuplicate) return prev;
          return [...prev, msgWithDefault];
        });
        
        // 🔥 ALWAYS notify server the message was viewed (for deletion timer)
        // Server internally decide karega ki Blue Tick dikhana hai ya nahi
        socket.emit("messageRead", { 
          sender: senderId,
          receiver: user.id,
          id: data.id,
          localId: data.localId
        });
      }
    };
  // ✅ ✅ ✅ YAHI SAHI JAGAH HAI
  socket.on("messageDeleted", ({ messageId }) => {
    setMessages(prev => prev.filter(msg => 
      String(msg.id) !== String(messageId) && String(msg.localId) !== String(messageId)
    ));
  });

    // ✅ delete for me (YE ADD KAR)
  socket.on("messageDeletedForMe", ({ messageId }) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  });
socket.on("messageEdited", ({ messageId, newText }) => {
  setMessages(prev => prev.map(msg =>
    (String(msg.id) === String(messageId) || String(msg.localId) === String(messageId))
      ? { ...msg, text: newText, isEdited: true }
      : msg
  ));
});

socket.on("messageEditedForMe", ({ messageId, newText }) => {
  setMessages(prev => prev.map(msg =>
    (String(msg.id) === String(messageId) || String(msg.localId) === String(messageId))
      ? { ...msg, text: newText, isEdited: true }
      : msg
  ));
});


const handleMessageStatus = (data) => {
  const statusLevels = { 'sent': 0, 'delivered': 1, 'read': 2 };
  const newLevel = statusLevels[data.status] || 0;

  setMessages(prev => prev.map(msg => {
    const currentLevel = statusLevels[msg.status] || 0;

    // 🔥 1. Check if individual ID or ID in array matches
    const isMatch = (data.id && msg.id === data.id) || 
                    (data.localId && msg.localId === data.localId) ||
                    (data.messageIds && data.messageIds.includes(msg.id));

    // 🔥 2. Handle 'all' signal (Sirf Delivered ke liye safe hai)
    const isBulkMatch = data.all && String(data.friendId) === String(friend.id);

    if (isMatch || isBulkMatch) {
      // 🚫 Status downgrade prevent karein (Don't go from Read -> Delivered)
      if (newLevel > currentLevel) {
        return {
          ...msg,
          status: data.status,
          id: data.id || msg.id
        };
      }
    }
    return msg;
  }));
};



    const handleTyping = (data) => {
      if(String(data.sender) === String(friend.id)) setTyping(true);
    };

    const handleStopTyping = (data) => {
      if(String(data.sender) === String(friend.id)) setTyping(false);
    };

    const handleRecording = (data) => {
      if(String(data.sender) === String(friend.id)) setIsFriendRecording(true);
    };

    const handleStopRecording = (data) => {
      if(String(data.sender) === String(friend.id)) setIsFriendRecording(false);
    };
socket.on("callAccepted", () => {
  ringtone.pause();
  ringtone.currentTime = 0;
setCallAccepted(true);
  setCallMinimized(false); // 🔥 ADD THIS
});
socket.on("callEnded", (data) => {
  ringtone.pause();
  ringtone.currentTime = 0;
  setCallAccepted(false);
  localStorage.removeItem("ongoingCall");
  setOngoingCall(null);

  // 🔥 Add message if provided (Fixes "not showing for receiver")
  if (data && data.text) {
    setMessages(prev => {
      if (data.localId && prev.some(m => m.localId === data.localId)) return prev;
      return [...prev, { ...data, fullDate: new Date().toDateString() }];
    });
  }
});
socket.on("callRejected", () => {
  // 🔥 Add "No Answer" message for Caller
  ringtone.pause();
  ringtone.currentTime = 0;
  const currentType = callType || "voice";
  const icon = currentType === "video" ? "📹" : "📞";
  const typeText = currentType === "video" ? "Video" : "Voice";
  
  setMessages(prev => [...prev, {
    sender: user.id, // Outgoing
    receiver: friend.id,
    text: `🚫 ${icon} ${typeText} No Answer`,
    fullDate: new Date().toDateString(),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: currentType === "video" ? "video_call" : "voice_call",
    status: 'sent',
    duration: 0
  }]);

  setCallAccepted(false); // ✅ Close call screen for caller
  localStorage.removeItem("ongoingCall");
  setOngoingCall(null);
});
socket.on("reactionUpdated", ({ messageId, reactions }) => {
  setMessages(prev => prev.map(msg => {
    if (String(msg.id) === String(messageId) || String(msg.localId) === String(messageId)) {
      return { ...msg, reactions };
    }
    return msg;
  }));
});

socket.on("userBusy", () => { 
  ringtone.pause();
  ringtone.currentTime = 0;
  alert("User is busy 📵");
});
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageSent", handleMessageStatus);
    socket.on("messageStatusUpdate", handleMessageStatus);

    socket.on("typing", handleTyping);
    
    // 🔥 NEW: Listen for real-time delete mode updates
    socket.on("deleteModeUpdated", (data) => {
      setDeleteAfter(data.deleteMode);
    });

    socket.on("receive_voice", handleReceiveMessage); // 🔥 Listen for voice specifically
    socket.on("stopTyping", handleStopTyping);
    socket.on("recording", handleRecording);
    socket.on("stopRecording", handleStopRecording);

    // 🎨 Theme Update Listener
    socket.on("themeUpdated", ({ theme }) => {
      setChatTheme(theme);
      setChatWallpaper(null); // Theme aate hi wallpaper hatado
    });

    // 🖼️ Wallpaper Update Listener
    const handleWallpaperUpdate = (data) => {
      if (String(data.senderId) === String(friend.id)) {
        // Cache bust adding timestamp to force reload image
        setChatWallpaper(data.url + "?t=" + Date.now());
      }
    };

    socket.on("wallpaperUpdated", handleWallpaperUpdate);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
       socket.off("messageDeleted"); // ✅ cleanup
          socket.off("messageDeletedForMe"); // ✅ cleanup
              socket.off("messageEdited");       // ✅ cleanup
    socket.off("messageEditedForMe");  // ✅ cleanup
      socket.off("messageSent", handleMessageStatus);
      socket.off("messageStatusUpdate", handleMessageStatus);
      ringtone.pause();
      ringtone.currentTime = 0;
    
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("recording", handleRecording);
      socket.off("stopRecording", handleStopRecording);
      socket.off("themeUpdated");
      socket.off("wallpaperUpdated", handleWallpaperUpdate);

  socket.off("callAccepted");
  socket.off("callRejected");
  socket.off("userBusy"); 
socket.off("reactionUpdated");
    };
  }, [friend.id, user.id]);

  const selectTheme = async (theme, type) => {
    try {
      setChatWallpaper(null); 
      setChatTheme(theme);
      setShowThemePopup(false);

      await axios.post("https://snapchat-vgrt.onrender.com/api/chat/theme", {
        user1: user.id,
        user2: friend.id,
        theme,
        type: type 
      });

      // 🔥 NEW: Send notification message if changed for everyone
      if (type === "everyone") {
        const notificationMsg = {
          localId: `sys_${Date.now()}_theme_${Math.random().toString(36).substr(2, 5)}`,
          sender: user.id,
          receiver: friend.id,
          text: `🎨 ${user.username} changed the chat theme to ${theme}`,
          fullDate: new Date().toDateString(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'sending',
          type: 'text'
        };
        socket.emit("sendMessage", notificationMsg);
        setMessages(prev => [...prev, notificationMsg]);
      }
    } catch (err) {
      console.error("Failed to save theme", err);
    }
  };


const handleWallpaperChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("wallpaper", file);
  formData.append("user1", user.id);
  formData.append("user2", friend.id);
  formData.append("type", wallpaperType); // ✅ IMPORTANT

  try {
    const res = await axios.post("https://snapchat-vgrt.onrender.com/api/chat/wallpaper", formData);
setChatWallpaper(null); // 🔥 reset

setTimeout(() => {
  setChatWallpaper(res.data.url + "?t=" + Date.now()); // 🔥 cache bust
}, 100);

    // 🔥 NEW: Send notification message if changed for everyone
    if (wallpaperType === "everyone") {
      const notificationMsg = {
        localId: `sys_${Date.now()}_wallpaper_${Math.random().toString(36).substr(2, 5)}`,
        sender: user.id,
        receiver: friend.id,
        text: `🖼️ ${user.username} changed the chat wallpaper`,
        fullDate: new Date().toDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sending',
        type: 'text'
      };
      socket.emit("sendMessage", notificationMsg);
      setMessages(prev => [...prev, notificationMsg]);
    }
  } catch (err) {
    console.error("Wallpaper upload failed", err);
  }
};
const sendMessage = () => {
  if (!message.trim()) return;

  // ❌ EDIT MODE REMOVE (IMPORTANT)

  // 🔥 SEND / REPLY MODE ONLY
const msgData = {
  localId: Date.now().toString(),
  sender: user.id,
  receiver: friend.id,
  text: message,
  fullDate: new Date().toDateString(),
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  status: 'sending',
  type: 'text',
  replyTo: replyTo ? replyTo.id : null,

  deleteMode: deleteAfter || "never" // 🔥 ADD THIS
};

  socket.emit("sendMessage", msgData);
  setMessages((prev) => [...prev, msgData]);
  setReplyTo(null);

  setMessage("");
  socket.emit("stopTyping", { receiver: friend.id, sender: user.id });
};




// 🎤 START RECORDING
const startRecording = async () => {
  try {
    isCancelledRef.current = false;
    setRecordingTime(0);
    startTimeRef.current = Date.now(); // ⏱ start time

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mediaRecorder = new MediaRecorder(stream);
    
    // Timer update logic
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);

    mediaRecorderRef.current = mediaRecorder;

    audioChunks.current = []; // 🔥 reset old data

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.current.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      clearInterval(timerRef.current);
      
      if (isCancelledRef.current) {
        console.log("Recording cancelled 🗑️");
        return;
      }

      try {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });

        // 🔥 PERFECT duration calc
        let duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (!duration || duration < 1) duration = 1;

        console.log("🎤 Duration:", duration);

        const formData = new FormData();
        formData.append("audio", audioBlob);

        const res = await fetch("https://snapchat-vgrt.onrender.com/api/upload-audio", {
          method: "POST",
          body: formData
        });

        const data = await res.json();
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const localId = Date.now().toString();

        // 🔥 SEND SOCKET
        socket.emit("send_voice", {
          localId: localId,
          sender: user.id,
          senderId: user.id,
          receiver: friend.id,
          receiverId: friend.id,
          text: data.url, // 🔥 Standard key
          fullDate: new Date().toDateString(),
          audioUrl: data.url, // 🔥 For backward compatibility
          type: "voice",
          duration: duration,
          time: timeNow,
            deleteMode: deleteAfter || "never" // 🔥 ADD THIS
        });

        // 🔥 UI update
        setMessages(prev => [...prev, {
          localId: localId,
          sender: user.id,
          receiver: friend.id,
          fullDate: new Date().toDateString(),
          text: data.url,
          type: "voice",
          duration,
          time: timeNow,
          status: "sending"
        }]);

      } catch (err) {
        console.error("❌ Upload error:", err);
      }
    };

    mediaRecorder.start();
    setRecording(true);
    socket.emit("recording", { receiver: friend.id, sender: user.id });

  } catch (err) {
    console.error("❌ Mic permission error:", err);
    alert("Mic permission allow karo 🎤");
  }
};

// ⛔ STOP & SEND RECORDING
const stopRecording = () => {
  if (mediaRecorderRef.current && recording) {
    isCancelledRef.current = false;
    mediaRecorderRef.current.stop();
    setRecording(false);
    setShowAttach(false);
    socket.emit("stopRecording", { receiver: friend.id, sender: user.id });
  }
};

// 🗑️ CANCEL RECORDING
const cancelRecording = () => {
  if (mediaRecorderRef.current && recording) {
    isCancelledRef.current = true;
    mediaRecorderRef.current.stop();
    setRecording(false);
    setRecordingTime(0);
    socket.emit("stopRecording", { receiver: friend.id, sender: user.id });
  }
};

const formatRecordingTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  const timerRef = useRef(null);

  // Enhanced typing - debounce
  useEffect(() => {
    let timeout;
    if (message.length > 0) {
      timeout = setTimeout(() => {
        socket.emit("typing", { receiver: friend.id, sender: user.id });
      }, 300);
    } else {
      socket.emit("stopTyping", { receiver: friend.id, sender: user.id });
    }
    return () => clearTimeout(timeout);
  }, [message]);

  // 🔥 NEW: Handle media file selection and upload
  const handleMediaUpload = async (e, forceDocument = false) => {
    const file = e.target.files[0];
    if (!file) return;

    // 🔥 NEW: Calculate duration for videos from gallery
    let videoDuration = 0;
    if (file.type.startsWith("video/")) {
      videoDuration = await new Promise((resolve) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => {
          window.URL.revokeObjectURL(v.src);
          resolve(Math.floor(v.duration));
        };
        v.onerror = () => resolve(0);
        v.src = URL.createObjectURL(file);
      });
    }

    const formData = new FormData();
    formData.append("media", file);

    try {
      const res = await axios.post("https://snapchat-vgrt.onrender.com/api/upload-media", formData);
      const { url, type } = res.data;
      const mediaType = forceDocument ? "document" : (type === "image" ? "image" : (type === "video" ? "video" : "document")); // 🔥 NEW: Handle documents
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const localId = Date.now().toString();

      socket.emit("send_media", {
        localId: localId,
        senderId: user.id,
        receiverId: friend.id,
        mediaUrl: url,
        mediaType: mediaType,
        fullDate: new Date().toDateString(),
        time: timeNow,
        duration: videoDuration,
          deleteMode: deleteAfter || "never" // 🔥 ADD THIS
      });

      setMessages(prev => [...prev, {
        localId: localId, sender: user.id, receiver: friend.id, text: url, 
        type: mediaType, time: timeNow, status: "sending", duration: videoDuration,
        fullDate: new Date().toDateString()
      }]);
      setShowAttach(false); // Close attachment menu
    } catch (err) {
      console.error("Media upload failed", err);
    }
  };

  const getStatusIcon = (status) => {
   

    
    switch(status) {
      case 'sent': 
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            <span style={{fontSize: '14px', color: '#100f0f', marginLeft: '4px'}}>✓</span>
            <span style={{fontSize: '10px', color: '#100f0f'}}>Sent</span>
          </span>
        );
      case 'delivered': 
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            <span style={{fontSize: '14px', color: '#0b0b0b', marginLeft: '4px'}}>✓✓</span>
            <span style={{fontSize: '10px', color: '#0b0b0b'}}>Delivered</span>
          </span>
        );
      case 'read': 
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
            <span style={{fontSize: '14px', color: '#000000', fontWeight: 'bold', marginLeft: '4px'}}>✓✓</span>
            <span style={{fontSize: '10px', color: '#000000', fontWeight: 'bold'}}>Seen</span>
          </span>
        );
      default: return <span style={{fontSize: '11px', color: '#ccc'}}>⟢</span>;
    }
  };

  return (
    <div className="chatbox" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      background: '#fff', 
      position: 'relative',
      boxSizing: 'border-box',
      maxWidth: '500px', // Mobile width fixed for all devices
      margin: '0 auto',   // Centering the view
      borderLeft: '1px solid #f0f0f0',
      borderRight: '1px solid #f0f0f0'
    }}>
      <style>{styles}</style>
<input
  type="file"
  accept="image/*,video/*" // 🔥 NEW: Accept both images and videos
  ref={fileInputMediaRef}
  style={{ display: "none" }}
  onChange={handleMediaUpload} // 🔥 NEW: Handle media upload
/>
<input
  type="file"
  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,image/*,video/*"
  ref={fileInputDocRef}
  style={{ display: "none" }}
  onChange={(e) => handleMediaUpload(e, true)}
/>
<input
  type="file"
  accept="image/*"
  ref={fileInputRef}
  style={{ display: "none" }}
  onChange={handleWallpaperChange}
/>
      {/* 🛠️ SELECTION ACTION BAR */}
      {isSelectMode && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%", background: "#fff",
          zIndex: 2500, display: "flex", alignItems: "center", padding: "10px 15px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)", justifyContent: "space-between", height: "60px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <button onClick={() => { setIsSelectMode(false); setSelectedMessages([]); }} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer" }}>←</button>
            <span style={{ fontWeight: "600", fontSize: "18px" }}>{selectedMessages.length} selected</span>
          </div>
          <div style={{ display: "flex", gap: "25px", fontSize: "22px", marginRight: "10px" }}>
            <span title="Forward" onClick={openForwardPicker} style={{ cursor: "pointer", color: "#333" }}>➡️</span>
            <span title="Delete" onClick={deleteSelected} style={{ cursor: "pointer", color: "#333" }}>🗑️</span>
          </div>
        </div>
      )}

      {/* 🔝 TOP BAR */}
      <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', borderBottom: '1px solid #f0f0f0', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer' }}>←</button>

          <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={friend.avatar || friend.profile_pic} alt="" 
                 onClick={() => setShowFriendProfile(true)} // 🔥 NEW: Click to open profile
                 style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: '600', fontSize: '16px', lineHeight: '1.2' }}>{friend.username}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '12px', color: friendStatus === 'Online' ? '#25D366' : '#888' }}>
                    {friendStatus}
                  </span>
                  {friendStatus === 'Online' && (
                    <div style={{ 
                      width: '8px', height: '8px', 
                      backgroundColor: '#25D366', 
                      borderRadius: '50%', 
                      animation: 'onlinePulse 2s infinite' 
                    }} />
                  )}
                </div>
                {/* 🕺 Dancing Cartoon (Bitmoji placeholder) */}
                {isFriendInChat && friendStatus === 'Online' && (
                  <div className="dancing-cartoon" style={{ fontSize: '14px', marginTop: '-2px' }}>
                    🕺 <span style={{fontSize: '10px', fontWeight: 'bold', color: '#00B4F6'}}>In Chat!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
{/* 🟢 CALL RETURN BANNER */}
{ongoingCall && ongoingCall.withUserId === friend.id && (
  <div
onClick={() => {
  setCallType(ongoingCall.type); // 🔥 type sync
  setCallAccepted(true);         // 🔥 ensure open
  setCallMinimized(false);
}}
    style={{
      width: "100%",
      background: "#25D366",
      color: "#000",
      textAlign: "center",
      padding: "10px 0",
      fontWeight: "600",
      cursor: "pointer",
      position: "sticky",
      top: 0,
      zIndex: 999
    }}
  >
    Tap to return to call • {callAccepted ? "Ongoing..." : "Ringing..."}
  </div>
)}
        <div className="actions" style={{ display: 'flex', gap: '20px', fontSize: '20px', color: '#333' }}>
     <span onClick={() => startCall("voice")} style={{cursor:"pointer"}}>📞</span>
<span onClick={() => startCall("video")} style={{cursor:"pointer"}}>📹</span>
<span 
  onClick={() => setShowMenu(!showMenu)} 
  style={{ cursor: "pointer", fontSize: "20px" }}
>
  ⋮
</span>
        </div>
        {showMenu && (
  <div 
    onClick={() => setShowMenu(false)}  // 🔥 outside click close
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: 2000
    }}
  >
    <div 
      onClick={(e) => e.stopPropagation()} // ❌ close prevent
      style={{
        position: "absolute",
        top: "60px",
        right: "20px",
        background: "#fff",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        padding: "10px 0",
        minWidth: "160px"
      }}
    >

    <div style={menuItem} onClick={() => {
  setWallpaperType("me");        // 🔥 set type
  fileInputRef.current.click();
  setShowMenu(false);
}}>
  🧍 Set Wallpaper (For Me)
</div>

<div style={menuItem} onClick={() => {
  setWallpaperType("everyone");  // 🔥 set type
  fileInputRef.current.click();
  setShowMenu(false);
}}>
  👥 Set Wallpaper (For Everyone)
</div>

      <div style={menuItem} onClick={() => {
  setShowThemePopup(true);
        setShowMenu(false);
      }}>
        🎨 Theme
      </div>

      <div style={{ ...menuItem, color: "red" }} onClick={() => {
        setShowMenu(false);
      }}>
        ❌ Cancel
      </div>

    </div>
  </div>
)}
      </div>

      {/* 💬 CHAT BODY */}
      <div 
        className="chat-body" 
        ref={chatBodyRef}
        onScroll={handleScroll}
        style={{ 
  flex: 1, 
  overflowY: 'auto', 
  padding: '20px', 
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
background: chatWallpaper 
  ? `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${chatWallpaper}) center/cover no-repeat`
  : themes[chatTheme]
}}>
        {messages.map((msg, i) => {
          const showDateHeader = i === 0 || messages[i - 1].fullDate !== msg.fullDate;
          // 🔥 Unique key ensure करने के लिए prefix का इस्तेमाल करें
          return (
            <React.Fragment key={msg.id ? `db-${msg.id}` : `local-${msg.localId || i}`}>
              {showDateHeader && (
                <div style={{
                  alignSelf: 'center',
                  background: 'rgba(0,0,0,0.05)',
                  padding: '4px 12px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  color: '#666',
                  margin: '10px 0',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {formatDateLabel(msg.fullDate)}
                </div>
              )}
              <div 
              id={"msg-" + (msg.id || msg.localId)}
            onContextMenu={(e) => !isSelectMode && handleContextMenu(e, msg)}
            onClick={() => isSelectMode && toggleSelect(msg.id || msg.localId)}
            style={{ 
              alignSelf: msg.sender === user.id ? 'flex-end' : 'flex-start', 
              background: selectedMessages.includes(msg.id || msg.localId) ? '#dcf8ff' : (msg.sender === user.id ? '#00B4F6' : '#fff'), 
              color: msg.sender === user.id ? '#fff' : '#000', 
              padding: '10px 15px', 
              border: selectedMessages.includes(msg.id || msg.localId) ? '2px solid #00B4F6' : 'none',
              borderRadius: '18px', 
              maxWidth: '75%', 
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              position: 'relative',
              WebkitTouchCallout: 'none', // Disable iOS long-press menu
              userSelect: 'none' // Disable text selection on long-press
            }}
          >
            {/* 🔥 REPLY LABEL (YAHI ADD KARNA HAI) */}
{msg.replyTo && (
  <div style={{ 
    fontSize: "11px", 
    color: "#555", 
    marginBottom: "3px",
    fontWeight: "500"
  }}>
    {msg.sender === user.id
      ? (messages.find(m => (m.id || m.localId) === msg.replyTo)?.sender === user.id
          ? "Replied to yourself"
          : "You replied")
      : `${friend.username} replied`}
  </div>
)}
            {/* Reply Preview inside message */}
{msg.replyTo && (
  <div
    style={{
      background: 'rgba(0,0,0,0.05)',
      padding: '5px',
      borderRadius: '8px',
      marginBottom: '5px',
      fontSize: '12px',
      borderLeft: '3px solid #FFFC00',
      cursor: 'pointer'
    }}
  onClick={() => {
  const el = document.getElementById("msg-" + msg.replyTo);

  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // 🔥 highlight effect
    el.style.background = "#ffff99";

    setTimeout(() => {
      el.style.background = "";
    }, 1000);
  }
}}
  >
    {messages.find(m => (m.id || m.localId) === msg.replyTo)?.text || "Message"}
  </div>
)}

    {/* 🔥 Text, Voice aur Media display changes */}
    {msg.type === "text" && <p>{msg.text} {msg.isEdited && <span style={{fontSize: '10px', opacity: 0.6}}>(edited)</span>}</p>}

{msg.type === "profile" && (() => {
  try {
    // Database se 'message' field aata hai, socket se 'text'
    const rawData = msg.text || msg.message;
    const profileData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    
    return (
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          background: msg.sender === user.id ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)', 
          padding: '8px 12px', 
          borderRadius: '12px',
          border: '1px solid rgba(0,0,0,0.1)',
          minWidth: '150px'
        }}
      >
        <img 
          src={profileData.avatar || "https://i.pravatar.cc/150"} 
          style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1.5px solid #FFFC00', objectFit: 'cover' }} 
          alt="" 
        />
        <span style={{ fontWeight: '600', fontSize: '14px', color: 'inherit' }}>{profileData.username}</span>
      </div>
    );
  } catch (e) { 
    return <p>👤 Profile Shared</p>; 
  }
})()}

{msg.type === "voice" && (
  <div>
    {/* 🔥 NEW: Show a placeholder if message is just "📞 Call Started" */}
    {msg.text === "📞 Call Started" && <p>📞 Call Started</p>}
    {msg.text.includes("📞 Call Ended") && <p>{msg.text}</p>}
    {msg.text.includes("Missed Call") && <p>{msg.text}</p>}
    {/* 🔥 Move src directly to audio tag for better React dynamic loading */}
    <audio src={msg.text} controls preload="metadata" style={{ height: '40px', maxWidth: '100%' }} />

    {/* 🔥 duration show */}
    {msg.duration > 0 && (
      <div style={{ fontSize: "11px", marginTop: "2px", opacity: 0.7 }}>
        ⏱ {msg.duration}s
      </div>
    )}
  </div>
)}
            {/* 🔥 NEW: Display Image/Video */}
            {msg.type === "image" && (
              <img 
                src={msg.text} 
                alt="Sent" 
               onClick={() => {
  setPreviewMedia({ 
  id: msg.id, // 🔥 ADD THIS
  url: msg.text, 
  type: 'image' 
});

if (msg.id) {
  socket.emit("messageOpened", {
    messageId: msg.id
  });
}
}}
                onContextMenu={(e) => handleContextMenu(e, msg)}
                style={{ maxWidth: '100%', borderRadius: '8px', cursor: 'pointer', display: 'block', WebkitTouchCallout: 'none' }}
              />
            )}
            {msg.type === "video" && (
              <div style={{ position: 'relative', display: 'inline-block' }} onContextMenu={(e) => handleContextMenu(e, msg)}>
                <video 
                  src={msg.text} 
               onClick={() => {
 setPreviewMedia({ 
  id: msg.id, // 🔥 ADD THIS
  url: msg.text, 
  type: 'video' 
});

 if (msg.id) {
  socket.emit("messageOpened", {
    messageId: msg.id
  });
}
}}
                  style={{ maxWidth: '100%', borderRadius: '8px', cursor: 'pointer', display: 'block', WebkitTouchCallout: 'none' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '500',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>🎬</span>
                  <span>0:00 / {msg.duration ? `${Math.floor(msg.duration / 60)}:${(msg.duration % 60).toString().padStart(2, '0')}` : '0:00'}</span>
                </div>
              </div>
            )}

            {msg.type === "document" && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '10px', 
                background: 'rgba(0,0,0,0.1)', 
                borderRadius: '10px',
                color: 'inherit'
              }}>
                <span style={{ fontSize: '20px' }}>📄</span>
                <span style={{ fontSize: '13px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {msg.text.split('/').pop()}
                </span>
                <button onClick={() => downloadMedia(msg.text, msg.text.split('/').pop())} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'inherit' }}>📥</button>
              </div>
            )}

            {/* 🔥 NEW: Call Log Messages */}
            {(msg.type === "voice_call" || msg.type === "video_call") && (
              <p>
                {msg.text.includes("📞 Call Started") || msg.text.includes("📞 Call Ended") || msg.text.includes("Missed Call")
                  ? msg.text
                  : msg.type === "voice_call"
                    ? `📞 Voice Call (${msg.duration}s)`
                    : `📹 Video Call (${msg.duration}s)`
                }
              </p>
            )}


            {/* 🔥 REACTION BADGE */}
  {msg.reactions && (
  <div style={{
    position: 'absolute',
    bottom: '-12px',
    [msg.sender === user.id ? 'right' : 'left']: '5px',
    background: '#fff',
    borderRadius: '12px',
    padding: '2px 6px',
    fontSize: '14px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
    zIndex: 2,
    color: '#000'
  }}>
    {Object.values(msg.reactions).map((emoji, i) => (
      <span key={i}>{emoji}</span>
    ))}
  </div>
)}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
              <span>{msg.time}</span>
              {msg.sender === user.id && !['video_call', 'voice_call'].includes(msg.type) && getStatusIcon(msg.status)}
            </div>
          </div>
            </React.Fragment>
          );
        })}

        {/* ✍️ TYING INDICATOR */}
        {typing && (
          <div style={{ 
            alignSelf: 'flex-start', 
            background: 'rgba(255, 255, 255, 0.8)', 
            padding: '8px 15px', 
            borderRadius: '18px 18px 18px 5px', 
            fontSize: '13px', 
            color: '#555',
            marginBottom: '10px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            zIndex: 10
          }}>
            <span style={{fontWeight: '600'}}>{friend.username}</span> is typing
            <span className="typing-dots"><span>.</span><span>.</span><span>.</span></span>
          </div>
        )}

        {/* 🎙️ RECORDING INDICATOR */}
        {isFriendRecording && (
          <div style={{ 
            alignSelf: 'flex-start', 
            background: 'rgba(255, 255, 255, 0.8)', 
            padding: '8px 15px', 
            borderRadius: '18px 18px 18px 5px', 
            fontSize: '13px', 
            color: '#555',
            marginBottom: '10px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            zIndex: 10
          }}>
            <span style={{fontWeight: '600'}}>{friend.username}</span> is recording 🎙️
            <span className="typing-dots"><span>.</span><span>.</span><span>.</span></span>
          </div>
        )}

        <div ref={messagesEndRef}></div>
      </div>

      {/* ⬇️ SCROLL TO BOTTOM BUTTON */}
      {showScrollBtn && (
        <div 
          onClick={scrollToBottom}
          style={{
            position: 'absolute',
            bottom: '80px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1000,
            fontSize: '20px',
            color: '#00B4F6',
            border: '1px solid #f0f0f0',
            animation: 'popIn 0.2s ease-out'
          }}
        >
          ↓
        </div>
      )}

{/* ⌨️ BOTTOM BAR */}
<div className="chat-footer" style={{
  display: 'flex',
  flexDirection: 'column',   // ✅ reply box upar
  padding: '10px 15px',
  borderTop: '1px solid #f0f0f0',
  background: '#fff',
  gap: '6px',
  position: 'relative'
}}>

      {/* 🔥 EMOJI PICKER POPUP */}
      {showEmojiPicker && (
        <div style={{
          position: 'absolute',
          bottom: '70px',
          right: '15px',
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          width: '300px',
          height: '350px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          overflow: 'hidden',
          animation: 'popIn 0.2s ease-out'
        }}>
          <div style={{ 
            padding: '10px', 
            borderBottom: '1px solid #eee', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: '#f8f8f8'
          }}>
            <span style={{ fontWeight: '600' }}>Emojis</span>
            <button onClick={() => setShowEmojiPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {emojiCategories.map((cat, idx) => (
              <div key={cat.name} style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '5px', fontWeight: '600' }}>{cat.name}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {cat.emojis.map((emoji, eIdx) => (
                    <span 
                      key={eIdx} 
                      onClick={() => setMessage(prev => prev + emoji)}
                      style={{ fontSize: '22px', cursor: 'pointer', userSelect: 'none' }}
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

  {/* � REPLY PREVIEW */}
  {replyTo && (
    <div style={{
      width: "100%",
      background: "#f0f0f0",
      padding: "8px",
      borderLeft: "4px solid #25D366",
      borderRadius: "8px"
    }}>
      <div style={{ fontSize: "12px", color: "#555" }}>
        {replyTo.sender === user.id 
          ? "Replied to yourself" 
          : "You replied"}
      </div>

      <div style={{ fontSize: "13px" }}>
        {replyTo.text}
      </div>

      <span
        onClick={() => setReplyTo(null)}
        style={{ float: "right", cursor: "pointer" }}
      >
        ❌
      </span>
    </div>
  )}

  {/* 🎤 RECORDING OVERLAY (WhatsApp Style) */}
  {recording && (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '5px 10px',
      background: '#f0f2f5',
      borderRadius: '24px',
      height: '45px',
      animation: 'popIn 0.2s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="blink-red" style={{ color: 'red', fontSize: '18px' }}>●</span>
        <span style={{ fontWeight: '600', fontSize: '15px' }}>{formatRecordingTime(recordingTime)}</span>
      </div>
      
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <span 
          onClick={cancelRecording} 
          style={{ cursor: 'pointer', fontSize: '20px', opacity: 0.7 }}
        >
          🗑️
        </span>
        <button 
          onClick={stopRecording}
          style={{ background: 'none', border: 'none', fontSize: '24px', color: '#00B4F6', cursor: 'pointer' }}
        >
          ➤
        </button>
      </div>
    </div>
  )}

  {!recording && (
  
  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>

    {/* ➕ BUTTON */}
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button 
        onClick={() => setShowAttach(!showAttach)} 
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: '#f0f0f0',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer'
        }}
      >
        {showAttach ? '✕' : '+'}
      </button>

      {/* Attach Menu */}
      {showAttach && (
        <div style={{
          position: 'absolute',
          bottom: '50px',
          left: '0',
          background: '#fff',
          padding: '10px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minWidth: '120px',
          zIndex: 100
        }}>
       <div 
  onClick={recording ? stopRecording : startRecording}
  style={{ display: 'flex', gap: '10px', cursor: 'pointer' }}
>
  🎤 {recording ? "Stop Recording" : "Record"}
</div>
            {/* 🔥 NEW: Camera/Gallery option */}
            <div
              onClick={() => fileInputMediaRef.current.click()}
              style={{ display: 'flex', gap: '10px', cursor: 'pointer' }}>
              📸Gallery
          </div>
            <div
              onClick={() => fileInputDocRef.current.click()}
              style={{ display: 'flex', gap: '10px', cursor: 'pointer' }}>
              📄 Documents
            </div>
        </div>
      )}
    </div>

    {/* INPUT */}
    <input
      ref={inputRef}
      type="text"
      placeholder="Type a message"
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      onKeyDown={handleKeyDown}
      style={{
        flex: 1,
        padding: '10px 12px',
        borderRadius: '24px',
        border: '1px solid #ddd',
        outline: 'none',
        background: '#f0f2f5',
        fontSize: '15px',
        minWidth: '0'
      }}
    />

    {/* 🔥 LIVE CAMERA BUTTON */}
    <button 
      onClick={() => setShowLiveCamera(true)}
      style={{
        background: 'transparent',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        padding: '0 5px',
        flexShrink: 0
      }}
    >
      📷
    </button>

    {/* 😀 EMOJI BUTTON */}
    <button 
      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
      style={{
        background: 'transparent',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        padding: '0 5px',
        flexShrink: 0
      }}
    >
      😀
    </button>

    {/* SEND BUTTON */}
    <button 
      onClick={sendMessage}
      style={{
        background: 'transparent',
        border: 'none',
        fontSize: '24px',
        color: '#00B4F6',
        cursor: 'pointer',
        flexShrink: 0
      }}
    >
      ➤
    </button>

  </div>
  )}
</div>

{/* 🎥 CALL SCREEN (FULL SCREEN FIX) */}
{(callAccepted || (ongoingCall && String(ongoingCall.withUserId) === String(friend.id))) && !callMinimized && (
  <div style={{
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "#000",
    zIndex: 3000
  }}>
    <Call 
      user={user} 
      friend={friend} 
      callType={ongoingCall?.type || callType} 
      isCaller={ongoingCall?.isInitiator} // 👈 Sahi check
      startSignaling={ongoingCall?.isInitiator ? callAccepted : true} // 👈 Sahi trigger
      onEnd={endCall} // 🔥 Pass endCall function to child
    />
  </div>

)}
      
      {/* 🔥 CONTEXT MENU POPUP */}
      {contextMenu && (
        <div 
          onClick={closeMenu}
          onContextMenu={(e) => { e.preventDefault(); closeMenu(); }}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 5000, background: 'rgba(0,0,0,0.1)' }}
        >
          <div style={{
            position: 'absolute',
            top: Math.min(contextMenu.y, window.innerHeight - 200),
            left: Math.min(contextMenu.x, window.innerWidth - 160),
            background: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            borderRadius: '15px',
            padding: '8px 0',
            minWidth: '160px',
            animation: 'popIn 0.2s ease-out'
          }}>
            {/* Reactions */}
            <div style={{ display: 'flex', justifyContent: 'space-around', padding: '5px 10px', borderBottom: '1px solid #f0f0f0', marginBottom: '5px' }}>
              {['❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                <span key={emoji} style={{ cursor: 'pointer', fontSize: '20px' }} onClick={() => handleReact(emoji, contextMenu.msg)}>{emoji}</span>
              ))}
            </div>
            
            <div className="menu-opt" onClick={() => { setShowSelectOptions(contextMenu.msg); closeMenu(); }}>
              ✅ Select
            </div>

            <div className="menu-opt" onClick={() => copyToClipboard(contextMenu.msg.text)}>
              {contextMenu.msg.type === 'text' ? '📋 Copy Text' : '🔗 Copy Link'}
            </div>
            
            <div className="menu-opt" onClick={() => { setReplyTo(contextMenu.msg);
setTimeout(() => {
  inputRef.current?.focus();
}, 100); closeMenu(); }}>↪️ Reply</div>
            
            {/* 🔥 Save option for photo/video/voice */}
            {(['image', 'video', 'voice'].includes(contextMenu.msg.type)) && (
              <div className="menu-opt" onClick={() => {
                downloadMedia(contextMenu.msg.text, `${contextMenu.msg.type}_${Date.now()}`);
                closeMenu();
              }}>💾 Save to Gallery</div>
            )}

            {/* Edit Option (Own messages only) */}
            {String(contextMenu.msg.sender) === String(user.id) && (
              <div 
                className="menu-opt" 
                onClick={() => {
                  editMsg(contextMenu.msg);
                  closeMenu();
                }}
              >
                ✏️ Edit Message
              </div>
            )}

            {/* Delete Option (Everyone's messages) */}
            <div className="menu-opt" style={{ color: 'red' }} onClick={() => { deleteMsg(contextMenu.msg); closeMenu(); }}>
              🗑️ Delete
            </div>
          </div>
        </div>
      )}
      {deletePopup && (
  <div style={{
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.4)",
    zIndex: 6000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>

    <div style={{
      background: "#fff",
      borderRadius: "12px",
      padding: "20px",
      width: "280px",
      textAlign: "center"
    }}>

      <h3 style={{ marginBottom: "15px" }}>Delete message?</h3>

      <div 
        onClick={deleteForMe}
        style={{ padding: "10px", cursor: "pointer" }}
      >
        🧍 Delete for me
      </div>

      {String(deletePopup.sender) === String(user.id) && (
        <div 
          onClick={deleteForEveryone}
          style={{ padding: "10px", cursor: "pointer", color: "red" }}
        >
          🗑️ Delete for everyone
        </div>
      )}

      <div 
        onClick={() => setDeletePopup(null)}
        style={{ padding: "10px", cursor: "pointer", color: "#555" }}
      >
        Cancel
      </div>

    </div>
  </div>



)}

{editPopup && (
  <div style={{
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.4)",
    zIndex: 6000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>

    <div style={{
      background: "#fff",
      borderRadius: "12px",
      padding: "20px",
      width: "300px",
      textAlign: "center"
    }}>

      <h3>Edit message</h3>

      <input
        type="text"
        defaultValue={editPopup.text}
        id="editInput"
        style={{
          width: "100%",
          padding: "10px",
          marginTop: "10px",
          border: "1px solid #ddd",
          borderRadius: "8px"
        }}
      />

      <div 
        onClick={() => editForMe(document.getElementById("editInput").value)}
        style={{ padding: "10px", cursor: "pointer" }}
      >
        🧍 Edit for me
      </div>

      <div 
        onClick={() => editForEveryone(document.getElementById("editInput").value)}
        style={{ padding: "10px", cursor: "pointer", color: "green" }}
      >
        ✏️ Edit for everyone
      </div>

      <div 
        onClick={() => setEditPopup(null)}
        style={{ padding: "10px", cursor: "pointer", color: "#555" }}
      >
        Cancel
      </div>

    </div>
  </div>
)}{showThemePopup && (
  <div style={{
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    zIndex: 3000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  }}
  onClick={() => setShowThemePopup(false)} // 🔥 outside click close
  >
    <div 
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "15px",
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "10px"
      }}
    >

    {["default","dark","ocean","sunset","neon","snapchat"].map(t => (
  <div
    key={t}
    style={{
      padding: "10px",
      borderRadius: "10px",
      background: themes[t],
      color: "#fff",
      textAlign: "center"
    }}
  >
    <div style={{ marginBottom: "8px" }}>{t}</div>

    <div style={{ display: "flex", gap: "5px" }}>
      
      <button
        onClick={() => selectTheme(t, "me")}
        style={{
          flex: 1,
          padding: "5px",
          fontSize: "12px",
          cursor: "pointer"
        }}
      >
        For Me
      </button>

      <button
        onClick={() => selectTheme(t, "everyone")}
        style={{
          flex: 1,
          padding: "5px",
          fontSize: "12px",
          cursor: "pointer",
          background: "#25D366",
          color: "#fff",
          border: "none"
        }}
      >
        Everyone
      </button>

    </div>
  </div>
))}

    </div>
  </div>
)}

{/* 🔥 NEW: Friend Profile View */}
{showFriendProfile && (
  <FriendProfileView
    friend={friend}
    user={user}
    onClose={() => setShowFriendProfile(false)}
  />
)}

{/* 🔥 LIVE CAMERA MODAL */}
{showLiveCamera && (
  <Camera 
    onCapture={handleLiveCapture} 
    onClose={() => setShowLiveCamera(false)} 
  />
)}

{/* 🔥 SELECT OPTIONS POPUP */}
{showSelectOptions && (
  <div style={{
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.4)', zIndex: 10002,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  }}>
    <div style={{ background: '#fff', borderRadius: '15px', width: '280px', padding: '10px' }}>
      <div className="menu-opt" style={{ textAlign: 'center', fontWeight: '600', borderBottom: '1px solid #eee' }} onClick={() => handleSelectChoice(showSelectOptions, 'all')}>
        All Select
      </div>
      <div className="menu-opt" style={{ textAlign: 'center', fontWeight: '600' }} onClick={() => handleSelectChoice(showSelectOptions, 'manual')}>
        Select Manually
      </div>
      <div className="menu-opt" style={{ textAlign: 'center', color: '#888', fontSize: '14px' }} onClick={() => setShowSelectOptions(null)}>
        Cancel
      </div>
    </div>
  </div>
)}

{/* 🔥 FORWARD PICKER MODAL */}
{showForwardPicker && (
  <div style={{
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.5)', zIndex: 10001,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  }}>
    <div style={{ background: '#fff', borderRadius: '15px', width: '90%', maxWidth: '400px', maxHeight: '70%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>Forward to...</h3>
        <button onClick={() => setShowForwardPicker(false)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {friendsList.map(f => (
          <div key={f.id} onClick={() => forwardMessages(f)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f9f9f9' }}>
            <img src={f.avatar || f.profile_pic} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #FFFC00' }} alt="" />
            <span style={{ fontWeight: '500' }}>{f.username}</span>
            <span style={{ marginLeft: 'auto', color: '#00B4F6' }}>Send ➤</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

{/* 🔥 MEDIA PREVIEW MODAL (LIGHTBOX) */}
{previewMedia && (
  <div 
    style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.9)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'popIn 0.2s ease-out'
    }}
    onClick={() => setPreviewMedia(null)}
  >
    <button 
      onClick={() => setPreviewMedia(null)}
      style={{
        position: 'absolute', top: '20px', right: '20px',
        background: 'transparent', border: 'none', color: '#fff',
        fontSize: '30px', cursor: 'pointer'
      }}
    >✕</button>
    
    {previewMedia.type === 'image' ? (
      <img src={previewMedia.url} style={{ maxWidth: '95%', maxHeight: '90%', objectFit: 'contain' }} />
    ) : (
      <video src={previewMedia.url} controls autoPlay style={{ maxWidth: '95%', maxHeight: '90%' }} />
    )}
  </div>
)}
    </div>
    
  );
   
};

// CSS Animations for typing dots
const styles = `
@keyframes dot {
  0%, 60%, 100% { transform: scale(1); }
  30% { transform: scale(1.4); }
}
@keyframes onlinePulse {
  0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7); }
  70% { box-shadow: 0 0 0 5px rgba(37, 211, 102, 0); }
  100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
}
@keyframes popIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.dancing-cartoon {
  animation: dancing 0.8s infinite ease-in-out;
  display: inline-block;
}
@keyframes dancing {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-3px) rotate(-10deg); }
  75% { transform: translateY(-3px) rotate(10deg); }
}
.blink-red {
  animation: blink 1s infinite;
}
@keyframes blink {
  0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; }
}
.menu-opt {
  padding: 10px 15px;
  cursor: pointer;
  transition: background 0.2s;
}
.menu-opt:hover { background: #f5f5f5; }
.typing-dots span {
  animation: typingFade 1.4s infinite;
  opacity: 0;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingFade {
  0% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 0; }
}
`;

export default ChatBox;



      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
     {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
     