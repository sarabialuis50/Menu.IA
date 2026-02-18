import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Minimize2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function LandingAgent() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState([
        { role: 'model', content: '¡Hola! 👋 Soy el asistente experto de Menu.IA. ¿En qué puedo ayudarte a potenciar tu negocio hoy?' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, isLoading]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || isLoading) return;

        const userMessage = message.trim();
        setMessage('');
        setHistory(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await axios.post(`${API_URL}/api/public/landing-chat`, {
                message: userMessage,
                history: history
            });

            setHistory(prev => [...prev, { role: 'model', content: response.data.reply }]);
        } catch (error) {
            console.error('Error in chat:', error);
            setHistory(prev => [...prev, { role: 'model', content: 'Lo siento, tuve un problema de conexión. ¿Podrías intentar de nuevo?' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] font-inter">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-4 w-[90vw] sm:w-[400px] max-h-[80vh] h-[600px] bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-[#22B8CF] p-5 flex items-center justify-between text-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white p-0.5 overflow-hidden border-2 border-[#22C55E]">
                                    <img src="/logos/logo agente.png" alt="Agente Menu.IA" className="w-full h-full object-cover" />
                                </div>
                                <div className="">
                                    <h3 className="font-black text-sm tracking-tight text-white leading-none">Asistente Menu.IA</h3>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                        <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">En línea</span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsOpen(false)}
                                className="text-white/60 hover:text-white hover:bg-white/10 rounded-full h-8 w-8"
                            >
                                <Minimize2 className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50"
                        >
                            {history.map((msg, i) => (
                                <motion.div
                                    initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={i}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm font-medium shadow-sm flex flex-col gap-3 ${msg.role === 'user'
                                        ? 'bg-[#22C55E] text-white rounded-tr-none'
                                        : 'bg-white text-[#111814] rounded-tl-none border border-gray-100'
                                        }`}>
                                        <div>{msg.content.replace('[LINK_CALENDLY]', '')}</div>

                                        {/* Botón de Agendamiento Automático */}
                                        {msg.role === 'model' && (msg.content.includes('calendly.com') || msg.content.includes('[LINK_CALENDLY]')) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open('https://calendly.com/sarabialuis50/asesoria-personalizada-menu-ia', '_blank')}
                                                className="bg-[#22B8CF] hover:bg-[#1DA1B8] text-white border-none rounded-xl h-10 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 mt-1"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                Agendar Asesoría Gratis
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white p-4 rounded-[1.5rem] rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-[#22C55E]" />
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pensando...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 shrink-0">
                            <div className="relative flex items-center gap-2">
                                <Input
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Pregúntame cualquier cosa..."
                                    className="h-12 rounded-xl pr-12 border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#22C55E]/20"
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={!message.trim() || isLoading}
                                    className="absolute right-1.5 h-9 w-9 bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-lg transition-all"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bubble Trigger with Floating Animation */}
            <motion.button
                animate={!isOpen ? { y: [0, -10, 0] } : { y: 0 }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`h-16 w-16 rounded-full shadow-[0_10px_30px_rgba(34,197,94,0.3)] flex items-center justify-center transition-all relative overflow-visible group border-2 ${isOpen ? 'bg-white border-gray-200 text-[#111814]' : 'bg-white border-[#22C55E] text-[#111814]'
                    }`}
            >
                {isOpen ? (
                    <X className="w-7 h-7 text-gray-400" />
                ) : (
                    <>
                        <div className="absolute inset-0 bg-[#22C55E]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                        <img
                            src="/logos/logo agente.png"
                            alt="Chat"
                            className="w-12 h-12 object-cover relative z-10"
                        />
                    </>
                )}

                {/* Notification Badge - Moved further outside */}
                {!isOpen && (
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 z-20">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-6 w-6 bg-[#22C55E] text-[11px] items-center justify-center font-black text-white shadow-lg ring-2 ring-white">
                            1
                        </span>
                    </span>
                )}
            </motion.button>
        </div>
    );
}
