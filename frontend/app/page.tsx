"use client";

import { useRef, useState, useEffect} from "react";

interface Message {
  id: number;
  text: string;
  sender: string;
  timestamp: Date;
}

export default function Home() {
  // Generate unique ID for this client session
  const [userID] = useState(() => crypto.randomUUID());
  const webRef = useRef<WebSocket | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

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
      console.log("[WebSocket] Received:", data);
      
      if (data.type === "message" && data.message) {
        const messageWithDate = {
          ...data.message,
          timestamp: new Date(data.message.timestamp)
        };
        console.log("[Message] Adding message:", messageWithDate);
        setMessages((prev) => [...prev, messageWithDate]);
        setOtherUserTyping(false);
      } else if (data.type === "typing" && data.sender !== userID) {
        console.log("[Typing] Other user typing:", data.sender);
        setOtherUserTyping(true);
      } else if (data.type === "not_typing" && data.sender !== userID) {
        console.log("[Typing] Other user stopped typing:", data.sender);
        setOtherUserTyping(false);
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
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="flex flex-col w-full max-w-4xl mx-auto h-screen bg-white dark:bg-zinc-800">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
              U
            </div>
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Chat</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Online</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((message) => {
            const isMe = message.sender === userID;
            return (
              <div
                key={message.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    isMe
                      ? "bg-blue-500 text-white"
                      : "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMe
                        ? "text-blue-100"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
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
              <div className="bg-zinc-100 dark:bg-zinc-700 rounded-2xl px-4 py-2">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">typing...</p>
              </div>
            </div>
          )}
        </div>

        {/* Message Input Area */}
        <div className="border-t border-zinc-200 dark:border-zinc-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Write something..."
              className="flex-1 px-4 py-3 rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
