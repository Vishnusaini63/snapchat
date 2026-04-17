import React, { useState, useEffect } from "react";
import "./profileSettings.css";
import { useNavigate } from "react-router-dom";
import socket from "../components/socket.js";
import axios from "axios";
const ProfileSettings = () => {

  const API = window.location.origin;
  const navigate = useNavigate();
const [showBlockedPopup, setShowBlockedPopup] = useState(false);
const [blockedUsers, setBlockedUsers] = useState([]);
  const [activeStatus, setActiveStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [twoFA, setTwoFA] = useState(false);

  const [open, setOpen] = useState(false);
const [showPasswordPopup, setShowPasswordPopup] = useState(false);
const [currentPassword, setCurrentPassword] = useState("");
const [newPassword, setNewPassword] = useState("");
  const [showLoginActivity, setShowLoginActivity] = useState(false);
  const [loginActivities, setLoginActivities] = useState([]);
const [showForgotPopup, setShowForgotPopup] = useState(false);
const [forgotEmail, setForgotEmail] = useState("");
  // ✅ SAFE userId
  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = userData.id;

  // 🔥 user data
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
const [profilePic, setProfilePic] = useState("");
  // ✅ FETCH USER
  const fetchUser = async () => {
    await fetchUserInternal();
  }

  // 🔥 Real-time Session Check
  useEffect(() => {
    const currentSessionId = localStorage.getItem("sessionId");
    
    socket.on("sessionTerminated", ({ sessionId }) => {
      if (currentSessionId && String(sessionId) === String(currentSessionId)) {
        alert("⚠️ Aapka session doosre device se end kar diya gaya hai.");
        handleLogout();
      }
    });

    return () => socket.off("sessionTerminated");
  }, []);

  const fetchUserInternal = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/user/${userId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await res.json();

      setUsername(data.username || "");
      setEmail(data.email || "");

      setActiveStatus(data.active_status ?? true);
      setTwoFA(data.two_factor_auth ?? false);

      setReadReceipts(data.read_receipts ?? true);
      
      if (data.dob) {
        const d = new Date(data.dob);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        setDob(`${y}-${m}-${day}`); // YYYY-MM-DD format based on local time
      } else {
        setDob("");
      }
      setCity(data.city || "");
      setBio(data.bio || "");

      setProfilePic(data.profile_pic || "");
    } catch (err) {
      console.log("Fetch error:", err);
    }
  };

  useEffect(() => {
    if (userId) fetchUser();
  }, [userId]);

  // ✅ SAVE PROFILE
  const handleSave = async () => {
    try {
      const body = { userId };

      if (username && username.trim() !== "") body.username = username;
      if (email && email.trim() !== "") body.email = email;

      // 🔥 DOB FIX
      if (dob && dob !== "" && dob !== "Invalid Date") {
        body.dob = dob.split("T")[0];
      }

      if (city && city.trim() !== "") body.city = city;
      if (bio && bio.trim() !== "") body.bio = bio;
body.active_status = activeStatus; // 🔥 ADD THIS
body.read_receipts = readReceipts;
body.two_factor_auth = twoFA ? 1 : 0;

      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      console.log("Response:", data);

      await fetchUser();
      setOpen(false);

    } catch (err) {
      console.log("Save error:", err);
    }
  };
const handleImageChange = async (e) => {
  const file = e.target.files[0];

  console.log("FILE:", file); // 🔥 debug

  if (!file) {
    alert("No file selected ❌");
    return;
  }

  const formData = new FormData();
  formData.append("image", file);

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/api/upload-profile`, {
      method: "POST",
      body: formData,
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.log("Upload failed:", res.status);
      alert("Image upload failed ❌");
      return;
    }

    const data = await res.json();
    console.log("UPLOAD RESPONSE:", data);

    if (!data.url) {
      alert("No URL received ❌");
      return;
    }

    // 🔥 UPDATE PROFILE
    const updateRes = await fetch(`${API}/api/update-profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        profile_pic: data.url
      })
    });

    const updateData = await updateRes.json();
    console.log("UPDATE RESPONSE:", updateData);

    if (!updateRes.ok) {
      alert("Profile update failed ❌");
      return;
    }

    setProfilePic(data.url);

    // 🔥 Socket event emit karo taaki dosto ko realtime mein update mil jaye
    socket.emit("updateAvatar", { userId, avatar: data.url });

    // 🔥 Local storage update karo taaki Sidebar ke top avatar mein turant change dikhe
    localStorage.setItem("user", JSON.stringify({ ...userData, avatar: data.url, profile_pic: data.url }));

    // 🔥 refresh from DB
    await fetchUser();

  } catch (err) {
    console.log("Upload error:", err);
  }
};

  // 🔥 Immediate persistence for Active Status toggle
  const handleToggleActiveStatus = async (val) => {
    setActiveStatus(val); // Pehle UI update kar do
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId, active_status: val })
      });
      localStorage.setItem("user", JSON.stringify({ ...userData, active_status: val }));
      
    } catch (err) {
      console.error("Toggle update failed:", err);
      setActiveStatus(!val); // Agar API fail ho jaye toh wapas purana state kar do (Rollback)
    }
  };

  // 🔥 Immediate persistence for 2FA toggle
  const handleToggle2FA = async (val) => {
    if (!userId) return alert("User ID not found. Please re-login.");
    
    setTwoFA(val);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId, two_factor_auth: val ? 1 : 0 })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${res.status}`);
      }
      
      const data = await res.json();

      localStorage.setItem("user", JSON.stringify({ ...userData, two_factor_auth: val }));
    } catch (err) {
      console.error("2FA toggle update failed:", err);
      setTwoFA(!val); // Rollback
    }
  };

  // 🔥 Immediate persistence for Read Receipts toggle
  const handleToggleReadReceipts = async (val) => {
    setReadReceipts(val); // Pehle UI update kar do
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ userId, read_receipts: val })
      });
      localStorage.setItem("user", JSON.stringify({ ...userData, read_receipts: val }));
      
    } catch (err) {
      console.error("Read Receipts toggle update failed:", err);
      setReadReceipts(!val); // Agar API fail ho jaye toh wapas purana state kar do (Rollback)
    }
  };
const handleChangePassword = async () => {
  try {
    const token = localStorage.getItem("token"); // 🔥 GET TOKEN

    const res = await fetch(
      `${API}/api/auth/change-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // 🔥 ADD THIS
        },
        body: JSON.stringify({
          userId,
          currentPassword,
          newPassword
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.message);
      return;
    }

    alert("Password changed successfully ✅");

    setShowPasswordPopup(false);
    setCurrentPassword("");
    setNewPassword("");

  } catch (err) {
    console.log(err);
    alert("Error changing password ❌");
  }
};

const handleForgotInPopup = async () => {
  if (!forgotEmail) {
    alert("Please enter email");
    return;
  }
  try {
    const res = await fetch(`${API}/api/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: forgotEmail })
    });

    const data = await res.json();
    alert(data.message);

    setShowForgotPopup(false);
    setForgotEmail("");
    setShowPasswordPopup(true); // Wapas password popup dikhao
  } catch (err) {
    console.log(err);
    alert("Error sending reset link ❌");
  }
};

const handleDeleteAccount = async () => {
  const confirmDelete = window.confirm("Kya aap sach mein apna account delete karna chahte hain? Ye action permanent hai aur aapka data wapas nahi aayega! ⚠️");
  if (!confirmDelete) return;

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/api/auth/delete-account`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (res.ok) {
      alert("Account successfully delete ho gaya hai. ✅");
      handleLogout(); // Clear session and redirect to login
    } else {
      alert(data.message || "Account delete karne mein problem aayi ❌");
    }
  } catch (err) {
    console.log(err);
    alert("Server error: Account delete nahi ho paya ❌");
  }
};

  // ✅ FETCH LOGIN ACTIVITY
  const fetchLoginActivity = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/auth/login-activity`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setLoginActivities(data.sessions || []);
        // Update current session ID if found
        const current = data.sessions.find(s => s.isCurrent);
        if (current) {
          localStorage.setItem("sessionId", current.id);
        }
      }
    } catch (err) {
      console.log("Fetch login activity error:", err);
    }
  };


const handleUnblock = async (friendId) => {
  try {
    await axios.post(`${API}/api/friends/unblock`, {
      userId: userId,
      friendId
    });

    fetchBlocked(); // refresh
  } catch (err) {
    console.error(err);
  }
};

const fetchBlocked = async () => {
  try {
    const res = await axios.get(`${API}/api/friends/blocked/${userId}`);
    setBlockedUsers(res.data);
  } catch (err) {
    console.error(err);
  }
};

  // ✅ LOGOUT FROM SPECIFIC DEVICE
  const handleLogoutDevice = async (sessionId) => {
    if (!window.confirm("Kya aap is device se logout karna chahte hain?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/auth/logout-device`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId })
      });
      if (res.ok) {
        // 🔥 Emit to socket to notify other device
        socket.emit("forceLogoutDevice", { sessionId });

        if (String(sessionId) === localStorage.getItem("sessionId")) {
          handleLogout(); // Agar isi device ko logout kiya toh redirect
        } else {
          alert("Device logout ho gaya ✅");
          fetchLoginActivity(); // Refresh list
        }
      }
    } catch (err) {
      console.log("Logout device error:", err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="container" style={{ 
      position: 'relative',
      maxWidth: '500px', 
      margin: '0 auto', 
      height: '100vh', 
      overflowY: 'auto', 
      backgroundColor: '#fff', 
      borderLeft: '1px solid #f0f0f0', 
      borderRight: '1px solid #f0f0f0', 
      boxSizing: 'border-box' 
    }}>

      <button onClick={() => navigate(-1)} className="exitbtn">
        ⬅ Back
      </button>

      {/* 🔥 PROFILE */}
      <div className="profile-card">
        <div className="profile-row">

       <div className="avatar-box">
  <img
    src={profilePic || userData.avatar || userData.profile_pic || "https://i.pravatar.cc/100"}
    alt="profile"
    className="profile-img"
  />

  {/* 📷 camera icon */}
  <label className="camera-icon">
    📷
    <input
      type="file"
      accept="image/*"
      onChange={handleImageChange}
     style={{ display: "none" }}
    />
  </label>
</div>

          <div className="profile-info">
            <h3 className="username">{username}</h3>

            <p className="sub">{email}</p>

            {dob && (
              <p className="sub">
                {new Date(dob + 'T00:00:00Z').toLocaleDateString("en-IN", {
                  timeZone: 'UTC',
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })}
              </p>
            )}

            {city && <p className="sub">{city}</p>}

            <p className="bio">{bio || "No bio"}</p>

            <h4 className="edit" onClick={() => setOpen(true)}>
              Edit Profile
            </h4>
          </div>

        </div>
      </div>

      {/* ⚙️ SETTINGS */}
      <h3 className="title">Settings</h3>

      <div className="section">
        <h4>PRIVACY</h4>
   
    <Toggle title="Active Status" value={activeStatus} setValue={handleToggleActiveStatus} />
        <Toggle title="Read Receipts" value={readReceipts} setValue={handleToggleReadReceipts} />
      </div>

      <div className="section">
        <h4>NOTIFICATIONS</h4>
        <Toggle title="Notifications" value={notifications} setValue={setNotifications} />
      </div>

      <div className="section">
        <h4>SECURITY</h4>
     <div className="row">
  <span>Change Password</span>
  <button className="btn" onClick={() => setShowPasswordPopup(true)}>
    Manage
  </button>
</div>
        <Toggle title="Two-Factor Authentication" value={twoFA} setValue={handleToggle2FA} />
        <Button title="Login Activity" onClick={() => { setShowLoginActivity(true); fetchLoginActivity(); }} />
      </div>

      <div className="section">
        <h4>ACCOUNT</h4>
<Button title="Blocked Users" onClick={() => {
  setShowBlockedPopup(true);
  fetchBlocked();
}} />        <Button title="Delete Account" danger onClick={handleDeleteAccount} />
      </div>

      <button className="logout" onClick={handleLogout}>
        Logout
      </button>

      {/* 🔥 POPUP */}
      {open && (
        <div className="popup" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="popup-box" style={{ width: '90%', maxWidth: '400px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px' }}>

            <div className="popup-header">
              <span className="back-btn" onClick={() => setOpen(false)}>
                ⬅
              </span>
              <h3>Edit Profile</h3>
            </div>

            <div className="popup-body">

              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
              />

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
              />

              <input
                type="date"
                value={dob} // dob state is already YYYY-MM-DD, no need to split again
                onChange={(e) => setDob(e.target.value)}
              />

              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />

              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Bio"
              />

              <button className="save-btn" onClick={handleSave}>
                Save Changes
              </button>

            </div>
          </div>
        </div>
      )}

      {showPasswordPopup && (
  <div className="popup" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <div className="popup-box" style={{ width: '90%', maxWidth: '400px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px' }}>

      <div className="popup-header">
        <span className="back-btn" onClick={() => setShowPasswordPopup(false)}>
          ⬅
        </span>
        <h3>Change Password</h3>
      </div>

      <div className="popup-body">

        <input
          type="password"
          placeholder="Current Password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <button className="save-btn" onClick={handleChangePassword}>
          Change Password
        </button>

        <p
          style={{ marginTop: "10px", cursor: "pointer", color: "blue" }}
          onClick={() => {
            setShowPasswordPopup(false);
            setShowForgotPopup(true);
          }}
        >
          Forgot Password?
        </p>

      </div>
    </div>
  </div>
)}

{showForgotPopup && (
  <div className="popup" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <div className="popup-box" style={{ width: '90%', maxWidth: '400px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px' }}>

      <div className="popup-header">
        <span className="back-btn" onClick={() => {
          setShowForgotPopup(false);
          setShowPasswordPopup(true);
        }}>
          ⬅
        </span>
        <h3>Forgot Password</h3>
      </div>

      <div className="popup-body">
        <p style={{ fontSize: "14px", marginBottom: "10px", color: "#555" }}>
          Enter your email to receive a password reset link.
        </p>
        <input
          type="email"
          placeholder="Enter your email"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
        />

        <button className="save-btn" onClick={handleForgotInPopup}>
          Send Reset Link
        </button>
      </div>
    </div>
  </div>
)}

{/* 🔥 LOGIN ACTIVITY POPUP */}
{showLoginActivity && (
  <div className="popup" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <div className="popup-box" style={{ width: '90%', maxWidth: '400px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px' }}>
      <div className="popup-header">
        <span className="back-btn" onClick={() => setShowLoginActivity(false)}>⬅</span>
        <h3>Login Activity</h3>
      </div>
      <div className="popup-body">
        {loginActivities.length > 0 ? (
          loginActivities.map((item) => (
            <div key={item.id} className="row" style={{ background: "#f1f1f1", color: "black", marginBottom: "8px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontWeight: "bold", fontSize: "14px" }}>
                  {item.device_name} {item.isCurrent && 
                    <span style={{ color: "green", fontSize: "10px", marginLeft: "5px" }}>(This Device)</span>
                  }
                </span>
                <span style={{ fontSize: "12px", color: "#555" }}>{item.ip_address}</span>
                <span style={{ fontSize: "10px", color: "#888" }}>
                  Last active: {new Date(item.last_active).toLocaleString()}
                </span>
              </div>
              <button 
                className="btn danger" 
                onClick={() => handleLogoutDevice(item.id)}
                style={{ padding: "5px 10px", fontSize: "12px" }}
              >
                Logout
              </button>
            </div>
          ))
        ) : (
          <p style={{ textAlign: "center", color: "#888" }}>No active sessions found.</p>
        )}
      </div>
    </div>
  </div>
)}

{showBlockedPopup && (
  <div className="popup" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    <div className="popup-box" style={{ width: '90%', maxWidth: '400px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px' }}>

      <div className="popup-header">
        <span className="back-btn" onClick={() => setShowBlockedPopup(false)}>
          ⬅
        </span>
        <h3>Blocked Users 🚫</h3>
      </div>

      <div className="popup-body">

        {blockedUsers.length === 0 ? (
          <p style={{ textAlign: "center" }}>No blocked users</p>
        ) : (
          blockedUsers.map(u => (
            <div key={u.id} className="row" style={{ marginBottom: "10px" }}>
              
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <img
                  src={u.profile_pic}
                  width={40}
                  height={40}
                  style={{ borderRadius: "50%" }}
                />
                <span>{u.username}</span>
              </div>

              <button 
                className="btn"
                onClick={() => handleUnblock(u.id)}
              >
                Unblock
              </button>

            </div>
          ))
        )}

      </div>
    </div>
  </div>
)}
    </div>
  );
};

const Toggle = ({ title, value, setValue }) => (
  <div className="row">
    <span>{title}</span>
    <div
      className={`toggle ${value ? "active" : ""}`}
      onClick={() => setValue(!value)}
    />
  </div>
);

const Button = ({ title, danger, onClick }) => (
  <div className="row">
    <span>{title}</span>
    <button className={danger ? "btn danger" : "btn"} onClick={onClick}>
      {danger ? "Delete" : "Manage"}
    </button>
  </div>
);

export default ProfileSettings;

{/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
     