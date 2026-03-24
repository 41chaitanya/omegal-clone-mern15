import { useEffect, useRef } from "react";
import "./App.css";
import { io } from "socket.io-client";
import { useState } from "react";

const socket = io("http://localhost:9000");

function App() {
  const [socketID, setSocketID] = useState("");
  const [targetId, setTargetId] = useState("");
  const [message, setMessage] = useState("");
  const [allMessage, setAllMessage] = useState([]);

  const pc = useRef(null);
  const remoteRef=useRef(null)

 

  // Peer connection setup karna with ICE candidate handling
  const connectPC = () => {
    pc.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302"}
      ],
    });
    pc.current.onicecandidate=(event)=>{
      if(event.candidate){
        socket.emit("ice-candidate",{
          targetId:remoteRef.current,
          candidate:event.candidate
        })
      }
    }
 
  };

  const sendOffer = async () => {
    console.log("send offer called. ");

    remoteRef.current=targetId
    connectPC();
    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);
    console.log("offer. created !!");
    socket.emit("offer", {
      targetId: targetId,
      offer: offer,
    });
  };

  const sendMessage = () => {
    console.log("ruk ja bhej raha hu");
    if (message.trim()) {
      setAllMessage((prev) => [
        ...prev,
        {
          targetId: targetId,
          message: message,
          isOwn: true,
        },
      ]);
      socket.emit("sender", {
        targetId: targetId,
        message: message,
      });
    }
  };

  useEffect(() => {
    socket.on("connect", () => {
      console.log(socket.id); // x8WIv7-mJelg7on_ALbx
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
      console.log("offer in client. that forwarded", data.sender, data.offer)
      remoteRef.current=data.sender
      connectPC();

      await pc.current.setRemoteDescription(data.offer);

      console.log("answer created ");

      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      socket.emit("answer", {
        answer: answer,
        targetId: data.sender,
      });
    });




    socket.on("ice-candidate",(data)=>{

      if(pc.current&&data.candidate){


        pc.current.addIceCandidate(new RTCIceCandidate(data.candidate))
      }
    })


    socket.on("answer", async (data) => {
      console.log("answer form. server. in client ", data.sender, data.answer)
      await pc.current.setRemoteDescription(data.answer);
    });

    
  }, []);

  return (
    <>
      <div className="outer">
        <div className="chatSection">
          <div className="userHeader">{socketID}</div>
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
              <button onClick={sendOffer}>Send Offer</button>
            </div>
          </div>

          {/* chat section ends */}
        </div>
        <div className="peerConnection">
          <div className="videoSection">
            <h3>Video Connection</h3>
            <div className="videoContainer">
              {/* Video implementation will be added here */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
