import { useEffect } from "react";
import "./App.css";
import { io } from "socket.io-client";
import { useState } from "react";

const socket = io("http://localhost:9000");

function App() {
  const [socketID, setSocketID] = useState("");
  const [targetId,setTargetId]=useState("")
  const [message,setMessage]=useState("")
  const [allMessage,setAllMessage]=useState([])
  const sendMessage =()=>{
    console.log("ruk ja bhej raha hu")

    socket.emit("sender",{
      targetId:targetId,
      message:message
    })
  }
  useEffect(() => {
    socket.on("connect", () => {
      console.log(socket.id); // x8WIv7-mJelg7on_ALbx
      setSocketID(socket.id);
    });
    socket.on("receiver",(receiverData)=>{
        setAllMessage((prev)=>[...prev,receiverData])
    })
  }, []);

  return (
    <>

      <div className="outer">
        <div className="chatSection">
          <div className="userHeader">{socketID}</div>
          <div className="chatArea">
            {
              allMessage.map((msg,index)=>(<div key={index}>
                  "message": {msg.message}

              </div>))
            }
          </div>
          <div className="inputArea">
            <input type="text" placeholder="enter the target id" value={targetId} onChange={(e)=>setTargetId(e.target.value)} />
            <input type="text" placeholder="enter the message" value={message} onChange={(e)=>setMessage(e.target.value)} />
            <button onClick={sendMessage}>send now</button>

          </div>




          {/* chat kre ge ya */}
        </div>
        <div className="peerConnection">
          {/* vdo */}
        </div>
      </div>  
      
    </>
  );
}

export default App;
