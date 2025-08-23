import React, { useState, useRef, useEffect } from 'react';
import { FileText, Sparkles, MessageCircle, Send, Bot, User, Loader2 } from 'lucide-react';
import axios from 'axios'; // <-- Add this import

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface SummaryDisplayProps {
  summary: string;
  fileName: string;
  fileContent: string;
  isGenerating: boolean;
}

export default function SummaryDisplay({ summary, fileName, fileContent, isGenerating }: SummaryDisplayProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages,summary]);

  useEffect(() => {
    if (summary && messages.length === 0) {
      setMessages([{
        id: 1,
        text: `Hello! I've analyzed your document "${fileName}". Feel free to ask me any questions about its content, and I'll help you understand it better.`,
        sender: 'ai',
        timestamp: new Date()
      }]);
    }
  }, [summary, fileName, messages.length]);

  // Updated: Call backend for AI response
  const generateAIResponse = async (userQuestion: string): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append("question", userQuestion);
      formData.append("fileContent", fileContent);

      const response = await axios.post("http://localhost:8000/api/assistant/ask", formData, {
        headers: { "Content-Type": "multipart/form-data" }
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

    // Call backend for AI response
    const aiText = await generateAIResponse(userMessage.text);

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

  if (isGenerating) {
    return (
      <div className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-800/50 shadow-xl">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-cyan-500/20 rounded-xl">
            <Sparkles className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-white">Generating Neural Summary...</h3>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded animate-pulse"></div>
              <div className="h-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded animate-pulse w-4/5" style={{ animationDelay: '0.2s' }}></div>
              <div className="h-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded animate-pulse w-3/4" style={{ animationDelay: '0.4s' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Summary Section */}
      <div className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-8 border border-gray-800/50 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/5 transition-all duration-500">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/25">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">Neural Summary</h3>
            <p className="text-gray-400">{fileName}</p>
          </div>
        </div>
        
        <div
          className="prose prose-invert max-w-none"
          style={{
            maxHeight: 320,
            overflowY: 'auto',
            paddingRight: 8,
            marginBottom: 16,
          }}
        >
          {/* Format summary with research sections if possible */}
          {(() => {
            // Try to split summary into research sections
            const sectionRegex = /^(?:\*\*|__)?(Title|Objective|Methodology|Results|Conclusion)(?:\*\*|__)?\s*[:\-]?\s*/i;
            if (sectionRegex.test(summary)) {
              const lines = summary.split(/\r?\n/);
              let currentSection = '';
              let sections: { title: string, content: string[] }[] = [];
              lines.forEach(line => {
                // Match and clean both heading and content
                const match = line.match(/^(?:\*\*|__)?(Title|Objective|Methodology|Results|Conclusion)(?:\*\*|__)?\s*[:\-]?\s*(.*)/i);
                if (match) {
                  currentSection = match[1];
                  // Remove leading/trailing **, __, :, -, and whitespace from content
                  let cleanContent = match[2].replace(/^(\*\*|__)+/, '').replace(/^[:\-]+/, '').trim();
                  sections.push({ title: currentSection, content: [cleanContent] });
                } else if (currentSection && sections.length) {
                  // Remove leading markdown from continuation lines too
                  let cleanLine = line.replace(/^(\*\*|__)+/, '').replace(/^[:\-]+/, '').trim();
                  sections[sections.length - 1].content.push(cleanLine);
                }
              });
              return (
                <div>
                  {sections.map((sec, idx) => (
                    <div key={sec.title + idx} style={{ marginBottom: 12 }}>
                      <h4 className="text-cyan-300 text-lg font-semibold mb-1">{sec.title}</h4>
                      <p className="text-gray-300 leading-relaxed text-base">
                        {sec.content.join(' ').trim()}
                      </p>
                    </div>
                  ))}
                </div>
              );
            }
            // Fallback: show as paragraph
            return (
              <p className="text-gray-300 leading-relaxed text-lg">
                {summary}
              </p>
            );
          })()}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-800/50">
          <button
            onClick={() => setShowChat(!showChat)}
            className="group flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-xl text-white font-medium transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{showChat ? 'Hide Chat' : 'Start Conversation'}</span>
          </button>
        </div>
      </div>

      {/* Chat Section */}
      <div className={`bg-gray-900/40 backdrop-blur-sm rounded-2xl border border-gray-800/50 shadow-xl transition-all duration-500 ${showChat ? 'opacity-100 scale-100' : 'opacity-50 scale-95'}`}>
        <div className="flex flex-col h-[600px]">
          {/* Chat Header */}
          <div className="flex items-center space-x-4 p-6 border-b border-gray-800/50">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/25">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">AI Assistant</h3>
              <p className="text-gray-400">Ask questions about your document</p>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div
                  className={`flex items-start space-x-3 max-w-[85%] ${
                    message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shadow-lg ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/25'
                        : 'bg-gradient-to-br from-gray-700 to-gray-600 shadow-gray-700/25'
                    }`}
                  >
                    {message.sender === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  
                  <div
                    className={`rounded-2xl p-4 shadow-lg backdrop-blur-sm ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-blue-500/25'
                        : 'bg-gray-800/80 text-gray-200 shadow-gray-800/25 border border-gray-700/50'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p
                      className={`text-xs mt-2 ${
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
              <div className="flex justify-start animate-fadeIn">
                <div className="flex items-start space-x-3 max-w-[85%]">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-gray-700 to-gray-600 shadow-lg shadow-gray-700/25">
                    <Bot className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="rounded-2xl p-4 bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 shadow-lg shadow-gray-800/25">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                      <span className="text-sm text-gray-400">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-gray-800/50">
            <div className="flex items-center space-x-3">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about your document..."
                disabled={isTyping || !showChat}
                className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 disabled:opacity-50 backdrop-blur-sm transition-all duration-300"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping || !showChat}
                className="p-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 disabled:hover:scale-100"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-500">
                Press Enter to send • Shift+Enter for new line
              </p>
              <p className="text-xs text-gray-500">
                {inputText.length}/500
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}