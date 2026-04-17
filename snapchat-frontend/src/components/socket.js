import io from "socket.io-client";

const socket = io("https://snapchat-vgrt.onrender.com", {
  transports: ["websocket"],
  upgrade: false
});

export default socket;



//dfghjklfcvbnm,gfghjkl;