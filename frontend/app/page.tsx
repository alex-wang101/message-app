"use client";
const clickSound = "/cardi/fwah.mp3";


import { useRef, useState, useEffect} from "react";

interface Message {
  id: number;
  text: string;
  sender: string;
  timestamp: Date;
  isSystem?: boolean;
}

export default function Home() {
  // Generate unique ID for this client session
  const [userID] = useState(() => crypto.randomUUID());
  const webRef = useRef<WebSocket | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [connectedCount, setConnectedCount] = useState(1);

  useEffect(() => {
    console.log("[WebSocket] Connecting... userID:", userID);
    
    const ws = new WebSocket("ws://localhost:8000/api/ws");
    webRef.current = ws;

    ws.onopen = () => {
      console.log("[WebSocket] Connected");
    };

    ws.onclose = () => {
      console.log("[WebSocket] Disconnected");
    };

    ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "message" && data.message) {
        const messageWithDate = {
          ...data.message,
          timestamp: new Date(data.message.timestamp)
        };
        setMessages((prev) => [...prev, messageWithDate]);
        setOtherUserTyping(false);
      } else if (data.type === "typing" && data.sender !== userID) {
        setOtherUserTyping(true);
      } else if (data.type === "not_typing" && data.sender !== userID) {
        setOtherUserTyping(false);
      } else if (data.type === "user_joined") {
        if (data.count !== undefined) {
          setConnectedCount(data.count);
        }
        const systemMessage: Message = {
          id: Date.now(),
          text: "A user joined the chat",
          sender: "system",
          timestamp: new Date(data.timestamp),
          isSystem: true
        };
        setMessages((prev) => [...prev, systemMessage]);
      } else if (data.type === "user_left") {
        if (data.count !== undefined) {
          setConnectedCount(data.count);
        }
        const systemMessage: Message = {
          id: Date.now(),
          text: "A user left the chat",
          sender: "system",
          timestamp: new Date(data.timestamp),
          isSystem: true
        };
        setMessages((prev) => [...prev, systemMessage]);
        setOtherUserTyping(false);

      } else if (data.type === "play_sound") {
        const audio = new Audio("/cardi/fwah.mp3");
        audio.play().catch(err => console.error("[Sound] Error playing:", err));
      } else if (data.type === "connection_count") {
        if (data.count !== undefined) {
          setConnectedCount(data.count);
        }
      }
    };

    return () => {
      console.log("[WebSocket] Closing connection");
      ws.close();
    };
  }, [userID]);

  // Handle input change - sends typing indicator via WebSocket
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (newValue.length > 0 && webRef.current?.readyState === WebSocket.OPEN) {
      console.log("[Typing] Sending typing event");
      webRef.current.send(JSON.stringify({ 
        type: "typing", 
        sender: userID 
      }));
    }

    else if (newValue.length === 0 && webRef.current?.readyState === WebSocket.OPEN) {
      console.log("[Typing] Sending not_typing event");
      webRef.current.send(JSON.stringify({
        type: "not_typing", 
        sender: userID
      }));
    }
  };

  // Handle keyboard events (like Enter to send)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      handleSendMessage();
    }
  };


  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    console.log("[Message] Sending message:", inputValue);
    
    const response = await fetch("http://localhost:8000/api/messages", {
      method: "POST", 
      headers: { "Content-Type": "application/json"}, 
      body: JSON.stringify({ text: inputValue, sender: userID })
    });

    if (response.ok) {
      console.log("[Message] Message sent successfully");
    } else {
      console.error("[Message] Failed to send:", response.status);
    }

    setInputValue("");
  };
  const playButtonSound = () => {
    if (webRef.current?.readyState === WebSocket.OPEN) {
      console.log("[Sound] Sending play_sound request");
      webRef.current.send(JSON.stringify({ 
        type: "play_sound",
        sender: userID 
      }));
    } else {
      console.error("[Sound] WebSocket not connected");
    }
  }
  return (
    <div className="flex min-h-screen bg-black">
      <main className="flex flex-col w-full max-w-4xl mx-auto h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b-2 border-red-600">
          <div>
            <h1 className="text-3xl text-red-600 uppercase">VAMP CHAT</h1>
            <p className="text-xs text-white/50 uppercase tracking-[0.3em]">whole lotta red</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-white text-sm uppercase tracking-wider">
              {connectedCount} {connectedCount === 1 ? "vamp" : "vamps"}
            </div>
            <button
              onClick={playButtonSound}
              className="w-12 h-12 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center text-xl"
            >
               😈
            </button>
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {messages.map((message) => {
            const isMe = message.sender === userID;
            const isSystem = message.isSystem;
            
            if (isSystem) {
              return (
                <div key={message.id} className="flex justify-center">
                  <p className="text-xs text-white/30 uppercase tracking-widest">
                    -- {message.text} --
                  </p>
                </div>
              );
            }
            
            return (
              <div
                key={message.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-3 ${
                    isMe
                      ? "bg-red-600 text-white"
                      : "bg-white/10 text-white border border-white/20"
                  }`}
                >
                  <p className="text-sm lowercase">{message.text}</p>
                  <p className="text-[10px] mt-2 opacity-50 uppercase">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          {otherUserTyping && (
            <div className="flex justify-start">
              <div className="bg-white/10 border border-white/20 px-4 py-3">
                <p className="text-sm text-red-600">
                  <span className="blink">_</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t-2 border-red-600 px-6 py-5">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="..."
              className="flex-1 px-4 py-3 bg-transparent border-2 border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-red-600 lowercase"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="px-6 py-3 bg-red-600 text-white uppercase text-sm hover:bg-red-700 disabled:opacity-20 disabled:cursor-not-allowed"
            >
              SEND
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
