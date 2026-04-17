import io from "socket.io-client";

const socket = io("http://snapchat-vgrt.onrender.com", {
  transports: ["websocket"],
  upgrade: false
});

export default socket;
