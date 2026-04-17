import React, { useState, useEffect } from 'react';
import axios from 'axios';
import socket from "./socket.js";

const AddFriendsView = ({ user, onClose, onFriendAdded }) => {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // 🔥 NEW: Search Query state
  const token = localStorage.getItem("token");

  useEffect(() => {
    getUsers();

    socket.on("friendRequestAccepted", ({ from }) => {
      // Agar accept ho gaya toh list se hata do (kyunki ab friend hai)
      setUsers(prev => prev.filter(u => String(u.id) !== String(from)));
    });

    socket.on("friendRequestRejected", ({ from }) => {
      // Agar reject ho gaya toh wapas "Add" dikhao
      setUsers(prev => prev.map(u => String(u.id) === String(from) ? { ...u, status: 'none' } : u));
    });

    return () => {
      socket.off("friendRequestAccepted");
      socket.off("friendRequestRejected");
    };
  }, []);

  const getUsers = () => {
    axios.get("https://snapchat-vgrt.onrender.com/api/auth/users", {
      headers: { authorization: "Bearer " + token }
    })
    .then(res => {
      setUsers(res.data.map(u => ({ ...u, avatar: u.avatar || u.profile_pic })));
    })
    .catch(err => console.error(err));
  };

  const sendRequest = (id) => {
    axios.post("https://snapchat-vgrt.onrender.com/api/auth/send-request",
      { receiverId: id },
      { headers: { authorization: "Bearer " + token } }
    )
    .then(() => {
      socket.emit("friendRequestSent", { to: id, from: user.id });
      // 🔥 Hatao mat, bas status pending kar do
      setUsers(prev => prev.map(u => String(u.id) === String(id) ? { ...u, status: 'pending' } : u));
    });
  };

  // 🔥 NEW: Filter users based on search query
  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={onClose} style={styles.closeButton}>←</button>
          <h2 style={styles.title}>Add Friends</h2>
        </div>

        {/* 🔥 NEW: Search Bar */}
        <div style={styles.searchContainer}>
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.content}>
          <div style={styles.list}>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(u => (
                <div key={u.id} style={styles.item}>
                  <img src={u.avatar || u.profile_pic} style={styles.avatar} alt="" />
                  <div style={{ flex: 1 }}>
                    <strong>{u.username}</strong>
                  </div>
                  {(u.status === 'pending' || u.status === 'sent') ? (
                    <button style={{ ...styles.actionBtn, backgroundColor: '#888', cursor: 'default' }} disabled>Pending</button>
                  ) : (
                    <button style={styles.actionBtn} onClick={() => sendRequest(u.id)}>Add</button>
                  )}
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: '#888' }}>
                {searchQuery ? "No users match your search." : "No new users found."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 7000 },
  container: { backgroundColor: '#fff', borderRadius: '0', width: '100%', maxWidth: 'none', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'none' },
  header: { display: 'flex', alignItems: 'center', padding: '15px', borderBottom: '1px solid #eee', backgroundColor: '#f8f8f8' },
  closeButton: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', marginRight: '15px', color: '#333' },
  title: { margin: 0, fontSize: '20px', fontWeight: '600', color: '#333' },
  tabs: { display: 'flex', borderBottom: '1px solid #eee', backgroundColor: '#f8f8f8' },
  tabButton: { flex: 1, padding: '12px', border: 'none', background: 'none', fontSize: '15px', cursor: 'pointer', color: '#555', borderBottom: '2px solid transparent' },
  activeTab: { color: '#00B4F6', borderBottomColor: '#00B4F6', fontWeight: '600' },
  content: { flex: 1, overflowY: 'auto', padding: '15px' },
  searchContainer: { 
    padding: '10px 15px', 
    borderBottom: '1px solid #eee',
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
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  item: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '10px' },
  avatar: { width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFFC00' },
  actionBtn: { padding: '6px 15px', borderRadius: '20px', border: 'none', backgroundColor: '#00B4F6', color: '#fff', fontWeight: '600', cursor: 'pointer' }
};

export default AddFriendsView;