# Complete WebRTC Implementation Guide

Is guide me hum implement karenge:
1. ICE Candidates forwarding
2. Local media (video/audio) access
3. Remote video display
4. Complete peer-to-peer connection

---

## Step 1: Backend - ICE Candidates Forward Karna

**File: `backend/server.js`**

```javascript
// Existing code ke saath ye add karo

// ICE candidate forward karna
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ... existing offer and answer handlers ...

  // ICE candidate receive aur forward
  socket.on("ice-candidate", (data) => {
    console.log("ICE candidate received from:", socket.id);
    console.log("Forwarding to:", data.targetId);
    
    io.to(data.targetId).emit("ice-candidate", {
      candidate: data.candidate,
      sender: socket.id
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
```

---

## Step 2: Frontend - Complete Implementation

**File: `frontend/src/App.jsx`**

### 2.1 State Variables Add Karo

```javascript
const [localStream, setLocalStream] = useState(null);
const [remoteStream, setRemoteStream] = useState(null);
const localVideoRef = useRef(null);
const remoteVideoRef = useRef(null);
```

### 2.2 connectPC Function Update Karo

```javascript
const connectPC = () => {
  pc.current = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" }
    ],
  });

  // ICE candidate generate hone par
  pc.current.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("New ICE candidate:", event.candidate);
      socket.emit("ice-candidate", {
        targetId: targetId,
        candidate: event.candidate
      });
    }
  };

  // Remote track receive hone par
  pc.current.ontrack = (event) => {
    console.log("Remote track received:", event.streams[0]);
    setRemoteStream(event.streams[0]);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = event.streams[0];
    }
  };

  // Connection state changes
  pc.current.onconnectionstatechange = () => {
    console.log("Connection state:", pc.current.connectionState);
  };

  // ICE connection state
  pc.current.oniceconnectionstatechange = () => {
    console.log("ICE connection state:", pc.current.iceConnectionState);
  };
};
```

### 2.3 Media Access Function

```javascript
const getCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    
    console.log("Local stream obtained:", stream);
    setLocalStream(stream);
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // Agar peer connection already hai, to tracks add karo
    if (pc.current) {
      stream.getTracks().forEach(track => {
        pc.current.addTrack(track, stream);
      });
    }
    
    return stream;
  } catch (error) {
    console.error("Error accessing media devices:", error);
    alert("Camera/Microphone access denied!");
  }
};
```

### 2.4 sendOffer Function Update Karo

```javascript
const sendOffer = async () => {
  console.log("send offer called");
  
  // Pehle media access lo
  const stream = await getCamera();
  if (!stream) return;

  connectPC();

  // Local tracks add karo
  stream.getTracks().forEach(track => {
    pc.current.addTrack(track, stream);
  });

  const offer = await pc.current.createOffer();
  await pc.current.setLocalDescription(offer);
  
  console.log("Offer created and sent!");
  socket.emit("offer", {
    targetId: targetId,
    offer: offer,
  });
};
```

### 2.5 useEffect Me Socket Listeners Add Karo

```javascript
useEffect(() => {
  socket.on("connect", () => {
    console.log("Connected with ID:", socket.id);
    setSocketID(socket.id);
  });

  socket.on("receiver", (receiverData) => {
    setAllMessage((prev) => [
      ...prev,
      {
        receiverData,
        isOwn: false,
      },
    ]);
  });

  socket.on("offer", async (data) => {
    console.log("Offer received from:", data.sender);
    
    // Pehle media access lo
    const stream = await getCamera();
    if (!stream) return;

    connectPC();

    // Local tracks add karo
    stream.getTracks().forEach(track => {
      pc.current.addTrack(track, stream);
    });

    await pc.current.setRemoteDescription(data.offer);
    console.log("Answer creating...");

    const answer = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answer);

    socket.emit("answer", {
      answer: answer,
      targetId: data.sender,
    });
    
    console.log("Answer sent!");
  });

  socket.on("answer", async (data) => {
    console.log("Answer received from:", data.sender);
    await pc.current.setRemoteDescription(data.answer);
  });

  // ICE candidate receive karna
  socket.on("ice-candidate", async (data) => {
    console.log("ICE candidate received from:", data.sender);
    try {
      if (pc.current && data.candidate) {
        await pc.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log("ICE candidate added successfully");
      }
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  });

  return () => {
    socket.off("connect");
    socket.off("receiver");
    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");
  };
}, []);
```

### 2.6 JSX Me Video Elements Add Karo

```jsx
return (
  <>
    <div className="outer">
      <div className="chatSection">
        <div className="userHeader">Your ID: {socketID}</div>
        <div className="chatArea">
          {allMessage.map((msg, index) => (
            <div
              key={index}
              className={msg.isOwn ? "message own" : "message other"}
            >
              <div className="messageSender">
                {msg.isOwn ? "You" : msg.receiverData?.sender || "User"}
              </div>
              <div className="messageContent">
                {msg.message || msg.receiverData?.message}
              </div>
            </div>
          ))}
        </div>
        <div className="inputArea">
          <input
            type="text"
            placeholder="Enter target ID"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          />
          <div className="messageInputContainer">
            <input
              type="text"
              placeholder="Enter your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button onClick={sendMessage}>Send</button>
            <button onClick={sendOffer}>Start Video Call</button>
          </div>
        </div>
      </div>

      <div className="peerConnection">
        <div className="videoSection">
          <h3>Video Connection</h3>
          <div className="videoContainer">
            <div className="videoBox">
              <h4>Your Video</h4>
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", maxWidth: "400px", border: "2px solid #333" }}
              />
            </div>
            <div className="videoBox">
              <h4>Remote Video</h4>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ width: "100%", maxWidth: "400px", border: "2px solid #333" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
);
```

---

## Step 3: CSS Styling (Optional)

**File: `frontend/src/App.css`**

```css
.videoSection {
  padding: 20px;
}

.videoContainer {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

.videoBox {
  text-align: center;
}

.videoBox h4 {
  margin-bottom: 10px;
  color: #333;
}

video {
  background: #000;
  border-radius: 8px;
}
```

---

## Testing Steps

1. **Backend start karo:**
   ```bash
   cd backend
   npm start
   ```

2. **Frontend start karo:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Do browser tabs kholo:**
   - Tab 1: `http://localhost:5173`
   - Tab 2: `http://localhost:5173`

4. **Connection establish karo:**
   - Dono tabs me apni socket IDs note karo
   - Tab 1 me: Tab 2 ki ID enter karo aur "Start Video Call" click karo
   - Camera permission allow karo
   - Dono tabs me video dikhni chahiye!

---

## Troubleshooting

### Video nahi dikh rahi?
- Browser console check karo for errors
- Camera permission diya hai?
- HTTPS ya localhost pe ho? (WebRTC requires secure context)

### ICE candidates fail ho rahe?
- STUN server working hai check karo
- Network firewall check karo
- Console me ICE connection state dekho

### Audio nahi aa rahi?
- Video element me `muted` attribute sirf local video ke liye hai
- Remote video me `muted` nahi hona chahiye

---

## Key Points

1. **ICE Candidates:** Automatically generate hote hain jab `setLocalDescription` call hota hai
2. **Media Tracks:** `addTrack()` se peer connection me add karo
3. **Remote Stream:** `ontrack` event me receive hoti hai
4. **Refs:** Video elements ke liye refs use karo for direct DOM access

Happy Coding! 🚀
