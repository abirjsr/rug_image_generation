/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Send, 
  Image as ImageIcon, 
  Settings2, 
  FileImage, 
  X,
  MessageSquare,
  Menu,
  ChevronLeft
} from 'lucide-react';
import { api } from './services/api';
import { geminiService } from './services/geminiService';
import { Conversation, Message, ImageConfig } from './types';

const STYLE_OPTIONS = ['Photorealistic', 'Digital Art', 'Oil Painting', 'Sketch', 'Cyberpunk', 'Minimalist', '3D Render', 'Watercolor', 'Pop Art', 'Anime'];
const TEXTURE_OPTIONS = ['Smooth', 'Rough', 'Metallic', 'Fabric', 'Glass', 'Paper', 'Matte', 'Glossy', 'Liquid', 'Stone'];
const COLOR_OPTIONS = ['Vibrant', 'Monochromatic', 'Pastel', 'Dark & Moody', 'Sepia', 'Neon', 'Cool Blue', 'Warm Reds'];

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isEditingId, setIsEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  
  const [imageConfig, setImageConfig] = useState<ImageConfig>({
    size: '1K',
    aspectRatio: '1:1',
    style: 'photorealistic',
    texture: 'smooth',
    color: 'vibrant'
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    const data = await api.getConversations();
    setConversations(data);
    if (data.length > 0) {
      if (!activeConversation) {
        setActiveConversation(data[0]);
      }
    } else {
      // Create first chat automatically if none exist
      handleCreateConversation();
    }
  };

  const loadMessages = async (id: number) => {
    const data = await api.getConversationMessages(id);
    setMessages(data);
  };

  const handleCreateConversation = async () => {
    const conversation = await api.createConversation("New Chat");
    setConversations([conversation, ...conversations]);
    setActiveConversation(conversation);
  };

  const handleDeleteConversation = async (id: number) => {
    await api.deleteConversation(id);
    setConversations(conversations.filter(c => c.id !== id));
    if (activeConversation?.id === id) {
      setActiveConversation(null);
    }
  };

  const handleRenameConversation = async (id: number) => {
    if (!editName.trim()) {
      setIsEditingId(null);
      return;
    }
    const updated = await api.renameConversation(id, editName);
    setConversations(conversations.map(c => c.id === id ? updated : c));
    if (activeConversation?.id === id) {
      setActiveConversation(updated);
    }
    setIsEditingId(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedImage) return;
    if (!activeConversation) return;

    setError(null);
    const userPrompt = input;
    const userImg = selectedImage;
    
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);
    setError(null);

    try {
      // 1. Save user message
      const userMsg = await api.addMessage(
        activeConversation.id, 
        'user', 
        userPrompt, 
        userImg ? userImg : undefined,
        undefined,
        imageConfig
      );
      setMessages(prev => [...prev, userMsg]);

      // 2. Forced Image Generation
      let modelResponse: string | null = null;
      let generatedImg: string | null = null;

      try {
        generatedImg = await geminiService.generateImage(
          userPrompt || "Generate an image", 
          imageConfig, 
          userImg ? userImg.split(',')[1] : undefined
        );
        if (generatedImg) {
          modelResponse = "Generated your image based on the prompt.";
        } else {
          modelResponse = "I tried to generate an image, but it looks like the model didn't return one. Please try a different prompt.";
        }
      } catch (genErr: any) {
        console.error("Image gen error:", genErr);
        modelResponse = "Sorry, I encountered an error while generating the image: " + (genErr.message || "Unknown error");
      }

      // 3. Save model response
      if (modelResponse || generatedImg) {
        const assistantMsg = await api.addMessage(
          activeConversation.id,
          'model',
          modelResponse || '',
          undefined,
          generatedImg || undefined
        );
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Is the server running? " + (err.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (id: number) => {
    await api.deleteMessage(id);
    setMessages(messages.filter(m => m.id !== id));
  };

  const handleUpdateMessage = async (id: number, newContent: string) => {
    const updated = await api.updateMessage(id, newContent);
    setMessages(messages.map(m => m.id === id ? updated : m));
  };

  return (
    <div className="flex h-screen bg-[#F5F5F0] text-[#141414] font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 300 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className="bg-white border-r border-[#141414]/10 overflow-hidden relative flex flex-col"
      >
        <div className="p-4 border-bottom border-[#141414]/10 bg-white z-10">
          <button 
            onClick={handleCreateConversation}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#141414] text-white hover:bg-[#252525] transition-colors font-medium"
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {conversations.map(conv => (
            <div 
              key={conv.id}
              className={`group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                activeConversation?.id === conv.id ? 'bg-[#141414]/5' : 'hover:bg-[#141414]/5'
              }`}
              onClick={() => setActiveConversation(conv)}
            >
              <MessageSquare size={16} className="shrink-0 opacity-50" />
              <div className="flex-1 min-w-0">
                {isEditingId === conv.id ? (
                  <input 
                    autoFocus
                    className="w-full bg-transparent border-none outline-none text-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRenameConversation(conv.id)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameConversation(conv.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p className="text-sm font-medium truncate">{conv.name}</p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingId(conv.id);
                    setEditName(conv.name);
                  }}
                  className="p-1 hover:bg-[#141414]/10 rounded-md"
                >
                  <Edit3 size={14} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                  className="p-1 hover:bg-black/10 rounded-md text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-[#141414]/10 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-[#141414]/5 rounded-xl transition-colors"
            >
              {sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-xl font-bold tracking-tight">
              {activeConversation ? activeConversation.name : 'Gemini Studio'}
            </h1>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 && !activeConversation && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50"
              >
                <ImageIcon size={64} strokeWidth={1} />
                <div>
                  <h2 className="text-2xl font-bold">Welcome to Gemini Studio</h2>
                  <p className="text-sm">Start a new conversation to begin generating images and chatting.</p>
                </div>
              </motion.div>
            )}
            {messages.map((msg, index) => (
              <motion.div 
                key={msg.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] md:max-w-[70%] space-y-2 group`}>
                  <div className={`p-4 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-[#141414] text-white shadow-xl' 
                      : 'bg-white border border-[#141414]/10 shadow-sm'
                  }`}>
                    {msg.image_url && (
                      <div className="mb-3 rounded-lg overflow-hidden border border-white/10">
                        <img 
                          src={msg.image_url} 
                          alt="Input" 
                          referrerPolicy="no-referrer"
                          className="w-full max-h-96 object-cover" 
                        />
                      </div>
                    )}
                    
                    {msg.content && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {msg.content}
                      </div>
                    )}

                    {msg.generated_image_url && (
                      <div className="mt-3 rounded-lg overflow-hidden ring-1 ring-[#141414]/10">
                        <img 
                          src={msg.generated_image_url} 
                          alt="Generated" 
                          referrerPolicy="no-referrer"
                          className="w-full object-contain bg-neutral-100" 
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className={`flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold opacity-40 group-hover:opacity-100 transition-opacity ${
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="hover:text-red-500 flex items-center gap-1"
                    >
                      <Trash2 size={10} /> Delete
                    </button>
                    {msg.role === 'user' && (
                      <button 
                        onClick={() => {
                          const newContent = prompt("Edit message:", msg.content);
                          if (newContent !== null) handleUpdateMessage(msg.id, newContent);
                        }}
                        className="hover:text-blue-500 flex items-center gap-1"
                      >
                        <Edit3 size={10} /> Edit
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-[#141414]/10 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#141414]/20 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#141414]/20 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                  <span className="w-2 h-2 bg-[#141414]/20 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest opacity-40">Gemini is thinking...</span>
              </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-[#F5F5F0] border-t border-[#141414]/5 space-y-4">
          <div className="max-w-4xl mx-auto space-y-4">
            
            {/* Image Preview & Config */}
            <AnimatePresence>
              {(selectedImage || showConfig) && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white p-4 rounded-2xl border border-[#141414]/10 shadow-lg space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Settings2 size={14} /> Image Generation Settings
                    </h3>
                    <button onClick={() => { setSelectedImage(null); setShowConfig(false); }} className="opacity-40 hover:opacity-100"><X size={16} /></button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold opacity-40">Size</label>
                      <select 
                        className="w-full text-sm bg-neutral-50 border border-neutral-200 rounded-lg p-2"
                        value={imageConfig.size}
                        onChange={e => setImageConfig({...imageConfig, size: e.target.value as any})}
                      >
                        <option>512px</option>
                        <option>1K</option>
                        <option>2K</option>
                        <option>4K</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold opacity-40">Aspect Ratio</label>
                      <select 
                        className="w-full text-sm bg-neutral-50 border border-neutral-200 rounded-lg p-2"
                        value={imageConfig.aspectRatio}
                        onChange={e => setImageConfig({...imageConfig, aspectRatio: e.target.value as any})}
                      >
                        <option>1:1</option>
                        <option>3:4</option>
                        <option>4:3</option>
                        <option>9:16</option>
                        <option>16:9</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold opacity-40">Style</label>
                      <select 
                        className="w-full text-sm bg-neutral-50 border border-neutral-200 rounded-lg p-2"
                        value={imageConfig.style}
                        onChange={e => setImageConfig({...imageConfig, style: e.target.value})}
                      >
                        {STYLE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold opacity-40">Texture</label>
                      <select 
                        className="w-full text-sm bg-neutral-50 border border-neutral-200 rounded-lg p-2"
                        value={imageConfig.texture}
                        onChange={e => setImageConfig({...imageConfig, texture: e.target.value})}
                      >
                        {TEXTURE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold opacity-40">Color</label>
                      <select 
                        className="w-full text-sm bg-neutral-50 border border-neutral-200 rounded-lg p-2"
                        value={imageConfig.color}
                        onChange={e => setImageConfig({...imageConfig, color: e.target.value})}
                      >
                        {COLOR_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>

                  {selectedImage && (
                    <div className="flex items-center gap-4 p-2 bg-neutral-50 rounded-xl">
                      <img src={selectedImage} className="w-16 h-16 rounded-lg object-cover" alt="Selected" />
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase opacity-40">Reference Image Loaded</p>
                        <p className="text-[10px] text-neutral-500">Image will be used as a base for generation</p>
                      </div>
                      <button onClick={() => setSelectedImage(null)} className="p-2 hover:bg-neutral-200 rounded-lg text-red-500"><Trash2 size={16} /></button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm font-medium flex items-center justify-between"
              >
                <span>{error}</span>
                <button onClick={() => setError(null)}><X size={14} /></button>
              </motion.div>
            )}

            <div className="relative group">
              <input 
                type="text" 
                placeholder={activeConversation ? "Describe the image you want to generate..." : "Select a chat to begin"}
                className={`w-full p-4 pr-32 rounded-2xl bg-white border border-[#141414]/10 shadow-lg outline-none transition-all focus:ring-2 focus:ring-[#141414]/5 md:text-lg ${!activeConversation && 'opacity-50 cursor-not-allowed'}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={!activeConversation || isLoading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-[#141414]/40 hover:text-[#141414] hover:bg-[#141414]/5 rounded-xl transition-all"
                  title="Upload Image"
                  disabled={!activeConversation || isLoading}
                >
                  <FileImage size={20} />
                </button>
                <button 
                  onClick={() => setShowConfig(!showConfig)}
                  className={`p-2 transition-all rounded-xl ${showConfig ? 'text-[#141414] bg-[#141414]/5' : 'text-[#141414]/40 hover:text-[#141414] hover:bg-[#141414]/5'}`}
                  title="Image Config"
                  disabled={!activeConversation || isLoading}
                >
                  <Settings2 size={20} />
                </button>
                <button 
                  onClick={handleSendMessage}
                  className="p-3 bg-[#141414] text-white rounded-xl hover:bg-[#252525] transition-all disabled:opacity-50"
                  disabled={!activeConversation || isLoading || (!input.trim() && !selectedImage)}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] uppercase font-bold tracking-[0.2em] opacity-30">
              Powered by Google Gemini 3.1 & Silicon Logic
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
