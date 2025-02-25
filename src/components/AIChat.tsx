import { useState, useRef, useEffect } from 'react';
import { useWasteStore } from '../store/wasteStore';
import { MessageSquare, Send } from 'lucide-react';
import { getRecyclingAdvice } from '../services/geminiService';

interface Message {
  text: string;
  isUser: boolean;
}

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const detectedItems = useWasteStore((state) => state.detectedItems);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add initial message based on detected items
  useEffect(() => {
    if (detectedItems.length > 0) {
      const items = detectedItems.map(item => item.type);
      getRecyclingAdvice("What items do you see and how should I handle them?", items)
        .then(response => {
          setMessages([{ 
            text: response,
            isUser: false 
          }]);
        });
    }
  }, [detectedItems]); // Update when new items are detected

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);

    try {
      // Get current detected items for context
      const currentItems = detectedItems.map(item => item.type);
      // Pass both the user's question and current detected items
      const response = await getRecyclingAdvice(
        `Based on the detected items (${currentItems.join(', ')}): ${userMessage}`,
        currentItems
      );
      setMessages(prev => [...prev, { text: response, isUser: false }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, { 
        text: "Sorry, I couldn't process your request. Please try again.", 
        isUser: false 
      }]);
    }

    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4 h-full flex flex-col">
      <h2 className="font-medium flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
         Assistant
      </h2>

      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-gray-50 rounded-lg min-h-[400px]">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.isUser
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-500">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about The Object..."
          className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </form>
    </div>
  );
}