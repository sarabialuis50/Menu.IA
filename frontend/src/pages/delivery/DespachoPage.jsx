import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Truck,
    MapPin,
    CheckCircle2,
    Navigation,
    Clock,
    Phone,
    User,
    ArrowLeft,
    Loader2,
    Package,
    ExternalLink,
    ChevronRight,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DespachoPage() {
    const { slug, orderId } = useParams();
    const { api } = useAuth();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [business, setBusiness] = useState(null);

    useEffect(() => {
        fetchData();
    }, [slug, orderId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [orderRes, businessRes] = await Promise.all([
                api().get(`/orders/${slug}/track/${orderId}`),
                api().get(`/business/${slug}`)
            ]);
            setOrder(orderRes.data);
            setBusiness(businessRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Error al cargar el pedido");
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (newStatus) => {
        try {
            setUpdating(true);
            await api().put(`/orders/${slug}/${orderId}`, { estado: newStatus });
            setOrder(prev => ({ ...prev, estado: newStatus }));

            if (newStatus === 'enviado') {
                toast.success("¡Viaje iniciado! El cliente ha sido notificado.");
                startGPS();
            } else if (newStatus === 'entregado') {
                toast.success("¡Pedido entregado con éxito!");
                stopGPS();
            }
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Error al actualizar el estado");
        } finally {
            setUpdating(false);
        }
    };

    const startGPS = () => {
        if (!("geolocation" in navigator)) return;
        setIsTracking(true);

        const watchId = navigator.geolocation.watchPosition(
            async (position) => {
                try {
                    await api().put(`/orders/${slug}/${orderId}`, {
                        repartidor_lat: position.coords.latitude,
                        repartidor_lng: position.coords.longitude
                    });
                } catch (err) {
                    console.error("Error updating GPS:", err);
                }
            },
            (err) => console.error("GPS Error:", err),
            { enableHighAccuracy: true }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    };

    const stopGPS = () => {
        setIsTracking(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
                <Loader2 className="w-10 h-10 text-[#25D366] animate-spin mb-4" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Cargando logística...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
                <div className="size-20 rounded-3xl bg-red-50 flex items-center justify-center text-red-500 mb-6 font-black text-2xl">!</div>
                <h2 className="text-2xl font-black text-[#111814] mb-2">Pedido no encontrado</h2>
                <p className="text-gray-500 mb-8 max-w-xs">El enlace podría haber expirado o el pedido no existe.</p>
                <Link to="/" className="text-[#25D366] font-black uppercase tracking-widest text-xs">Volver al Inicio</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Dynamic Background Effect */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
                <div className="absolute -top-[10%] -right-[10%] size-96 rounded-full bg-[#25D366]/5 blur-3xl animate-pulse" />
                <div className="absolute top-[40%] -left-[10%] size-80 rounded-full bg-blue-500/5 blur-3xl" />
            </div>

            <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">
                {/* Header */}
                <div className="p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="size-12 rounded-2xl bg-[#111814] flex items-center justify-center text-white shadow-lg">
                                <Truck className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-[#111814] leading-tight">Módulo de Reparto</h1>
                                <p className="text-[10px] font-black text-[#25D366] uppercase tracking-[0.2em]">Enlace Seguro v1.0</p>
                            </div>
                        </div>
                        <div className="size-10 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center shadow-sm">
                            <div className={`size-2 rounded-full ${isTracking ? 'bg-[#25D366] animate-ping' : 'bg-gray-300'}`} />
                        </div>
                    </div>

                    {/* Business Info Card */}
                    <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 mb-6">
                        <div className="flex items-center gap-4">
                            {business?.logo_url ? (
                                <img src={business.logo_url} className="size-14 rounded-2xl object-cover bg-gray-50 p-1 border border-gray-100 shadow-sm" alt="Logo" />
                            ) : (
                                <div className="size-14 rounded-2xl bg-[#F0FFF4] flex items-center justify-center text-[#25D366]">
                                    <Package className="w-8 h-8" />
                                </div>
                            )}
                            <div>
                                <h2 className="font-black text-[#111814] text-lg uppercase tracking-tight">{business?.nombre || 'Mi Restaurante'}</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{order.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Client Details Section */}
                    <div className="bg-[#111814] rounded-[2.8rem] p-8 shadow-2xl shadow-[#111814]/20 relative overflow-hidden group mb-8">
                        {/* Abstract decorative circles */}
                        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/5 blur-2xl group-hover:bg-white/10 transition-colors" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="size-8 rounded-full bg-[#25D366] flex items-center justify-center text-[#111814]">
                                    <User className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.34em]">Información del Cliente</span>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-3xl font-black text-white tracking-tighter mb-1 uppercase italic leading-none">{order.cliente_nombre}</p>
                                    <div className="flex items-center gap-2 text-[#25D366]">
                                        <Phone className="w-3 h-3" />
                                        <span className="text-xs font-bold leading-none">{order.cliente_telefono}</span>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/10">
                                    <div className="flex items-start gap-4">
                                        <div className="size-10 rounded-2xl bg-white/10 flex items-center justify-center text-white p-2">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Destino Final</p>
                                            <p className="text-sm font-bold text-white/90 leading-tight">
                                                {order.direccion}
                                            </p>
                                        </div>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.direccion)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="size-10 rounded-2xl bg-[#25D366] flex items-center justify-center text-[#111814] hover:scale-110 active:scale-95 transition-all shadow-lg shadow-[#25D366]/20"
                                        >
                                            <Navigation className="w-5 h-5" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-4">
                        <AnimatePresence mode="wait">
                            {order.estado === 'listo' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <Button
                                        onClick={() => updateStatus('enviado')}
                                        disabled={updating}
                                        className="w-full h-20 rounded-[2rem] bg-[#25D366] hover:bg-[#128C7E] text-[#111814] font-black text-lg tracking-widest shadow-xl shadow-[#25D366]/20 transition-all border-b-4 border-black/10 active:border-b-0 active:translate-y-1"
                                    >
                                        {updating ? <Loader2 className="animate-spin" /> : 'INICIAR VIAJE 🛵'}
                                    </Button>
                                    <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">PULSA PARA NOTIFICAR AL CLIENTE E INICIAR GPS</p>
                                </motion.div>
                            )}

                            {order.estado === 'enviado' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <Button
                                        onClick={() => updateStatus('entregado')}
                                        disabled={updating}
                                        className="w-full h-20 rounded-[2rem] bg-[#111814] hover:bg-black text-white font-black text-lg tracking-widest shadow-xl shadow-black/20 transition-all border-b-4 border-white/10 active:border-b-0 active:translate-y-1 group"
                                    >
                                        {updating ? <Loader2 className="animate-spin" /> : (
                                            <span className="flex items-center gap-3">
                                                ENTREGA EXITOSA
                                                <CheckCircle2 className="w-6 h-6 group-hover:scale-125 transition-transform" />
                                            </span>
                                        )}
                                    </Button>
                                    <p className="text-center text-[10px] font-black text-[#25D366] uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
                                        <span className="size-2 rounded-full bg-[#25D366] animate-ping" />
                                        TRANSMITIENDO GPS EN TIEMPO REAL
                                    </p>
                                </motion.div>
                            )}

                            {order.estado === 'entregado' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center py-12"
                                >
                                    <div className="size-20 rounded-[2rem] bg-[#F0FFF4] text-[#25D366] flex items-center justify-center mx-auto mb-6 shadow-sm border-2 border-[#25D366]/10">
                                        <CheckCircle2 className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-black text-[#111814] mb-2">¡TRABAJO TERMINADO!</h3>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Cierra esta pestaña para ahorrar batería</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-auto p-8 text-center bg-gray-50/50 border-t border-gray-100 rounded-t-[3rem]">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Registrado: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.4em]">MENUPRO LOGISTICS SYSTEM</p>
                </div>
            </div>
        </div>
    );
}
