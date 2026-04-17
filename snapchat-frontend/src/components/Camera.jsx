import React, { useEffect, useRef, useState } from "react";

const Camera = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [recording, setRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false); // New state to track camera readiness
  const [recordingTime, setRecordingTime] = useState(0);
  const chunks = useRef([]);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setCameraReady(true); // Set cameraReady to true once stream is obtained
    } catch (error) {
      console.error("Camera error:", error);
      alert("Camera access denied! 📸");
      onClose();
    }
  };

  const takePhoto = () => {
    if (!stream || !videoRef.current) { // Check if stream and video element are ready
      alert("Camera not ready. Please wait or ensure camera access is granted.");
      return;
    }
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      onCapture(blob, "image");
    }, "image/jpeg");
  };

  const startVideo = () => {
    if (!stream) { // Check if stream is ready
      alert("Camera not ready. Please wait or ensure camera access is granted.");
      return;
    }
    chunks.current = [];
    startTimeRef.current = Date.now();
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: "video/webm" });
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      onCapture(blob, "video", duration);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopVideo = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  return (
    <div style={styles.overlay}>
      <video ref={videoRef} autoPlay playsInline style={styles.video} />
      {recording && (
        <div style={styles.timer}>
          <span className="recording-dot">●</span> {formatTime(recordingTime)}
        </div>
      )}
      <style>{`
        .recording-dot { color: red; margin-right: 8px; animation: cameraBlink 1s infinite; }
        @keyframes cameraBlink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }
      `}</style>

      <div style={styles.controls}>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
        {!recording && cameraReady ? ( // Only show capture buttons if not recording and camera is ready
          <>
            <button onClick={takePhoto} style={styles.captureBtn} title="Take Photo" disabled={!cameraReady}>📸</button>
            <button onClick={startVideo} style={styles.videoBtn} title="Record Video" disabled={!cameraReady}><i className="fa-solid fa-video"></i></button>
          </>
        ) : (
          <button onClick={stopVideo} style={styles.stopBtn} title="Stop Recording"><i className="fa-solid fa-video"></i></button>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: { 
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
    background: '#000', zIndex: 10000, display: 'flex', flexDirection: 'column' 
  },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  controls: { 
    position: 'absolute', bottom: '40px', left: 0, width: '100%', 
    display: 'flex', justifyContent: 'center', gap: '30px', alignItems: 'center' 
  },
  closeBtn: { 
    position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.3)', 
    border: 'none', color: '#fff', fontSize: '20px', borderRadius: '50%', 
    width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  captureBtn: { 
    width: '70px', height: '70px', borderRadius: '50%', border: '5px solid #fff', 
    background: 'transparent', cursor: 'pointer', fontSize: '30px' 
  },
  videoBtn: { 
    width: '70px', height: '70px', borderRadius: '50%', border: '5px solid white', 
    background: 'transparent', cursor: 'pointer', fontSize: '30px',color:'white' 
  },
  stopBtn: { 
    width: '70px', height: '70px', borderRadius: '50%', background: 'red', 
    border: 'none', cursor: 'pointer', fontSize: '30px', color: '#fff' 
  },
  timer: {
    position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.6)', color: '#fff', padding: '5px 15px',
    borderRadius: '20px', fontSize: '18px', fontWeight: 'bold', zIndex: 10,
    display: 'flex', alignItems: 'center'
  }
};

export default Camera;
