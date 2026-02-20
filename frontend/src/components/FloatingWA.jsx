import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { ChatModal } from './ChatModal';

export const FloatingWA = ({ businessName, whatsapp, aiEnabled, aiSaludo, slug, aiUseModal = true }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        // Show tooltip after 3 seconds
        const timer = setTimeout(() => {
            setShowTooltip(true);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    if (!aiEnabled) return null;

    // Sanitize WhatsApp number (remove non-digits)
    const cleanNumber = whatsapp ? whatsapp.replace(/\D/g, '') : '';

    // Personalized message for the first message from client
    const encodedMsg = encodeURIComponent(`¡Hola! 👋 Vengo desde su página web. Quisiera información sobre el menú de *${businessName}* y realizar un pedido.`);
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;

    const handleClick = (e) => {
        // Web modal is now a core feature and always active
        e.preventDefault();
        setIsModalOpen(true);
        setShowTooltip(false);
    };

    return (
        <>
            <div className="fixed bottom-24 right-6 z-[60] flex flex-col items-end gap-3 pointer-events-none">
                <AnimatePresence>
                    {showTooltip && (
                        <motion.div
                            initial={{ opacity: 0, x: 20, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.8 }}
                            className="bg-white p-4 rounded-2xl rounded-br-none shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-gray-100 max-w-[240px] pointer-events-auto relative mb-1"
                        >
                            <button
                                onClick={() => setShowTooltip(false)}
                                className="absolute -top-2 -left-2 size-6 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-sm"
                            >
                                <X className="w-3 h-3" />
                            </button>

                            <div className="flex items-center gap-2 mb-2">
                                <div className="size-2 rounded-full bg-[#4ADE80] animate-pulse" />
                                <span className="text-[10px] font-black text-[#22C55E] uppercase tracking-widest">Asistente IA Online</span>
                            </div>

                            <p className="text-xs font-bold text-[#111814] leading-relaxed">
                                {aiSaludo || `¡Hola! 👋 Soy el asistente de ${businessName}. ¿En qué puedo ayudarte hoy?`}
                            </p>

                            <div className="mt-3 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-[#22C55E]" />
                                <span className="text-[9px] font-black text-[#618972] uppercase tracking-tighter">Pedidos automáticos 24/7</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.a
                    href={waUrl}
                    target="_self"
                    rel="noopener noreferrer"
                    onClick={handleClick}
                    animate={{
                        y: [0, -8, 0],
                        scale: [1, 1.05, 1]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.9 }}
                    className="size-16 bg-[#25D366] rounded-full shadow-[0_15px_35px_rgba(37,211,102,0.4)] flex items-center justify-center text-white pointer-events-auto group relative overflow-visible"
                >
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-0 group-hover:opacity-100 transition-opacity" />
                    <MessageCircle className="w-8 h-8 fill-current" />

                    {/* Notification Badge */}
                    <span className="absolute -top-1 -right-1 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-[9px] items-center justify-center font-black text-white shadow-sm ring-2 ring-white">
                            1
                        </span>
                    </span>
                </motion.a>
            </div>

            <ChatModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                businessName={businessName}
                slug={slug}
                aiSaludo={aiSaludo}
            />
        </>
    );
};
