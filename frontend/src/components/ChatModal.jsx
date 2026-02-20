import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, Bot, Sparkles, SendHorizontal } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const ChatModal = ({ isOpen, onClose, businessName, slug, aiSaludo }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [phone, setPhone] = useState(localStorage.getItem('chat_phone') || '');
    const [askingPhone, setAskingPhone] = useState(!localStorage.getItem('chat_phone'));
    const scrollRef = useRef(null);

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                role: 'assistant',
                content: aiSaludo || `¡Hola! 👋 Soy el asistente de ${businessName}. ¿En qué puedo ayudarte hoy?`
            }]);
        }
    }, [isOpen, businessName, aiSaludo]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const response = await axios.post(`${API}/chat/web/${slug}`, {
                message: userMsg,
                phone: phone
            });

            setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, tuve un problema de conexión. ¿Podrías intentar de nuevo?' }]);
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneSubmit = (e) => {
        e.preventDefault();
        if (phone.length >= 7) {
            localStorage.setItem('chat_phone', phone);
            setAskingPhone(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-end justify-end p-4 md:p-6 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.9, rotate: 2 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, y: 100, scale: 0.9, rotate: 2 }}
                    className="w-full max-w-[400px] h-[600px] max-h-[85vh] bg-white/95 dark:bg-[#0F172A]/98 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden flex flex-col pointer-events-auto ring-1 ring-black/5"
                >
                    {/* Header */}
                    <div className="p-6 bg-gradient-to-br from-[#111814] to-[#1a2e22] text-white flex items-center justify-between shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Bot className="w-24 h-24 rotate-12" />
                        </div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="size-12 rounded-2xl bg-[#22C55E] flex items-center justify-center shadow-lg shadow-[#22C55E]/20">
                                <Sparkles className="w-6 h-6 text-white animate-pulse" />
                            </div>
                            <div>
                                <h3 className="font-black text-lg tracking-tight">Asistente IA</h3>
                                <div className="flex items-center gap-1.5">
                                    <div className="size-2 rounded-full bg-[#4ADE80] animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">En línea ahora</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors relative z-10 active:scale-90"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth" ref={scrollRef}>
                        {askingPhone ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center h-full text-center space-y-6"
                            >
                                <div className="size-20 rounded-[2rem] bg-[#f0f4f2] flex items-center justify-center text-[#22C55E]">
                                    <User className="w-10 h-10" />
                                </div>
                                <div>
                                    <h4 className="font-black text-xl text-[#111814]">¡Bienvenido!</h4>
                                    <p className="text-[#618972] text-sm mt-2 max-w-[240px]">Para darte una atención personalizada, indícanos tu número de WhatsApp.</p>
                                </div>
                                <form onSubmit={handlePhoneSubmit} className="w-full space-y-3">
                                    <input
                                        type="tel"
                                        placeholder="Tu WhatsApp (ej: 3001234567)"
                                        className="w-full h-14 px-6 rounded-2xl bg-[#f6f8f7] border-2 border-transparent focus:border-[#22C55E] focus:bg-white text-lg font-bold outline-none transition-all placeholder:text-gray-400"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="submit"
                                        className="w-full h-14 bg-[#111814] text-white rounded-2xl font-black tracking-wide hover:bg-[#1a2e22] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10"
                                    >
                                        EMPEZAR A CHATEAR
                                        <Send className="w-4 h-4" />
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <>
                                {messages.map((msg, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20, y: 10 }}
                                        animate={{ opacity: 1, x: 0, y: 0 }}
                                        key={i}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm ${msg.role === 'user'
                                                    ? 'bg-[#111814] text-white rounded-tr-none'
                                                    : 'bg-[#f0f4f2] text-[#111814] rounded-tl-none font-bold'
                                                }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </motion.div>
                                ))}
                                {loading && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                        <div className="bg-[#f0f4f2] p-4 rounded-3xl rounded-tl-none flex gap-1 items-center">
                                            <div className="size-1.5 bg-[#22C55E] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="size-1.5 bg-[#22C55E] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="size-1.5 bg-[#22C55E] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </motion.div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer Input */}
                    {!askingPhone && (
                        <div className="p-6 pt-0">
                            <form
                                onSubmit={handleSendMessage}
                                className="relative flex items-center bg-[#f6f8f7] rounded-2xl p-2 pl-6 focus-within:ring-2 ring-[#22C55E] ring-offset-2 transition-all"
                            >
                                <input
                                    type="text"
                                    placeholder="Escribe tu mensaje..."
                                    className="flex-1 bg-transparent py-3 outline-none font-bold text-sm text-[#111814] placeholder:text-gray-400"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    disabled={loading}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || loading}
                                    className="size-10 bg-[#111814] text-white rounded-xl flex items-center justify-center hover:bg-[#1a2e22] disabled:opacity-40 disabled:hover:bg-[#111814] transition-all active:scale-90 shadow-lg shadow-black/10"
                                >
                                    <SendHorizontal className="w-5 h-5" />
                                </button>
                            </form>
                            <p className="text-[9px] text-center text-[#618972] mt-4 font-black uppercase tracking-[0.2em] opacity-40">
                                Powered by Menu.IA
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
