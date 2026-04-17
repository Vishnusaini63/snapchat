import React, { useState, useEffect } from 'react';
import axios from 'axios';
import socket from "./socket.js";

const FriendProfileView = ({ friend, user, onClose }) => {
  const [media, setMedia] = useState([]);
  const [links, setLinks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('media'); // 'media', 'links', 'documents'
  const [previewMedia, setPreviewMedia] = useState(null); // 🔥 NEW: Media Preview State
  const [showMenu, setShowMenu] = useState(false); // 🔥 NEW: Kebab Menu State
  const [isChatMuted, setIsChatMuted] = useState(false);
  const [isCallMuted, setIsCallMuted] = useState(false);
const [selectUserMode, setSelectUserMode] = useState(false);
const [showNamePopup, setShowNamePopup] = useState(false);
const [newName, setNewName] = useState("");
const [showForwardPicker, setShowForwardPicker] = useState(false);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  const [deleteAfter, setDeleteAfter] = useState('never');
const [friendsList, setFriendsList] = useState([]);
 
useEffect(() => {
  const fetchDeleteMode = async () => {
    try {
      const res = await axios.get(
        `https://snapchat-vgrt.onrender.com/api/chat/delete-mode/${user.id}/${friend.id}`
      );

      console.log("DELETE MODE API:", res.data); // 🔥 debug

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
        setIsCallMuted(!!res.data.isCallMuted);
      }
    } catch (err) {
      console.error("Error fetching mute settings:", err);
    }
  };
  fetchMuteSettings();
}, [user.id, friend.id]);

  // 🔥 NEW: Listen for real-time updates to keep toggle in sync
  useEffect(() => {
    socket.on("deleteModeUpdated", (data) => {
      setDeleteAfter(data.deleteMode);
    });
    return () => socket.off("deleteModeUpdated");
  }, []);

  useEffect(() => {
    const fetchChatContent = async () => {
      try {
        const res = await axios.get(`https://snapchat-vgrt.onrender.com/api/messages/history/${user.id}/${friend.id}`);
        const allMessages = res.data;

        const mediaFiles = [];
        const extractedLinks = [];
        const documentFiles = [];

        allMessages.forEach(msg => {
          // Ensure msg.text is used as it contains the URL/content on frontend
          const messageContent = msg.edited_text || msg.message;

          if (msg.type === 'image' || msg.type === 'video') {
            mediaFiles.push({
              id: msg.id,
              url: messageContent,
              type: msg.type,
              timestamp: msg.created_at
            });
          } else if (msg.type === 'document') {
              documentFiles.push({
                  id: msg.id,
                  url: messageContent,
                  name: messageContent.split('/').pop(), // Extract filename from URL
                  timestamp: msg.created_at
              });
          } else if (msg.type === 'text') {
            // Simple regex to find URLs in text messages
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            let match;
            while ((match = urlRegex.exec(messageContent)) !== null) {
              extractedLinks.push({
                id: msg.id,
                url: match[0],
                text: messageContent,
                timestamp: msg.created_at
              });
            }
            // Basic heuristic: if a text message looks like a document URL
            const docUrlRegex = /\/uploads\/[^\s]+\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)$/i;
            if (docUrlRegex.test(messageContent)) {
                documentFiles.push({
                    id: msg.id,
                    url: messageContent,
                    name: messageContent.split('/').pop(),
                    timestamp: msg.created_at
                });
            }
          }
        });

        setMedia(mediaFiles);
        setLinks(extractedLinks);
        setDocuments(documentFiles);
      } catch (error) {
        console.error("Error fetching chat content:", error);
      }
    };

    fetchChatContent();
  }, [friend.id, user.id]);

useEffect(() => {
// ✅ FIXED DELETE EVENT
socket.on("messageDeleted", ({ messageId }) => {
  setMedia(prev => prev.filter(m => m.id !== messageId));
  setLinks(prev => prev.filter(l => l.id !== messageId));
  setDocuments(prev => prev.filter(d => d.id !== messageId));
});

  return () => socket.off("messageDeleted");
}, []);

const handleRemoveFriend = async () => {
  try {
    await axios.delete("https://snapchat-vgrt.onrender.com/api/friends/remove", {
      data: {
        userId: user.id,
        friendId: friend.id
      }
    });

    alert("Friend removed");

    // UI se remove karna
    onClose(); // profile band kar
    // optionally: refresh friend list
  } catch (error) {
    console.error(error);
    alert("Failed to remove friend");
  }
};

const handleEditName = async (nickname) => {
  try {
    await axios.post("https://snapchat-vgrt.onrender.com/api/friends/nickname", {
      userId: user.id,
      friendId: friend.id,
      nickname
    });

    alert("Name updated ✅");
  } catch (err) {
    console.error(err);
  }
};


const handleBlock = async () => {
  if (!window.confirm("Block this user?")) return;

  try {
    await axios.post("https://snapchat-vgrt.onrender.com/api/friends/block", {
      userId: user.id,
      friendId: friend.id
    });

    alert("User blocked 🚫");
    onClose();
  } catch (err) {
    console.error(err);
  }
};



  const openForwardPicker = async () => {
    try {
      const res = await axios.get("https://snapchat-vgrt.onrender.com/api/auth/friends", {
        headers: { authorization: "Bearer " + localStorage.getItem("token") }
      });
      setFriendsList(res.data);
      setShowForwardPicker(true);
      setShowMenu(false); // Menu close kar do list dikhate waqt
    } catch (err) {
      console.error("Forward picker error", err);
    }
  };

  const sendProfileToFriend = (toFriend) => {
    const profileObj = {
      username: friend.username,
      avatar: friend.avatar || friend.profile_pic
    };
    const profileData = JSON.stringify(profileObj);
    const localId = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    socket.emit("sendMessage", {
      localId: localId,
      sender: user.id,
      receiver: toFriend.id,
      text: profileData,
      type: 'profile'
    });

    setShowForwardPicker(false);
    alert(`Profile sent to ${toFriend.username}! 🚀`);
  };
const handleToggleMute = async (type) => {
  let newChatMuted = isChatMuted;
  let newCallMuted = isCallMuted;

  if (type === "chat") {
    newChatMuted = !isChatMuted;
    setIsChatMuted(newChatMuted);
  }

  if (type === "call") {
    newCallMuted = !isCallMuted;
    setIsCallMuted(newCallMuted);
  }

  console.log("SENDING:", newChatMuted, newCallMuted); // 🔥 DEBUG

  try {
    await axios.post("https://snapchat-vgrt.onrender.com/api/chat/mute-settings", {
      userId: user.id,
      friendId: friend.id,
      isChatMuted: newChatMuted,
      isCallMuted: newCallMuted
    });
  } catch (err) {
    console.error(err);
  }
};
 
const handleSaveDeleteMode = async () => {
  try {
    await axios.post("https://snapchat-vgrt.onrender.com/api/chat/delete-mode", {
      userId: user.id,
      friendId: friend.id,
      deleteMode: deleteAfter, 
      type: 'everyone'        // 🔥 Added type
    });

    alert("Delete mode updated ✅");
    setShowDeleteOptions(false);
  } catch (err) {
    console.error(err);
    alert("Error saving mode");
  }
};
  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={onClose} style={styles.closeButton}>←</button>
          <h2 style={styles.title}>{friend.username}'s Profile</h2>
          
          {/* 🔥 NEW: 3-DOT KEBAB MENU */}
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <button onClick={() => setShowMenu(!showMenu)} style={styles.menuButton}>⋮</button>
            {showMenu && (
              <>
                <div style={styles.menuOverlay} onClick={() => setShowMenu(false)} />
                <div style={styles.popupMenu}>
                        <div style={styles.menuItem} onClick={() => handleToggleMute('chat')}>
                    <span>Mute Chat</span>
                    <div style={{ ...styles.toggleTrack, ...(isChatMuted && styles.toggleTrackActive) }}>
                      <div style={{ ...styles.toggleThumb, ...(isChatMuted && styles.toggleThumbActive) }} />
                    </div>
                  </div>
                  
                 <div style={styles.menuItem} onClick={() => handleToggleMute('call')}>
                    <span>Mute Call</span>
                    <div style={{ ...styles.toggleTrack, ...(isCallMuted && styles.toggleTrackActive) }}>
                      <div style={{ ...styles.toggleThumb, ...(isCallMuted && styles.toggleThumbActive) }} />
                    </div>
                  </div>

                  <div style={styles.menuSeparator} />
                  
<div style={styles.menuItem} onClick={handleRemoveFriend}>
  👤 Remove Friend
</div>                  <div style={styles.menuItem} onClick={handleBlock}>
  🚫 Block Friend
</div>
 <div 
  style={styles.menuItem} 
  onClick={() => setShowNamePopup(true)}
>
  ✏️ Edit Display Name
</div>
                  
                  <div style={styles.menuSeparator} />
                  
                  <div 
                    style={{ ...styles.menuItem, color: 'red' }} 
                    onClick={() => { setShowDeleteOptions(true); setShowMenu(false); }}
                  >
                    🗑️ Delete Messages
                  </div>
                  <div style={styles.menuItem} onClick={openForwardPicker}>
                    📤 Send Profile
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
{showNamePopup && (
  <div style={popupStyles.overlay}>
    <div style={popupStyles.box}>
      
      <h3>Edit Name</h3>

      <input
        type="text"
        placeholder="Enter new name"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        style={popupStyles.input}
      />

      <div style={popupStyles.actions}>
        <button onClick={() => setShowNamePopup(false)}>Cancel</button>
        
        <button onClick={async () => {
          if (!newName) return;

          await handleEditName(newName);
          setShowNamePopup(false);
          setNewName("");
        }}>
          Save
        </button>
      </div>

    </div>
  </div>
)}

{showDeleteOptions && (
  <div style={popupStyles.overlay}>
    <div style={{ ...popupStyles.box, width: '280px' }}>
      <h3 style={{ marginBottom: '15px', textAlign: 'center' }}>Delete Messages</h3>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px', textAlign: 'center' }}>
        Choose when messages should be deleted for both users.
      </p>
      
    <div 
  style={styles.menuItem}
  onClick={() => setDeleteAfter('after_view')}
>
  <span>After Viewing</span>
  <div style={{ ...styles.toggleTrack, ...(deleteAfter === 'after_view' && styles.toggleTrackActive) }}>
    <div style={{ ...styles.toggleThumb, ...(deleteAfter === 'after_view' && styles.toggleThumbActive) }} />
  </div>
</div>

<div 
  style={styles.menuItem}
  onClick={() => setDeleteAfter('24_hours')}
>
  <span>24 Hours after viewing</span>
  <div style={{ ...styles.toggleTrack, ...(deleteAfter === '24_hours' && styles.toggleTrackActive) }}>
    <div style={{ ...styles.toggleThumb, ...(deleteAfter === '24_hours' && styles.toggleThumbActive) }} />
  </div>
</div>

<div 
  style={styles.menuItem}
  onClick={() => setDeleteAfter('never')}
>
  <span>Never (Stay forever)</span>
  <div style={{ ...styles.toggleTrack, ...(deleteAfter === 'never' && styles.toggleTrackActive) }}>
    <div style={{ ...styles.toggleThumb, ...(deleteAfter === 'never' && styles.toggleThumbActive) }} />
  </div>
</div>

     <div style={{ ...popupStyles.actions, justifyContent: 'space-between', marginTop: '15px' }}>
  <button onClick={() => setShowDeleteOptions(false)}>Cancel</button>

  <button onClick={handleSaveDeleteMode}>
    Save
  </button>
</div>
    </div>
  </div>
)}
        <div style={styles.profileInfo}>
          <img src={friend.avatar || friend.profile_pic} alt={friend.username} style={styles.avatar} />
          <h3>{friend.username}</h3>
          <p>{friend.email}</p> {/* Assuming email is available */}
        </div>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tabButton, ...(activeTab === 'media' && styles.activeTab) }}
            onClick={() => setActiveTab('media')}
          >
            Media ({media.length})
          </button>
          <button
            style={{ ...styles.tabButton, ...(activeTab === 'links' && styles.activeTab) }}
            onClick={() => setActiveTab('links')}
          >
            Links ({links.length})
          </button>
          <button
            style={{ ...styles.tabButton, ...(activeTab === 'documents' && styles.activeTab) }}
            onClick={() => setActiveTab('documents')}
          >
            Doc ({documents.length})
          </button>
        </div>

        <div style={styles.content}>
          {activeTab === 'media' && (
            <div style={styles.mediaGrid}>
              {media.length > 0 ? (
                media.map(item => (
                  <div 
                    key={item.id} 
                    style={{ ...styles.mediaItem, cursor: 'pointer' }}
                    onClick={() => {
  setPreviewMedia({ url: item.url, type: item.type });

if (item.id) {
  socket.emit("messageOpened", {
    messageId: item.id
  });
} else {
  console.log("❌ No ID for delete:", item);
}
}}
                  >
                    {item.type === 'image' ? (
                      <img src={item.url} alt="Media" style={styles.mediaThumbnail} />
                    ) : (
                      <video src={item.url} style={styles.mediaThumbnail} />
                    )}
                  </div>
                ))
              ) : (
                <p>No media shared.</p>
              )}
            </div>
          )}

          {activeTab === 'links' && (
            <div style={styles.linksList}>
              {links.length > 0 ? (
                links.map(item => (
                  <div key={item.id} style={styles.linkItem}>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
                    <p style={styles.linkContext}>{item.text}</p>
                  </div>
                ))
              ) : (
                <p>No links shared.</p>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div style={styles.documentsList}>
              {documents.length > 0 ? (
                documents.map(item => (
                  <div key={item.id} style={styles.documentItem}>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">{item.name || item.url}</a>
                  </div>
                ))
              ) : (
                <p>No documents shared.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🔥 FORWARD PICKER MODAL (Chat List for sending profile) */}
      {showForwardPicker && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: 10001,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#fff', borderRadius: '15px', width: '90%', maxWidth: '400px', maxHeight: '70%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>Send Profile to...</h3>
              <button onClick={() => setShowForwardPicker(false)} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
              {friendsList.map(f => (
                <div key={f.id} onClick={() => sendProfileToFriend(f)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f9f9f9' }}>
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
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.9)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
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
const popupStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  },
  box: {
    background: "#fff",
    padding: "20px",
    borderRadius: "10px",
    width: "300px"
  },
  input: {
    width: "100%",
    padding: "8px",
    marginTop: "10px"
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "15px"
  }
};
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5000,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: '15px',
    width: '90%',
    maxWidth: '500px',
    height: '90%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px',
    borderBottom: '1px solid #eee',
    backgroundColor: '#f8f8f8',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    marginRight: '15px',
    color: '#333',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #eee',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '10px',
    border: '3px solid #FFFC00',
  },
  tabs: {
    display: 'flex',
    justifyContent: 'space-around',
    borderBottom: '1px solid #eee',
    backgroundColor: '#f8f8f8',
  },
  tabButton: {
    flex: 1,
    padding: '12px 10px',
    border: 'none',
    background: 'none',
    fontSize: '15px',
    cursor: 'pointer',
    color: '#555',
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    transition: 'all 0.2s ease',
  },
  activeTab: {
    color: '#00B4F6',
    borderBottomColor: '#00B4F6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '15px',
  },
  mediaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '10px',
  },
  mediaItem: {
    width: '100px',
    height: '100px',
    overflow: 'hidden',
    borderRadius: '8px',
    backgroundColor: '#eee',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  linksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  linkItem: {
    padding: '10px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    border: '1px solid #eee',
  },
  linkContext: {
    fontSize: '12px',
    color: '#777',
    marginTop: '5px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  documentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  documentItem: {
    padding: '10px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    border: '1px solid #eee',
  },
  menuButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#333',
    padding: '0 5px',
  },
  menuOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 5999,
  },
  popupMenu: {
    position: 'absolute',
    top: '35px',
    right: '0',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    zIndex: 6000,
    minWidth: '220px',
    padding: '8px 0',
    display: 'flex',
    flexDirection: 'column',
    animation: 'popIn 0.2s ease-out',
  },
  menuItem: {
    padding: '12px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background 0.2s',
  },
  menuSeparator: {
    height: '1px',
    backgroundColor: '#eee',
    margin: '4px 0',
  },
  toggleTrack: {
    width: '34px',
    height: '18px',
    borderRadius: '10px',
    backgroundColor: '#ccc',
    position: 'relative',
    transition: 'background-color 0.2s',
  },
  toggleTrackActive: {
    backgroundColor: '#25D366',
  },
  toggleThumb: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    position: 'absolute',
    top: '2px',
    left: '2px',
    transition: 'left 0.2s',
  },
  toggleThumbActive: {
    left: '18px',
  },
};

export default FriendProfileView;