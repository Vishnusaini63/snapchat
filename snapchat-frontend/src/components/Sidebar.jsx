import React, { useEffect, useState } from "react";
import axios from "axios";
import socket from "./socket.js";
import { useNavigate } from "react-router-dom";
import FriendRequestsView from "./FriendRequestsView.jsx"; // 🔥 NEW: Import FriendRequestsView
import AddFriendsView from "./AddFriendsView.jsx";
// 🔥 Move getHint outside to use it in multiple places
const getHint = (data) => {
  const type = data.type || data.mediaType;
  const content = data.edited_text || data.text || data.message || data.audioUrl;
  if (type === 'image') return "📷 Photo";
  if (type === 'video') return "📹 Video";
  if (type === 'voice') return "🎤 Voice message";
  if (type === 'document') return "📄 Document";
  if (type === 'profile') {
    try {
         const raw = typeof content === 'string' ? JSON.parse(content) : content;
      return `👤 ${raw.username}`;
    } catch (e) { return "👤 Profile"; }
  }
  if (type?.includes('call')) return content || "📞 Call log";
  return content ? (content.length > 20 ? content.substring(0, 20) + "..." : content) : "New message";
};

const Sidebar = ({ onSelectFriend, selectedFriend }) => {
  const navigate = useNavigate();
  // 🔥 CURRENT USER ID & DATA
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [user, setUser] = useState(currentUser); // 👈 Start with local data

  const [showAddFriendsView, setShowAddFriendsView] = useState(false);
  const [showFriendRequestsView, setShowFriendRequestsView] = useState(false); // 🔥 NEW state for requests

  const [searchQuery, setSearchQuery] = useState(""); // 🔥 NEW: Search query state
  const [isSearching, setIsSearching] = useState(false); // 🔥 NEW: Toggle search bar
  const [friends, setFriends] = useState([]);
  const [ongoingCall, setOngoingCall] = useState(null);
  const [callIncoming, setCallIncoming] = useState(null); // 🔥 Global Incoming state
  const [requestBadge, setRequestBadge] = useState(0); // 🔥 New request badge count
  const ringtone = React.useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3")).current;
  const receiveSound = React.useRef(new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3")).current;
  
  // 🔥 Last messages preview state
  const [lastMessages, setLastMessages] = useState(() => {
    const saved = localStorage.getItem("lastMessages");
    return saved ? JSON.parse(saved) : {};
  });

  //  Unread counts state
  const [unreadCounts, setUnreadCounts] = useState(() => {
    const saved = localStorage.getItem("unreadCounts");
    return saved ? JSON.parse(saved) : {};
  });


  const [muteSettings, setMuteSettings] = useState({});
  const muteSettingsRef = React.useRef({});

  const token = localStorage.getItem("token");
  
  useEffect(() => {
    axios.get("http://localhost:5000/api/auth/profile", {
      headers: { authorization: "Bearer " + token }
    })
    .then(res => {
      const u = res.data.user;
      setUser({ ...u, avatar: u.avatar || u.profile_pic, profile_pic: u.profile_pic || u.avatar });
    });

    // 🔥 Fetch unread counts from server on load
    if (currentUser?.id) {
      axios.get(`http://localhost:5000/api/messages/unread-counts/${currentUser.id}`)
        .then(res => {
          const counts = {};
          res.data.forEach(item => {
            counts[item.sender_id] = item.count;
          });
          setUnreadCounts(counts);
          localStorage.setItem("unreadCounts", JSON.stringify(counts));
        });

      // 🔥 Fetch latest message text for each friend from DB
      axios.get(`http://localhost:5000/api/messages/last-messages/${currentUser.id}`)
        .then(res => {
          const msgs = {};
          res.data.forEach(m => {
            msgs[m.friend_id] = getHint(m);
          });
          setLastMessages(prev => ({ ...prev, ...msgs }));
          localStorage.setItem("lastMessages", JSON.stringify({ ...lastMessages, ...msgs }));
        });
// 🔥 Fetch Mute Settings for all friends
      axios.get(`http://localhost:5000/api/chat/mute-settings/all/${currentUser.id}`)
        .then(res => {
         if (res.data && Array.isArray(res.data)) {
            const settings = {};
            res.data.forEach(s => { settings[String(s.friend_id)] = { chat: !!s.is_chat_muted, call: !!s.is_call_muted }; });
            setMuteSettings(settings);
            muteSettingsRef.current = settings;
          }
        })
   .catch(err => console.log("Mute settings API not found. Using default sounds."));


      // 🔥 Fetch initial pending requests count
      axios.get("http://localhost:5000/api/auth/requests", {
        headers: { authorization: "Bearer " + token }
      })
      .then(res => {
        setRequestBadge(res.data.length);
      });

    }

    getFriends();
  }, [token]);

  // 🔥 Ensure socket is connected and user is registered as soon as Sidebar loads
  useEffect(() => {
    if (!currentUser?.id) return;

    if (!socket.connected) socket.connect();
    socket.emit("registerUser", String(currentUser.id));

    const onConnect = () => socket.emit("registerUser", String(currentUser.id));
    socket.on("connect", onConnect);

    return () => socket.off("connect", onConnect);
  }, [currentUser?.id]);

useEffect(() => {
  const call = JSON.parse(localStorage.getItem("ongoingCall"));
  setOngoingCall(call || null);
}, []);
useEffect(() => {
  const interval = setInterval(() => {
    const call = JSON.parse(localStorage.getItem("ongoingCall"));
    setOngoingCall(call || null);
  }, 1000);

  return () => clearInterval(interval);
}, []);
useEffect(() => {
  const openId = localStorage.getItem("openChatUser");

  if (openId && friends.length > 0) {
    const f = friends.find(u => String(u.id) === String(openId));
    
    if (f) {
      onSelectFriend(f); // 🔥 DIRECT CHAT OPEN
      localStorage.removeItem("openChatUser");
    }
  }
}, [friends]);
  // 🔔 Socket Listener for Notifications
  useEffect(() => {
    if (!currentUser) return;

    const updateSidebarPreview = (data) => {
      // Detect the friend's ID (could be sender or receiver)
      const senderId = String(data.sender || data.senderId || data.from || "");
      const receiverId = String(data.receiver || data.receiverId || "");
      const friendId = String(senderId === String(currentUser.id) ? receiverId : senderId);
      
      if (!friendId || friendId === "undefined") return;
      
      // Check if this message is from the friend currently open in chat
      const isChattingWithSender = selectedFriend && String(selectedFriend.id) === friendId;

      // 1. Update Last Message Hint (Always update side preview)
      const hint = getHint(data);
      setLastMessages(prev => {
        const newLastMsgs = { ...prev, [friendId]: hint };
        localStorage.setItem("lastMessages", JSON.stringify(newLastMsgs));
        return newLastMsgs;
      });

      // Update Badge only for incoming messages not currently being read
      if (!isChattingWithSender && senderId !== String(currentUser.id)) {
        // 🔔 Respect Mute Settings (Robust check)
        const friendKey = String(friendId);
        const settings = muteSettingsRef.current?.[friendKey];
        const isChatMuted = !!settings?.chat; // Handles true, 1, "1" etc.

        console.log(`[Sidebar] Message from ${friendKey}. Muted: ${isChatMuted}`, settings);

        if (!isChatMuted) {
          receiveSound.currentTime = 0;
          receiveSound.play().catch((err) => console.log("Sound play failed:", err));
        } else {
          console.log("🔇 Sound suppressed (Chat is muted)");
        }

        // 1. Update Badge Count
        setUnreadCounts(prev => {
          const newCounts = { ...prev, [friendId]: (prev[friendId] || 0) + 1 };
          localStorage.setItem("unreadCounts", JSON.stringify(newCounts));
          return newCounts;
        });

        // 2. 💾 Save message to localStorage history (Background Save)
        // This ensures if user refreshes before opening chat, message is not lost.
        const chatKey = `chat_${currentUser.id}_${senderId}`;
        const history = JSON.parse(localStorage.getItem(chatKey) || "[]");
        
        // Avoid duplicates if ChatBox is somehow also running (unlikely if !isChattingWithSender)
        const exists = history.some(msg => msg.localId === data.localId);
        if (!exists) {
          history.push(data);
          localStorage.setItem(chatKey, JSON.stringify(history));
        }
      }
    };

    // 📞 Handle Incoming Call Hints
    const handleIncomingCall = (data) => {
      const senderId = String(data.from);
      // 1. Sidebar notification hint
      setLastMessages(prev => {
        const newLastMsgs = { ...prev, [senderId]: `📞 Incoming ${data.callType} call...` };
        localStorage.setItem("lastMessages", JSON.stringify(newLastMsgs));
        return newLastMsgs;
      });

      // 2. 🔥 Trigger Global Incoming UI
      setCallIncoming(data);

      const senderKey = String(senderId);
      const isCallMuted = !!muteSettingsRef.current?.[senderKey]?.call;
      
      console.log(`[Sidebar] Call from ${senderKey}. Muted: ${isCallMuted}`);

      if (!isCallMuted) {
        ringtone.loop = true;
        ringtone.play().catch(() => {});
      } else {
        console.log("🔇 Ringtone suppressed (Call is muted)");
      }
    };

    const handleAvatarUpdate = (data) => {
      console.log("Avatar update received for user:", data.userId);
      setFriends(prev => {
        const newFriends = prev.map(f => 
          String(f.id) === String(data.userId) ? { ...f, avatar: data.avatar, profile_pic: data.avatar } : f
        );
        
        // Agar wahi friend open hai jiski photo change hui, toh ChatBox/Call screen bhi update hogi
        if (selectedFriend && String(selectedFriend.id) === String(data.userId)) {
          onSelectFriend({ ...selectedFriend, avatar: data.avatar, profile_pic: data.avatar });
        }
        return newFriends;
      });
    };

    const handleMessagesMarkedRead = ({ userId, friendId }) => {
      // Agar maine messages read kiye hain, toh mera badge clear karo
      if (String(userId) === String(currentUser.id)) {
        setUnreadCounts(prev => {
          const newCounts = { ...prev, [friendId]: 0 };
          localStorage.setItem("unreadCounts", JSON.stringify(newCounts));
          return newCounts;
        });
      }
    };

    const handleStopRingtone = () => {
      console.log("[Sidebar] Stopping ringtone...");
      ringtone.pause();
      ringtone.currentTime = 0;
      setCallIncoming(null);
    };


   const handleMuteUpdate = (data) => {
      // 🛡️ Filter settings by userId to prevent global override
      if (String(data.userId) !== String(currentUser?.id)) return;

      setMuteSettings(prev => {
        const newSettings = { ...prev, [String(data.friendId)]: { chat: data.isChatMuted, call: data.isCallMuted } };
        muteSettingsRef.current = newSettings;
        return newSettings;
      });
    };

    const handleNewRequest = () => {
      setRequestBadge(prev => prev + 1);
      receiveSound.play().catch(() => {});
    };

    socket.on("newFriendRequest", handleNewRequest);
    socket.on("receiveMessage", updateSidebarPreview);
    socket.on("messageSent", updateSidebarPreview); // 🔥 Update preview when I send a message too!
    socket.on("incomingCall", handleIncomingCall);
    socket.on("avatarUpdated", handleAvatarUpdate);
    socket.on("messagesMarkedRead", handleMessagesMarkedRead);
    socket.on("muteSettingsUpdated", handleMuteUpdate);
    socket.on("callEnded", handleStopRingtone);
    socket.on("callRejected", handleStopRingtone);


    return () => {
      socket.off("newFriendRequest", handleNewRequest);
      socket.off("receiveMessage", updateSidebarPreview);
      socket.off("messageSent", updateSidebarPreview);
      socket.off("incomingCall", handleIncomingCall);
      socket.off("avatarUpdated", handleAvatarUpdate);
      socket.off("messagesMarkedRead", handleMessagesMarkedRead);
      socket.off("muteSettingsUpdated", handleMuteUpdate);
      socket.off("callEnded", handleStopRingtone);
      socket.off("callRejected", handleStopRingtone);
      
    };
  }, [selectedFriend, currentUser?.id]);



  const getFriends = () => {
    axios.get("http://localhost:5000/api/auth/friends", {
      headers: { authorization: "Bearer " + token }
    })
    .then(res => setFriends(res.data.map(f => ({ ...f, avatar: f.avatar || f.profile_pic }))))
    .catch(err => console.log(err));
  };

  const getUsers = () => {
    setShowAddFriendsView(true);
  };

  const getRequests = () => {
    setShowFriendRequestsView(true); // 🔥 Open new requests view
    setRequestBadge(0); // Clear badge when viewing
  };

const openChat = (friend) => {
  console.log("Chat with:", friend);

  if (!onSelectFriend) {
    console.log("❌ WRONG SIDEBAR USED");
    return;
  }

  // ✅ unread clear
  setUnreadCounts(prev => {
    const newCounts = { ...prev, [friend.id]: 0 };
    localStorage.setItem("unreadCounts", JSON.stringify(newCounts));
    return newCounts;
  });

  // 🔥 Tell server to mark all messages from this friend as read
  socket.emit("markAllAsRead", { senderId: friend.id, receiverId: currentUser.id });

  onSelectFriend(friend);
};

  const handleAcceptCall = () => {
    ringtone.pause();
    ringtone.currentTime = 0;
    
    const caller = friends.find(f => String(f.id) === String(callIncoming.from));
    if (caller) {
      // Seed standard data before switching view
      localStorage.setItem("ongoingCall", JSON.stringify({ 
        withUserId: caller.id, 
        type: callIncoming.callType,
        isInitiator: false // 👈 Receiver hai
      }));
      
      socket.emit("answerCall", { to: callIncoming.from, from: currentUser.id });
      onSelectFriend({ ...caller }); // Direct prop call with fresh object
    }
    setCallIncoming(null);
  };

  const handleRejectCall = () => {
    ringtone.pause();
    ringtone.currentTime = 0;
    
    socket.emit("rejectCall", { 
      to: callIncoming.from, 
      from: currentUser.id, 
      callType: callIncoming.callType 
    });
    setCallIncoming(null);
  };

  return (
    <div style={styles.container}>

      {/* TOP BAR */}
      <div style={styles.topBar}>
        <img 
  src={user?.avatar || user?.profile_pic} 
  style={{ ...styles.avatar, cursor: "pointer" }} 
  onClick={() => navigate("/settings")} 
/>
        <h2 style={styles.title}>Chat</h2>

        <div style={styles.rightIcons}>
          <div 
            style={{ 
              ...styles.icon, 
              backgroundColor: isSearching ? "#FFFC00" : "#eee" 
            }} 
            onClick={() => { setIsSearching(!isSearching); if(isSearching) setSearchQuery(""); }}
          >🔍</div>
          <div style={{ position: "relative" }}>
            <div style={styles.icon} onClick={getRequests}>🔔</div>
            {requestBadge > 0 && (
              <div style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                background: "#FF0000",
                color: "white",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: "bold",
                border: "2px solid #fff"
              }}>
                {requestBadge}
              </div>
            )}
          </div>
          <div style={styles.add} onClick={getUsers}>👤+</div>
        </div>
      </div>

      {/* 🔥 NEW: Search Bar UI */}
      {isSearching && (
        <div style={styles.searchContainer}>
          <input 
            type="text" 
            placeholder="Search friends..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
            autoFocus
          />
        </div>
      )}

      {/* USER */}
 {user && (
  <div 
    style={{ ...styles.userCard, cursor: "pointer" }}
    onClick={() => navigate("/settings")} // ✅ YAHAN HONA CHAHIYE
  >

   
  </div>
)}

  {/* FRIENDS */}
<div style={styles.chatList}>
  {friends
    .filter(f => String(f.id) !== String(currentUser?.id)) // ✅ ADD THIS
    .filter(f => f.username.toLowerCase().includes(searchQuery.toLowerCase())) // 🔥 NEW: Search logic
    .map(f => (
      <div
        key={f.id}
        style={styles.chatItem}
        onClick={() => openChat(f)}
      >
        <img src={f.avatar || f.profile_pic} style={styles.avatar} />

        <div>
          <strong>{f.username}</strong>
          <p style={{ 
            ...styles.sub, 
            color: unreadCounts[f.id] > 0 ? '#00B4F6' : '#888', 
            fontWeight: unreadCounts[f.id] > 0 ? 'bold' : 'normal' 
          }}>
            {lastMessages[f.id] || "Tap to chat 💬"}
          </p>
        </div>

        {/* 🔴 UNREAD BADGE */}
        {unreadCounts[f.id] > 0 && (
          <div style={{
            marginLeft: 'auto', 
            background: '#FF0000', 
            color: 'white', 
            borderRadius: '50%', 
            width: '24px', 
            height: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '12px', 
            fontWeight: 'bold'
          }}>
            {unreadCounts[f.id]}
          </div>
        )}
      </div>
    ))}
</div>

{/* 🟢 CALL RETURN BANNER */}
{ongoingCall && ongoingCall.withUserId && (
  <div
  onClick={() => {
  const call = JSON.parse(localStorage.getItem("ongoingCall"));

  if (!call) return;

  const f = friends.find(u => String(u.id) === String(call.withUserId));

  if (f) {
    onSelectFriend(f);

    // 🔥 call resume trigger
    setTimeout(() => {
      window.dispatchEvent(new Event("resumeCall"));
    }, 200);
  }
}}
    style={{
      width: "100%",
      background: "#25D366",
      color: "#000",
      textAlign: "center",
      padding: "10px 0",
      fontWeight: "600",
      cursor: "pointer",
      marginTop: "10px"
    }}
  >
    Tap to return to call
  </div>
)}

      {/* 📞 GLOBAL INCOMING CALL UI (Cover everything) */}
      {callIncoming && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "#000", color: "#fff", zIndex: 100000,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
             width: "120px", height: "120px", borderRadius: "50%", background: "#333",
             border: "3px solid #FFFC00", overflow: "hidden", marginBottom: "20px"
          }}>
             {friends.find(f => String(f.id) === String(callIncoming.from)) ? (
               <img src={friends.find(f => String(f.id) === String(callIncoming.from)).avatar || friends.find(f => String(f.id) === String(callIncoming.from)).profile_pic} style={{width:"100%", height:"100%", objectFit:"cover"}} />
             ) : "👤"}
          </div>
          <h2>{callIncoming.name || "Friend"}</h2>
          <p style={{ color: "#25D366", fontWeight: "bold", marginTop: "10px" }}>
            Incoming {callIncoming.callType} call...
          </p>
          
          <div style={{ display: "flex", gap: "30px", marginTop: "40px" }}>
            <button onClick={handleAcceptCall} style={{
              background: "#25D366", color: "white", width: "70px", height: "70px", 
              borderRadius: "50%", border: "none", fontSize: "24px", cursor: "pointer"
            }}>📞</button>
            <button onClick={handleRejectCall} style={{
              background: "red", color: "white", width: "70px", height: "70px", 
              borderRadius: "50%", border: "none", fontSize: "24px", cursor: "pointer"
            }}>❌</button>
          </div>
        </div>
      )}

      {/* 🔥 NEW: Friend Requests View */}
      {showFriendRequestsView && (
        <FriendRequestsView
          user={user}
          onClose={() => setShowFriendRequestsView(false)}
          onFriendAdded={getFriends} // Friends list refresh karne ke liye
        />
      )}

      {showAddFriendsView && (
        <AddFriendsView 
          user={user} 
          onClose={() => setShowAddFriendsView(false)} 
          onFriendAdded={getFriends}
        />
      )}
    </div>
    
  );
};

const styles = {
  container: { 
    padding: "12px",
    boxSizing: "border-box",
    maxWidth: "500px", // Fixed mobile width
    margin: "0 auto",   // Centering
    height: "100vh",
    borderLeft: "1px solid #f0f0f0",
    borderRight: "1px solid #f0f0f0",
    backgroundColor: "#fff",
    overflowY: "auto"
  },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  avatar: { width: "42px", height: "42px", borderRadius: "50%", border: "2px solid #fffc00" },
  title: { fontSize: "20px" },
  rightIcons: { display: "flex", gap: "10px" },
  icon: { background: "#eee", padding: "8px", borderRadius: "50%", cursor: "pointer" },
  add: { background: "#fffc00", padding: "8px", borderRadius: "50%", cursor: "pointer" },
  userCard: { display: "flex", gap: "10px", marginTop: "10px" },
  chatList: { marginTop: "10px" },
  chatItem: { display: "flex", alignItems: "center", gap: "10px", padding: "10px", cursor: "pointer" },
  sub: { fontSize: "12px", color: "#888" },
  box: { marginTop: "10px", background: "#fff", padding: "10px", borderRadius: "10px" },
  searchContainer: { 
    padding: '10px 0', 
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: '#fff' 
  },
  searchInput: { 
    width: '100%', 
    padding: '10px 15px', 
    borderRadius: '20px', 
    border: '1px solid #ddd', 
    outline: 'none', 
    background: '#f0f2f5', 
    fontSize: '15px',
    boxSizing: 'border-box'
  },
};

export default Sidebar;



      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
     
     