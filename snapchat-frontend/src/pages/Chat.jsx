import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ChatBox from "../components/ChatBox";
import "../styles/chat.css";

const Chat = () => {
  const navigate = useNavigate();
  const [selectedFriend, setSelectedFriend] = useState(null);

  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));

  useEffect(() => {
    // Refresh user data when selecting friend to get latest privacy settings
    setUser(JSON.parse(localStorage.getItem("user") || "{}"));
  }, [selectedFriend]);

  return (
    <div className="chat-page" style={{ position: 'relative', background: '#f0f0f0', height: '100vh', overflow: 'hidden' }}>
      {!selectedFriend ? (
        // 📱 Jab koi friend select nahi hai, sirf Sidebar (List) dikhao
        <Sidebar onSelectFriend={setSelectedFriend} />
      ) : (
        // 💬 Jab friend select ho jaye, sirf ChatBox dikhao
        <div className="chat-main">
          <ChatBox
            key={selectedFriend.id}
            friend={selectedFriend}
            user={user}
            onBack={() => setSelectedFriend(null)}
          />
        </div>
      )}
    </div>
  );
};

export default Chat;


{/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
     