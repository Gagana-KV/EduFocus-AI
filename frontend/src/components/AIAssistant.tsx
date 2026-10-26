import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import api from '../api';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: 'assistant', content: 'Hi! I am EduFocus AI. How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Don't render if not logged in
  if (!user) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        user_id: user.id,
        role: user.role,
        message: userMessage
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || "Unknown error occurred.";
      if (err.response?.status === 500 && err.response?.data?.detail === "Groq API Key not configured") {
        setMessages(prev => [...prev, { role: 'assistant', content: 'The Groq API Key is missing. Please configure it in the backend .env file to enable the AI assistant.' }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${errorMessage}` }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full bg-gradient-to-r from-nvidia-green to-nvidia-blue text-white shadow-lg shadow-nvidia-green/20 hover:scale-110 transition-transform z-50 ${isOpen ? 'hidden' : 'block'}`}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] glass-panel rounded-2xl flex flex-col z-50 overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="bg-panel-bg p-4 border-b border-panel-border flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-nvidia-green to-nvidia-blue flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white">EduFocus AI</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-700' : 'bg-nvidia-green/20'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-nvidia-green" />}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'bg-nvidia-blue/20 text-white rounded-tr-none border border-nvidia-blue/30' : 'bg-panel-bg border border-panel-border text-gray-200 rounded-tl-none'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-nvidia-green/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-nvidia-green" />
                  </div>
                  <div className="p-3 rounded-2xl bg-panel-bg border border-panel-border text-gray-400 rounded-tl-none text-sm flex gap-1">
                    <span className="animate-bounce">.</span><span className="animate-bounce delay-100">.</span><span className="animate-bounce delay-200">.</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts */}
            <div className="px-4 py-2 flex gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar border-t border-panel-border/50">
              {['Summarize my day', 'How can I improve?', 'Why is my focus low?'].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(prompt);
                  }}
                  className="px-3 py-1 bg-dark-bg border border-panel-border rounded-full text-xs text-gray-300 hover:text-white hover:border-nvidia-green transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-panel-bg border-t border-panel-border">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  className="w-full bg-dark-bg border border-panel-border rounded-full pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-nvidia-green transition-colors"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-nvidia-green rounded-full flex items-center justify-center text-dark-bg hover:bg-nvidia-green-light transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
