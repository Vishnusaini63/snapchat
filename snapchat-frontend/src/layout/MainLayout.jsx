import React from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";

const MainLayout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <div style={styles.outer}>

      <div style={styles.phone}>

        {/* Logout */}
        <button onClick={handleLogout} style={styles.logout}>
          Logout
        </button>

        <Sidebar onSelectFriend={() => navigate("/chat")} />

      </div>

    </div>
  );
};

const styles = {
  outer: {
    background: "#e5e5e5",
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  phone: {
    position: "relative",
    width: "380px",
    height: "90vh",
    background: "#fff",
    borderRadius: "25px",
    overflow: "hidden",
    boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
  },

  logout: {
    position: "absolute",
    right: "10px",
    top: "10px",
    zIndex: 10,
    background: "#fffc00",
    border: "none",
    padding: "5px 10px",
    borderRadius: "10px"
  }
};

export default MainLayout;