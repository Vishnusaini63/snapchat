import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const ForgotPassword = () => {
const API = window.location.origin;
  const [email, setEmail] = useState("");

  const handleSubmit = async () => {

    if (!email) {
      alert("Please enter email");
      return;
    }

    try {

   const res = await axios.post(
  `${API}/api/auth/forgot-password`,
  { email }
);

      alert(res.data.message);

    } catch (err) {

      console.log(err);
      alert("Error sending reset link ❌");

    }

  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Forgot Password</h2>

        <input
          type="email"
          placeholder="Enter your email"
          style={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button style={styles.button} onClick={handleSubmit}>
          Send Reset Link
        </button>

        <p>
          <Link to="/">Back to Login</Link>
        </p>
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
    background: "#121212",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  input: {
    padding: "12px",
    borderRadius: "6px",
    border: "none",
  },
  button: {
    padding: "12px",
    background: "#fffc00",
    border: "none",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default ForgotPassword;