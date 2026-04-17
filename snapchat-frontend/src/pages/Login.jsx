import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [twoFaStep, setTwoFaStep] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaData, setTwoFaData] = useState(null);
const API = window.location.origin;
  // Auto redirect if token exists
useEffect(() => {
  const token = localStorage.getItem("token");

  if (token) {
    navigate("/chat", { replace: true });
  }
}, [navigate]);

const handleLogin = async () => {

  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

  try {

const res = await axios.post(
  `${API}/api/auth/login`,
  { email, password }
);

    if (res.data.twoFactorRequired) {
      setTwoFaData(res.data);
      setTwoFaStep(true);
      return;
    }

    localStorage.setItem("token", res.data.token);
    if (res.data.sessionId) localStorage.setItem("sessionId", res.data.sessionId);

    // 🔥 IMPORTANT (user save)
    localStorage.setItem("user", JSON.stringify(res.data.user));

    navigate("/chat", { replace: true });

  } catch (err) {

    alert(err.response?.data?.message || "Login failed");

  }

};

const handleVerify2FA = async () => {
  try {
    const res = await axios.post(`${API}/api/auth/verify-2fa`, {
      userId: twoFaData.userId,
      code: twoFaCode,
      twoFaId: twoFaData.twoFaId
    });

    localStorage.setItem("token", res.data.token);
    if (res.data.sessionId) localStorage.setItem("sessionId", res.data.sessionId);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    navigate("/chat", { replace: true });
  } catch (err) {
    alert(err.response?.data?.message || "Invalid Code / Not Approved");
  }
};

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>Snapchat Clone</h1>

        {!twoFaStep ? (
          <>
            <input
              type="email"
              placeholder="Email"
              style={styles.input}
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              style={styles.input}
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
            />

            <button style={styles.button} onClick={handleLogin}>
              Login
            </button>

            <p style={styles.text}>
              Don’t have an account? <Link to="/register">Register</Link>
            </p>

            <p style={styles.text}>
              <Link to="/forgot-password">Forgot Password?</Link>
            </p>
          </>
        ) : (
          <>
            <h3>2FA Verification</h3>
            <p style={{fontSize: '12px', textAlign: 'center'}}>Enter the code from email or approve from your main device.</p>
            <input
              type="text"
              placeholder="6-digit code"
              style={styles.input}
              value={twoFaCode}
              onChange={(e) => setTwoFaCode(e.target.value)}
            />
            <button style={styles.button} onClick={handleVerify2FA}>Verify</button>
            <button style={{...styles.button, background: '#ccc'}} onClick={() => setTwoFaStep(false)}>Cancel</button>
          </>
        )}

      </div>
    </div>
  );
};

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#000",
    color: "#fff",
  },
  card: {
    width: "360px",
    padding: "30px",
    borderRadius: "12px",
    background: "#121212",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  logo: {
    textAlign: "center",
    color: "#fffc00",
  },
  input: {
    padding: "12px",
    borderRadius: "6px",
    border: "none",
    outline: "none",
  },
  button: {
    padding: "12px",
    background: "#fffc00",
    border: "none",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  text: {
    fontSize: "14px",
    textAlign: "center",
  },
};

export default Login;




{/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
     