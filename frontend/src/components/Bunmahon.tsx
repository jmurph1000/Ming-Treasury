'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { X } from 'lucide-react';

const IRISH_GREEN = '#1E6B3C';

function ShamrockIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill={color} xmlns="http://www.w3.org/2000/svg">
      {/* Top leaf */}
      <path d="M50 10 C35 10, 25 25, 30 38 C32 42, 40 46, 50 44 C60 46, 68 42, 70 38 C75 25, 65 10, 50 10Z" />
      {/* Right leaf */}
      <path d="M90 50 C90 35, 75 25, 62 30 C58 32, 54 40, 56 50 C54 60, 58 68, 62 70 C75 75, 90 65, 90 50Z" />
      {/* Bottom leaf */}
      <path d="M50 90 C65 90, 75 75, 70 62 C68 58, 60 54, 50 56 C40 54, 32 58, 30 62 C25 75, 35 90, 50 90Z" />
      {/* Left leaf */}
      <path d="M10 50 C10 65, 25 75, 38 70 C42 68, 46 60, 44 50 C46 40, 42 32, 38 30 C25 25, 10 35, 10 50Z" />
      {/* Center */}
      <circle cx="50" cy="50" r="6" />
      {/* Stem */}
      <path d="M48 56 C47 70, 44 82, 42 92 L46 92 C48 82, 50 70, 52 56Z" />
    </svg>
  );
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ABOUT_TEXT = `Bunmahon (known in Irish as Bun Machan, meaning "mouth of the Mahon river") is a small, beautiful coastal village nestled along the Copper Coast of County Waterford in the southeast of Ireland \u2014 a stretch of shoreline so geologically remarkable it has been designated a UNESCO Global Geopark.

The village earned its name and its living from the land beneath it. Between 1827 and 1877, copper and lead were mined from the cliffs and hills surrounding Bunmahon, making it one of the most productive mining communities in 19th century Ireland. The village grew around the mines \u2014 houses, a temperance hall (built 1842), and a Church of Ireland church built in the 1820s, which today serves as the Copper Coast Geopark visitor centre.

Like so many Irish villages of the 19th century, Bunmahon was shaped profoundly by emigration. As the mines declined and the Great Famine (1845\u20131852) swept through Ireland, families from County Waterford and the surrounding region made the heartbreaking journey to the ports \u2014 Waterford, Cork, and beyond \u2014 to board ships bound for America. Irish emigrants of this era typically arrived in New York, Boston, Philadelphia, New Orleans, and Newfoundland. Families from the Bunmahon area are known to have settled as far as Clontarf, Minnesota, carrying their Waterford heritage into the American midwest.

Before departure, Irish communities held what was known as the "American Wake" \u2014 a gathering not unlike a funeral wake, held the night before the emigrant left. There was food, drink, music, singing, and storytelling, because those who left understood they would likely never see their homeland or their family again. It was a farewell to everything they had ever known.

Today, Bunmahon is a peaceful, welcoming village. Its beach draws surfers year-round, a boardwalk winds through the sand dunes, and the Copper Coast Geopark preserves the geological and human history of this extraordinary place. The 4-leaf shamrock we carry as our symbol reflects both the Irish spirit and the good fortune we bring to your treasury work each day.

\u2014 The Gusto Treasury Team`;

export function Bunmahon() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [welcomeLoaded, setWelcomeLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const loadWelcome = async () => {
    if (welcomeLoaded) return;
    try {
      const res = await fetch('/api/bunmahon/welcome', { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data?.welcomeMessage) {
        setMessages([{ role: 'assistant', content: data.data.welcomeMessage }]);
      }
      setWelcomeLoaded(true);
    } catch {
      setMessages([{ role: 'assistant', content: "Good day! I'm Bunmahon, your treasury assistant. What can I help you with?" }]);
      setWelcomeLoaded(true);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    loadWelcome();
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/bunmahon/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (data.success && data.data?.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Failed to connect. Please try again in a moment.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Bunmahon Button - positioned in nav center */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          style={{ backgroundColor: IRISH_GREEN }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-md"
        >
          <ShamrockIcon size={20} color="white" />
          <span>Ask Bunmahon</span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[620px] max-h-[520px] bg-white rounded-b-xl shadow-2xl flex flex-col border border-gray-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <ShamrockIcon size={24} color={IRISH_GREEN} />
              <div>
                <span className="font-semibold text-gray-900">Bunmahon</span>
                <span className="ml-1 text-xs text-gray-500">Gusto Treasury Assistant</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAbout(true)}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                About
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[300px] max-h-[390px]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 mr-2 mt-1">
                    <ShamrockIcon size={18} color={IRISH_GREEN} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                  style={msg.role === 'user' ? { backgroundColor: IRISH_GREEN } : undefined}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex-shrink-0 mr-2 mt-1">
                  <ShamrockIcon size={18} color={IRISH_GREEN} />
                </div>
                <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm text-gray-500">
                  <span className="inline-flex gap-1">
                    Bunmahon is thinking
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="border-t px-4 py-3 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask me anything about treasury..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': IRISH_GREEN } as any}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{ backgroundColor: IRISH_GREEN }}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAbout(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-lg font-bold text-gray-900">About Bunmahon</h2>
              <button onClick={() => setShowAbout(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-6">
              <div className="flex justify-center mb-4">
                <ShamrockIcon size={48} color={IRISH_GREEN} />
              </div>
              <h3 className="text-center text-xl font-bold text-gray-900 mb-1">Your Gusto Treasury Assistant</h3>
              <div className="mt-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {ABOUT_TEXT}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
