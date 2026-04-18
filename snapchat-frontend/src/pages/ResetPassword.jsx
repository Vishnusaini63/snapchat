import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const ResetPassword = () => {
const API = window.location.origin;
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");

  const handleReset = async () => {

    try {

      const res = await axios.post(
        `${API}/api/auth/reset-password/${token}`,
        { password }
      );

      alert(res.data.message);

      navigate("/");

    } catch (err) {

      alert("Reset failed");

    }

  };

  return (
    <div style={{ padding: "50px", textAlign: "center" }}>

      <h2>Reset Password</h2>

      <input
        type="password"
        placeholder="Enter new password"
        onChange={(e)=>setPassword(e.target.value)}
      />

      <br /><br />

      <button onClick={handleReset}>
        Reset Password
      </button>

    </div>
  );

};

export default ResetPassword;