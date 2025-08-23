import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Bot, User, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ChatInterfaceProps {
  fileName: string;
  fileContent: string;
}

export default function ChatInterface({ fileName, fileContent }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: `Hello! I've analyzed your document "${fileName}". Feel free to ask me any questions about its content, and I'll help you understand it better.`,
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponseFromAPI = async (question: string, content: string): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append("question", question);
    formData.append("fileContent", content); // Optional: your backend can ignore or use it

    const response = await axios.post("http://localhost:8000/api/assistant/ask", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });

    return response.data.answer || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("API error:", error);
    return "⚠️ Unable to connect to the assistant. Please try again later.";
  }
};

const handleSendMessage = async () => {
  if (!inputText.trim()) return;

  const userMessage: Message = {
    id: messages.length + 1,
    text: inputText,
    sender: 'user',
    timestamp: new Date()
  };

  setMessages(prev => [...prev, userMessage]);
  setInputText('');
  setIsTyping(true);

  // 🔁 Call real backend API
  const aiText = await generateAIResponseFromAPI(inputText, fileContent);

  const aiResponse: Message = {
    id: messages.length + 2,
    text: aiText,
    sender: 'ai',
    timestamp: new Date()
  };

  setMessages(prev => [...prev, aiResponse]);
  setIsTyping(false);
};


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col h-[600px]">
      {/* Chat Header */}
      <div className="flex items-center space-x-3 p-4 border-b border-gray-700">
        <div className="p-2 bg-blue-900/20 rounded-lg">
          <MessageCircle className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-200">Chat with AI</h3>
          <p className="text-sm text-gray-400">Ask questions about {fileName}</p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex items-start space-x-2 max-w-[80%] ${
                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-600'
                    : 'bg-gray-700'
                }`}
              >
                {message.sender === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-blue-400" />
                )}
              </div>
              
              <div
                className={`rounded-xl p-3 ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-200'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2 max-w-[80%]">
              <div className="p-2 rounded-lg bg-gray-700">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div className="rounded-xl p-3 bg-gray-700">
                <div className="flex items-center space-x-1">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-sm text-gray-400">AI is thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your document..."
            disabled={isTyping}
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
          </p>
          <p className="text-xs text-gray-500">
            {inputText.length}/500
          </p>
        </div>
      </div>
    </div>
  );
}