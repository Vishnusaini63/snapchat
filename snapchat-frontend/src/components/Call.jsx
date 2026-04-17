import React, { useRef, useEffect, useState } from "react";
import socket from "./socket";

const Call = ({ user, friend, callType: initialCallType, isCaller, startSignaling, onEnd })=> { // 🔥 Add onEnd prop

      // 👇 YAHA ADD KAR
  const btnStyle = {
    padding: "12px",
    borderRadius: "50%",
    background: "#333",
    color: "#fff",
    border: "none",
    fontSize: "18px"
  };
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peerConnection = useRef(null);
  const callStarted = useRef(false);

  const [callType, setCallType] = useState(initialCallType);
  const [stream, setStream] = useState(null);
  const [remoteOffer, setRemoteOffer] = useState(null); // 🔥 Queue offer until stream is ready
  const pendingIceCandidates = useRef([]); // 🔥 Queue candidates
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
const [isFrontCamera, setIsFrontCamera] = useState(true);
const [hasRemoteStream, setHasRemoteStream] = useState(false); // 🔥 Track connection
const [remoteCameraOff, setRemoteCameraOff] = useState(false); // 🔥 Track remote camera status
const [isMinimized, setIsMinimized] = useState(false);
const callStartTime = useRef(null);
  // ⏱️ TIMER
  const [seconds, setSeconds] = useState(0);
const toggleSpeaker = () => {
  if (remoteVideo.current) {
    remoteVideo.current.muted = isSpeakerOn;
    setIsSpeakerOn(!isSpeakerOn);
  }
};
  // 🎤 MUTE
  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // 📷 CAMERA
  const toggleCamera = async () => {
    if (stream) {
      // 🔥 FIX: Start camera if no video tracks exist (e.g. incoming video upgrade)
      if (stream.getVideoTracks().length === 0) {
        console.log("Upgrading to video... 📹");
        await switchToVideo();
        setIsCameraOff(false);
        return;
      }

      stream.getVideoTracks().forEach(track => {
        track.enabled = isCameraOff;
      });
      setIsCameraOff(!isCameraOff);

      // 🔥 Tell friend my camera is ON/OFF
      socket.emit("toggle-camera", { to: friend.id, isOff: !isCameraOff });
    }
  };

const endCall = () => {
  console.log("ENDING CALL DURATION:", seconds);

  // 🔥 STOP MEDIA
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }

  // 🔥 CLOSE PEER
  if (peerConnection.current) {
    peerConnection.current.close();
  }

  // 🔥 REAL DURATION CALCULATION
  const duration = callStartTime.current
    ? Math.floor((Date.now() - callStartTime.current) / 1000)
    : seconds;

  // 🔥 SEND TO PARENT
  if (onEnd) onEnd({ duration, callType });
};

  // ⏱️ FORMAT TIME
  const formatTime = () => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };
const startMedia = async () => {
  try {
    let media;

    if (callType === "video") {
      try {
        media = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (e) {
        console.log("Camera failed, switching to audio only");

        // 🔥 fallback to voice
        media = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        alert("Camera use nahi ho pa raha, voice call start ho gaya 🎧");
      }
    } else {
      media = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    }

    setStream(media);

  } catch (err) {
    console.error("Media error:", err);
    alert("Mic/Camera error 😢");
  }
};

 const createPeer = () => {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      { urls: "stun:stun.services.mozilla.com" }
    ],
    iceCandidatePoolSize: 10, 
    bundlePolicy: "max-bundle", // 🔥 Combine all media into one transport
    rtcpMuxPolicy: "require"
  });

  // 🔥 FIRST: ontrack
  pc.ontrack = (event) => {
    console.log("REMOTE STREAM AAYA 🔥", event.streams);
    if (!callStartTime.current) {
      callStartTime.current = Date.now();
    }
    if (remoteVideo.current) {
      const currentStream = remoteVideo.current.srcObject;
      if (currentStream && event.streams[0] && currentStream.id !== event.streams[0].id) {
        console.log("Merging tracks into existing stream... 🎧+📹");
        currentStream.addTrack(event.track);
      } else {
        remoteVideo.current.srcObject = event.streams[0];
      }
      setHasRemoteStream(true); // ✅ Connected

      // 🔥 Auto-switch to video UI if incoming stream has video
      if (event.track.kind === "video") {
        setCallType("video");
        setRemoteCameraOff(false); // 🔥 Video active
      }
    }
  };

  // ✅ Robust connection tracking using connectionState
  pc.onconnectionstatechange = () => {
    console.log("WebRTC Connection State:", pc.connectionState);
    if (pc.connectionState === "connected" || pc.connectionState === "completed") {
      setHasRemoteStream(true);
    } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
      console.error(`WebRTC connection ${pc.connectionState} ❌`);
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log("ICE Connection State:", pc.iceConnectionState);
    if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
      setHasRemoteStream(true);
    } else if (pc.iceConnectionState === "failed") {
      console.error("ICE handshake failed ❌ Check STUN/Network");
    }
  };

  // 🔥 THEN add tracks
  if (stream) {
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });
  }

  pc.onicecandidate = (e) => {
    if (e.candidate) {
      socket.emit("ice-candidate", {
        to: friend.id,
        from: user.id,
        candidate: e.candidate,
      });
    }
  };

  peerConnection.current = pc;
  return pc;
};
const switchCamera = async () => {
  if (!stream) return;

  const newStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: isFrontCamera ? "environment" : "user" },
    audio: true,
  });

  const videoTrack = newStream.getVideoTracks()[0];
  const audioTrack = newStream.getAudioTracks()[0]; // 🔥 Capture new audio to maintain sync

  const sender = peerConnection.current
    .getSenders()
    .find(s => s.track.kind === "video");

  if (sender) {
    sender.replaceTrack(videoTrack);
  }

  // 🔥 Maintain Mute State & Audio Connection
  if (isMuted && audioTrack) audioTrack.enabled = false;

  const audioSender = peerConnection.current.getSenders().find(s => s.track.kind === "audio");
  if (audioSender && audioTrack) {
    audioSender.replaceTrack(audioTrack);
  }

  setStream(newStream);
  setIsFrontCamera(!isFrontCamera);

  if (localVideo.current) {
    localVideo.current.srcObject = newStream;
  }
};
const switchToVideo = async () => {
  try {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

      const pc = peerConnection.current;
      if (!pc) return;

      // ✅ Purane stream ko reference me rakho taaki baad me stop kar sake
      const oldStream = stream;

      // 1. Replace Audio Track (Keep audio alive)
      const audioTrack = newStream.getAudioTracks()[0];
      const audioSender = pc.getSenders().find(s => s.track?.kind === "audio");
      if (audioSender && audioTrack) {
        await audioSender.replaceTrack(audioTrack);
      }

      // 2. Add/Replace Video Track
      const videoTrack = newStream.getVideoTracks()[0];
      const videoSender = pc.getSenders().find(s => s.track?.kind === "video");

      if (videoSender) {
        await videoSender.replaceTrack(videoTrack);
      } else {
        pc.addTrack(videoTrack, newStream); // 🔥 MOST IMPORTANT
        
        // 🔥 RENEGOTIATE: Send new offer for video
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("offer", {
          to: friend.id,
          from: user.id,
          offer,
        });
    }

    // ✅ LOCAL VIDEO UPDATE
    if (localVideo.current) {
      localVideo.current.srcObject = newStream;
    }

    // 🔥 👉 YE 2 LINE YAHA ADD KAR 👇
    setStream(newStream);
    setCallType("video");
    socket.emit("toggle-camera", { to: friend.id, isOff: false }); // 🔥 Inform friend video is ON

    // ✅ Naya stream set hone ke baad, purane stream ke tracks ko stop karo.
    // Isse microphone release ho jayega aur audio conflict nahi hoga.
    if (oldStream) {
      oldStream.getTracks().forEach(track => track.stop());
    }

  } catch (err) {
   console.error("Switch video failed:", err);
  }
};
const callUser = async () => {
  if (!stream) return; // ❌ prevent early call

  const pc = createPeer();

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit("offer", {
    to: friend.id,
    from: user.id,
    offer,
  });
};

const handleOffer = async ({ offer, from }) => {
  let pc = peerConnection.current;
  if (!pc) {
    pc = createPeer();
  }

  await pc.setRemoteDescription(offer);

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  // 🔥 Process any queued candidates AFTER remote description is set
  while (pendingIceCandidates.current.length > 0) {
    const candidate = pendingIceCandidates.current.shift();
    pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Error adding queued ice candidate", e));
  }

  socket.emit("answer", {
    to: from,
    from: user.id,
    answer,
  });
};

const processQueuedCandidates = (pc) => {
  if (!pc || !pc.remoteDescription) return;
  while (pendingIceCandidates.current.length > 0) {
    const candidate = pendingIceCandidates.current.shift();
    pc.addIceCandidate(candidate).catch(e => console.warn("Queued ICE error:", e));
  }
};

const handleAnswer = async ({ answer }) => {
  if (!peerConnection.current) return;

  if (peerConnection.current.signalingState === "stable") {
    return;
  }

  try {
    await peerConnection.current.setRemoteDescription(answer);

    // ✅ Sahi jagah candidates process karne ki
    processQueuedCandidates(peerConnection.current);

  } catch (e) {
    console.log("Answer error:", e);
  }
};

const handleIce = async ({ candidate }) => {
  if (candidate) {
    const pc = peerConnection.current;
    // ✅ Check if PC is ready and signaling is in correct state
    if (pc && pc.remoteDescription && pc.signalingState !== "closed") {
      try {
        await pc.addIceCandidate(candidate); // 🔥 Pass object directly
      } catch (e) {
        console.error("ICE error ignore:", e);
      }
    } else {
      // 🔥 Queue candidate if PC not ready OR remote desc is null
      pendingIceCandidates.current.push(candidate);
    }
  }
};

  // ✅ Fix: Ensure local video is attached whenever stream/ref changes
  useEffect(() => {
    if (localVideo.current && stream) {
      localVideo.current.srcObject = stream;
    }
  }, [stream, callType]);

  // ✅ Fix: Only handle offer when we have our own stream ready
  useEffect(() => {
    if (remoteOffer && (stream || peerConnection.current)) { // 🔥 Allow renegotiation if PC exists
      console.log("Stream ready, processing queued offer...");
      handleOffer(remoteOffer);
      setRemoteOffer(null);
    }
  }, [remoteOffer, stream]);

  // 🚀 INIT
  useEffect(() => {
    startMedia();

    socket.on("offer", (data) => setRemoteOffer(data)); // 🔥 Queue offer instead of handling immediately
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIce);
    socket.on("toggle-camera", ({ isOff }) => setRemoteCameraOff(isOff)); // 🔥 Update remote camera state

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("toggle-camera");
    };
  }, []);

 useEffect(() => {
  if (stream && isCaller && !callStarted.current && startSignaling) {   // 🔥 ONLY CALLER STARTS CALL (Wait for signal)
    callStarted.current = true;
    callUser();
  }
}, [stream, isCaller, startSignaling]);

useEffect(() => {
  if (hasRemoteStream && !callStartTime.current) {
    callStartTime.current = Date.now();
  }
}, [hasRemoteStream]);

useEffect(() => {
  let interval;

  if (hasRemoteStream && !isMinimized) { // 🔥 Sync timer when connected
    interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
  }

  return () => clearInterval(interval);
}, [hasRemoteStream, isMinimized]); 

  return (

<div style={{
  width: "100%",
  maxWidth: "500px", // Keep call screen in mobile view too
  height: "100vh",
  position: "fixed",
  top: 0,
  left: "50%",
  transform: "translateX(-50%)", // Center fixed call screen
  background: "#000",
  display: isMinimized ? "none" : "block",
  zIndex: 9999,
  overflow: "hidden"
}}>
{/* 🔙 BACK TO CHAT */}
<div
onClick={() => {
  setIsMinimized(true); // 🔥 ADD THIS
  window.dispatchEvent(new Event("minimizeCall"));
}}
  style={{
    position: "absolute",
    top: "20px",
    left: "15px",
    fontSize: "26px",
    color: "#fff",
    cursor: "pointer",
    zIndex: 10
  }}
>
  ⬅
</div>
      {/* ⏱️ TIMER */}
      <div style={{
        position: "absolute",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        color: "#fff",
        fontSize: "18px",
        zIndex: 5
      }}>
        {formatTime()}
      </div>

      {/* 🎥 LOCAL VIDEO */}
      {callType === "video" && (
        <video
          ref={localVideo}
          autoPlay
          muted
          style={{
            width: "150px",
            position: "absolute",
            top: "10px",
            left: "10px",
            borderRadius: "10px",
            zIndex: 2
          }}
        />
      )}

      {/* 📺 REMOTE VIDEO */}
      <video
        ref={remoteVideo}
        autoPlay
          playsInline   // 🔥 MUST

        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: (callType === 'video' && hasRemoteStream && !remoteCameraOff) ? 1 : 0 // 🔥 Hide if camera off
        }}
      />

      {/* 🟢 CALL STATUS & PROFILE OVERLAY */}
      {(!hasRemoteStream || callType === "voice" || (callType === "video" && remoteCameraOff)) && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          color: "#fff",
          zIndex: 4
        }}>
          <div style={{
             width: "100px", height: "100px", borderRadius: "50%",
             background: "#333", border: "2px solid #fff", overflow: "hidden",
             display: "flex", alignItems: "center", justifyContent: "center",
             fontSize: "3rem", fontWeight: "bold", textTransform: "uppercase", marginBottom: "15px"
          }}>
             {(friend?.avatar || friend?.profile_pic) ? <img src={friend.avatar || friend.profile_pic} style={{width:"100%", height:"100%", objectFit:"cover"}} /> : (friend?.username?.[0] || "?")}
          </div>
          <h2 style={{textShadow: "0 2px 5px rgba(0,0,0,0.5)"}}>{friend?.username || "Friend"}</h2>
          <p style={{fontSize: "1.2rem", marginTop: "5px", opacity: 0.8, textShadow: "0 1px 2px rgba(0,0,0,0.5)"}}>
             {!hasRemoteStream ? (isCaller ? "Ringing..." : "Connecting...") : (remoteCameraOff ? "Camera Off" : "Voice Call 🎧")}
          </p>
        </div>
      )}

      {/* 🎮 CONTROLS */}
     <div style={{
  position: "absolute",
  bottom: "30px",
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: "15px",
  zIndex: 5
}}>

  {/* 🎤 MUTE */}
  <button onClick={toggleMute} style={btnStyle}>
    {isMuted ? "🔇" : "🎤"}
  </button>

  {/* 🔊 SPEAKER */}
  <button onClick={toggleSpeaker} style={btnStyle}>
    {isSpeakerOn ? "🔊" : "🔈"}
  </button>

  {/* 📷 CAMERA ON/OFF */}
  {callType === "video" && (
    <button onClick={toggleCamera} style={btnStyle}>
      {isCameraOff ? "📷❌" : "📷"}
    </button>
  )}

  {/* 🔄 SWITCH CAMERA */}
  {callType === "video" && !isCameraOff && ( // 🔥 Hide switch if camera is off
    <button onClick={switchCamera} style={btnStyle}>
      🔄
    </button>
  )}

  {/* 🔥 VOICE → VIDEO */}
  {callType === "voice" && (
    <button onClick={switchToVideo} style={btnStyle}>
      📹
    </button>
  )}

  {/* ❌ END */}
  <button onClick={endCall} style={{
    ...btnStyle,
    background: "red"
  }}>
    ❌
  </button>

</div>

    </div>
  );
};

export default Call;



      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
{/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
      {/* Reactions dfgchjbnkml;,kjvcxvbnm,./mnvcxzvbnm,.mnbvcxvbnm,.kjxzcvjklkjhgfdxzcvbjn*/}
     