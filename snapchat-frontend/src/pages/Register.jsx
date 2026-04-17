import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const Register = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
const API = window.location.origin;
  const handleRegister = async () => {
    if (!username || !email || !password) {
      alert("Fill all fields");
      return;
    }

    try {

      const res = await axios.post(
        `${API}/api/auth/register`,
        {
          username,
          email,
          password
        }
      );

      alert(res.data.message);

      navigate("/"); // login page par redirect

    } catch (err) {

      alert(err.response?.data?.message || "Registration failed");

    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Create Account</h2>

        <input
          type="text"
          placeholder="Username"
          style={styles.input}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          style={styles.input}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          style={styles.input}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button style={styles.button} onClick={handleRegister}>
          Register
        </button>

        <p>
          Already have account? <Link to="/">Login</Link>
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
  },
};

export default Register;