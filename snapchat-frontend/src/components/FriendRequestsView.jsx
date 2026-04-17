import React, { useState, useEffect } from 'react';
import axios from 'axios';
import socket from "./socket.js";

const FriendRequestsView = ({ user, onClose, onFriendAdded }) => {
  const [requests, setRequests] = useState([]);
  const token = localStorage.getItem("token");
const API = window.location.origin;
  useEffect(() => {
    getRequests();
  }, []);

  const getRequests = () => {
  axios.get(`${API}/api/auth/requests`, {
      headers: { authorization: "Bearer " + token }
    })
    .then(res => {
      setRequests(res.data.map(r => ({ ...r, avatar: r.avatar || r.profile_pic })));
    })
    .catch(err => console.error(err));
  };

  const acceptRequest = (id) => {
  axios.post(`${API}/api/auth/accept-request`,
      { requestId: id },
      { headers: { authorization: "Bearer " + token } }
    )
    .then(() => {
      alert("Friend added 🔥");
      socket.emit("friendRequestAccepted", { to: id, from: user.id });
      setRequests(prev => prev.filter(r => r.id !== id));
      if (onFriendAdded) onFriendAdded(); // Sidebar ko update karne ke liye
    })
    .catch(err => console.error(err));
  };

  const rejectRequest = (id) => {
  axios.post(`${API}/api/auth/reject-request`,
      { requestId: id }, 
      { headers: { authorization: "Bearer " + token } }
    )
    .then(() => {
      alert("Request rejected ❌");
      socket.emit("friendRequestRejected", { to: id, from: user.id }); // Sender ko notify karo
      setRequests(prev => prev.filter(r => String(r.id) !== String(id))); // List se hatao
    })
    .catch(err => {
      console.error(err);
      alert("Rejection failed ❌");
    });
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={onClose} style={styles.closeButton}>←</button>
          <h2 style={styles.title}>Friend Requests ({requests.length})</h2>
        </div>

        <div style={styles.content}>
          <div style={styles.list}>
            {requests.length > 0 ? (
              requests.map(r => (
                <div key={r.id} style={styles.item}>
                  <img src={r.avatar || r.profile_pic} style={styles.avatar} alt="" />
                  <div style={{ flex: 1 }}>
                    <strong>{r.username}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ ...styles.actionBtn, backgroundColor: '#25D366' }} onClick={() => acceptRequest(r.id)}>Accept</button>
                    <button style={{ ...styles.actionBtn, backgroundColor: '#FF3B30' }} onClick={() => rejectRequest(r.id)}>Reject</button>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: '#888' }}>No pending friend requests.</p>
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
  content: { flex: 1, overflowY: 'auto', padding: '15px' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  item: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '10px' },
  avatar: { width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFFC00' },
  actionBtn: { padding: '6px 15px', borderRadius: '20px', border: 'none', backgroundColor: '#25D366', color: '#fff', fontWeight: '600', cursor: 'pointer' }
};

export default FriendRequestsView;