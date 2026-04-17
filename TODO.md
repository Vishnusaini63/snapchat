# Online/Last Seen Status Feature - Implementation TODO

## Approved Plan Steps:
✅ **Step 1:** DB schema updated in server/config/User.js (is_online, last_seen columns added)  
✅ **Step 2:** Socket events implemented in server/server.js (registerUser updates DB/online emit, getFriendStatus query+emit, disconnect offline+emit)  

## Remaining:
- [ ] Step 3: Polish ChatBox.jsx (add online dot indicator, ensure WhatsApp-green styling)  
- [ ] Step 4: Test (restart server `cd server && node server.js`, open 2 chats, verify online→last seen)  

**Status: Step 3 next**

