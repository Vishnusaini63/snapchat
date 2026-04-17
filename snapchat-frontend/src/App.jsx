import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Chat from "./pages/Chat";
import ProfileSettings from "./pages/ProfileSettings";

import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layout/MainLayout"; // (optional use later)

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔓 Public Pages */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 🔥 FIXED ROUTE */}
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* 🔐 Protected Pages */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />

        {/* 🔥 SECURITY FIX */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          }
        />

        {/* 🔁 Redirect */}
        <Route path="/home" element={<Navigate to="/chat" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;

{/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
     