
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    User, Edit, MapPin, Package, Heart, Ticket, LogOut, ArrowLeft,
    Truck, Star, Plus, Briefcase, Home, CheckCircle2, Loader2, Phone, ShieldCheck
} from 'lucide-react';

export default function ClientProfilePage() {
    const { slug } = useParams();
    const navigate = useNavigate();

    // Auth State
    const [token, setToken] = useState(localStorage.getItem('client_token'));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authStep, setAuthStep] = useState('phone'); // phone, otp
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Data State
    const [orders, setOrders] = useState([]);
    const [addresses, setAddresses] = useState([]);
    // Favorites State
    const [favorites, setFavorites] = useState([]);
    const [loyalty, setLoyalty] = useState(null);

    useEffect(() => {
        if (token) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const api = axios.create({
                baseURL: (import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) || '/api',
                headers: { Authorization: `Bearer ${token}` }
            });

            const profileRes = await api.get('/client/me');
            const currentUser = profileRes.data;
            setUser(currentUser);

            const [ordersRes, addrRes, favRes, pointsRes] = await Promise.all([
                api.get('/client/orders'),
                api.get('/client/addresses'),
                api.get('/client/favorites'),
                api.get(`/loyalty/${slug}/points/${currentUser.telefono}`)
            ]);

            setOrders(ordersRes.data);
            setAddresses(addrRes.data);
            setFavorites(favRes.data || []);
            setLoyalty(pointsRes.data);
        } catch (error) {
            console.error(error);
            if (error.response?.status === 401) {
                logout();
            }
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('client_token');
        setToken(null);
        setUser(null);
        setAuthStep('phone');
    };

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        if (!phone || phone.length < 10) {
            toast.error("Ingresa un número válido");
            return;
        }
        setSubmitting(true);
        try {
            await axios.post('/api/auth/client/request-otp', { telefono: phone });
            setAuthStep('otp');
            toast.success("Código enviado por WhatsApp");
        } catch (error) {
            toast.error("Error al enviar código. Intenta de nuevo.");
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await axios.post('/api/auth/client/verify-otp', { telefono: phone, otp });
            const newToken = res.data.access_token;
            localStorage.setItem('client_token', newToken);
            setToken(newToken);
            toast.success("¡Bienvenido!");
        } catch (error) {
            toast.error("Código inválido o expirado");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-[#22C55E]" />
            </div>
        );
    }

    // Login View
    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50/30 flex flex-col items-center justify-center p-4 font-inter">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-[#22C55E]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="w-8 h-8 text-[#22C55E]" />
                        </div>
                        <h1 className="text-2xl font-black text-[#111814]">
                            {authStep === 'phone' ? 'Bienvenido' : 'Verifica tu número'}
                        </h1>
                        <p className="text-gray-500 font-medium">
                            {authStep === 'phone'
                                ? 'Ingresa tu celular para acceder a tu perfil y pedidos.'
                                : `Ingresa el código enviado a WhatsApp al ${phone}`
                            }
                        </p>
                    </div>

                    <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
                        <CardContent className="p-8">
                            {authStep === 'phone' ? (
                                <form onSubmit={handleRequestOtp} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="font-bold text-gray-700">Número de Celular</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <Input
                                                type="tel"
                                                placeholder="300 123 4567"
                                                className="pl-12 h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-[#22C55E]/20 focus:border-[#22C55E]"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full h-12 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-[#111814] font-black text-base shadow-lg shadow-[#22C55E]/20"
                                        disabled={submitting}
                                    >
                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continuar"}
                                    </Button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label className="font-bold text-gray-700">Código de Verificación</Label>
                                        <Input
                                            type="text"
                                            placeholder="123456"
                                            className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:ring-[#22C55E]/20 focus:border-[#22C55E] text-center text-xl tracking-widest font-bold"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            maxLength={6}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full h-12 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-[#111814] font-black text-base shadow-lg shadow-[#22C55E]/20"
                                        disabled={submitting}
                                    >
                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verificar"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="w-full text-gray-500 font-bold"
                                        onClick={() => setAuthStep('phone')}
                                    >
                                        Cambiar número
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                    <Button
                        variant="ghost"
                        onClick={() => navigate(`/${slug}/menu-completo`)}
                        className="w-full text-gray-400 font-bold hover:text-[#111814]"
                    >
                        Volver al menú
                    </Button>
                </div>
            </div>
        );
    }

    // Profile View
    return (
        <div className="min-h-screen bg-gray-50/30 font-inter pb-20">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/${slug}/menu-completo`)} className="rounded-full hover:bg-gray-100">
                            <ArrowLeft className="w-5 h-5 text-gray-700" />
                        </Button>
                        <h1 className="text-xl font-black tracking-tight text-[#111814]">Mi Cuenta</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={logout} className="rounded-full text-red-500 hover:bg-red-50 hover:text-red-600">
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 space-y-6">

                {/* Profile Hero */}
                <Card className="border-none shadow-[0_10px_40px_rgba(0,0,0,0.04)] rounded-[2rem] bg-white overflow-hidden">
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full p-1 bg-white shadow-lg border border-gray-100">
                                        <Avatar className="w-full h-full">
                                            <AvatarImage src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.nombre}&background=random`} className="object-cover" />
                                            <AvatarFallback className="bg-gray-100 text-gray-400 font-bold text-2xl">
                                                {user.nombre?.charAt(0) || 'C'}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <Button
                                        size="icon"
                                        className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-white text-gray-700 border shadow-sm hover:bg-gray-50"
                                        onClick={() => navigate(`/${slug}/mi-cuenta/editar`)}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-[#111814] tracking-tight">{user.nombre || 'Sin Nombre'}</h2>
                                    <div className="text-sm font-medium text-gray-500 flex flex-col items-center md:items-start gap-1">
                                        <span className="flex items-center gap-1">
                                            <Phone className="w-3.5 h-3.5 text-[#22C55E]" /> {user.telefono}
                                        </span>
                                        {user.email && (
                                            <span className="flex items-center gap-1">
                                                <User className="w-3.5 h-3.5 text-[#22C55E]" /> {user.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button
                                onClick={() => navigate(`/${slug}/mi-cuenta/editar`)}
                                className="rounded-xl px-6 bg-white border-2 border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E] hover:text-white font-bold transition-all shadow-md active:scale-95"
                            >
                                Editar Perfil
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                    {/* Left Column (Orders) */}
                    <div className="md:col-span-12 lg:col-span-7 space-y-6">

                        {/* Recent Orders */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-lg font-black text-[#111814] flex items-center gap-2">
                                    <Package className="w-5 h-5 text-[#22C55E]" />
                                    Mis Pedidos Recientes
                                </h3>
                                <Button
                                    variant="ghost"
                                    className="text-xs font-bold text-[#22C55E] hover:text-[#16A34A] hover:bg-green-50 rounded-lg ml-auto"
                                    onClick={() => navigate(`/${slug}/mi-cuenta/pedidos`)}
                                >
                                    Ver todo
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {orders.length === 0 ? (
                                    <Card className="border-none shadow-sm rounded-[1.5rem] bg-gray-50/50">
                                        <CardContent className="p-8 text-center text-gray-500 font-medium">
                                            No tienes pedidos recientes
                                        </CardContent>
                                    </Card>
                                ) : (
                                    orders.map((order) => (
                                        <Card key={order.id} className="border-none shadow-sm hover:shadow-md transition-shadow rounded-[1.5rem] overflow-hidden group cursor-pointer" onClick={() => navigate(`/${order.negocio_slug || slug}/mis-pedidos?order=${order.id}`)}>
                                            <CardContent className="p-6">
                                                <div className="flex gap-4">
                                                    {/* Icon */}
                                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0">
                                                        {order.negocio_logo ? (
                                                            <img src={order.negocio_logo} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                                                        ) : (
                                                            <Package className="w-6 h-6 text-gray-400" />
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        {/* Top Row: Product Name + Date */}
                                                        <div className="flex justify-between items-start">
                                                            <div className="flex items-center gap-2 min-w-0 pr-4">
                                                                <h4 className="font-bold text-[#111814] leading-tight truncate text-base">
                                                                    {order.items?.length > 0 ? `${order.items[0].nombre} ${order.items.length > 1 ? `+ ${order.items.length - 1}` : ''}` : 'Pedido'}
                                                                </h4>
                                                                <span className="text-[10px] font-bold text-gray-400 shrink-0 bg-gray-100 px-1.5 py-0.5 rounded">#{order.id?.slice(-6).toUpperCase()}</span>
                                                            </div>
                                                            <span className="text-xs text-gray-500 font-medium shrink-0">
                                                                {(() => {
                                                                    const d = new Date(order.created_at);
                                                                    const today = new Date();
                                                                    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                                                                    const yesterday = new Date(today);
                                                                    yesterday.setDate(yesterday.getDate() - 1);
                                                                    const isYesterday = d.toDateString() === yesterday.toDateString();

                                                                    if (isToday) return `Hoy, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                                                    if (isYesterday) return 'Ayer';
                                                                    return d.toLocaleDateString();
                                                                })()}
                                                            </span>
                                                        </div>

                                                        {/* Middle Row: Business Info + Price */}
                                                        <p className="text-sm text-gray-500 mt-1 truncate">
                                                            {order.negocio_nombre || 'Restaurante'} • {order.items?.length || 0} items • <span className="text-gray-900 font-bold ml-1">${order.total?.toLocaleString()}</span>
                                                        </p>

                                                        {/* Bottom Row: Status + Action */}
                                                        <div className="flex items-center gap-3 mt-3">
                                                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-100 ${['entregado'].includes(order.estado) ? 'text-gray-500' : 'text-green-700 bg-green-50'}`}>
                                                                {order.estado?.replace('_', ' ')}
                                                            </div>

                                                            {['pendiente', 'en_proceso', 'en_camino'].includes(order.estado) && (
                                                                <button
                                                                    className="text-sm font-bold text-[#2563EB] hover:text-[#22C55E] transition-colors"
                                                                    onClick={(e) => { e.stopPropagation(); navigate(`/${order.negocio_slug || slug}/mis-pedidos?order=${order.id}`); }}
                                                                >
                                                                    Rastrear pedido
                                                                </button>
                                                            )}
                                                            {['entregado', 'cancelado'].includes(order.estado) && (
                                                                <button
                                                                    className="text-sm font-bold text-[#22C55E] hover:text-[#16A34A] transition-colors"
                                                                    onClick={(e) => { e.stopPropagation(); navigate(`/${order.negocio_slug || slug}/menu-completo`); }}
                                                                >
                                                                    Volver a pedir
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Column */}
                    <div className="md:col-span-12 lg:col-span-5 flex flex-col">
                        <div className="space-y-6">
                            {/* Addresses */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-lg font-black text-[#111814] flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-[#22C55E]" />
                                        Direcciones
                                    </h3>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-gray-100 text-gray-600 hover:bg-[#22C55E] hover:text-[#111814]">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {addresses.length === 0 ? (
                                        <div className="text-center py-4 text-sm text-gray-400 font-medium">No hay direcciones guardadas</div>
                                    ) : (
                                        addresses.map((addr) => (
                                            <Card key={addr.id} className="border-none shadow-sm hover:shadow-md transition-shadow rounded-[1.5rem] overflow-hidden group">
                                                <CardContent className="p-5 flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                                        <Home className="w-5 h-5 text-[#22C55E]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <h4 className="font-bold text-[#111814] text-sm">{addr.nombre}</h4>
                                                            {addr.es_principal && (
                                                                <Badge className="h-4 text-[9px] px-1.5 bg-[#22C55E]/20 text-[#111814] hover:bg-[#22C55E]/30 border-none shadow-none uppercase font-bold">
                                                                    Principal
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-2">{addr.direccion}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Spacer to push points card down */}
                        <div className="flex-1 min-h-[1.5rem]" />

                        {/* Loyalty Points */}
                        <Card className="border-none rounded-[2rem] bg-[#22C55E] text-white overflow-hidden relative shadow-lg">
                            <CardContent className="p-8 relative z-10 text-center space-y-4">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black">Puntos Acumulados</h3>
                                    <div className="flex flex-col items-center">
                                        <span className="text-5xl font-black drop-shadow-md">{loyalty?.puntos_actuales || 0}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">Puntos Disponibles</span>
                                    </div>
                                    <p className="text-white/90 text-sm font-medium pt-2">
                                        {loyalty?.puntos_actuales > 0
                                            ? `¡Tienes $${(loyalty.puntos_actuales * 100).toLocaleString()} para tu próxima compra!`
                                            : "¡Empieza a sumar puntos con tus pedidos!"
                                        }
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Favorites Section (Outside grid for full width) */}
                <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-black text-[#111814] flex items-center gap-2">
                            <Heart className="w-5 h-5 text-[#22C55E]" />
                            Mis Favoritos
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {favorites.length === 0 ? (
                            <Card className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4 border-none shadow-sm rounded-[1.5rem] bg-gray-50/50">
                                <CardContent className="p-12 text-center text-gray-500 font-medium">
                                    No tienes favoritos aún
                                </CardContent>
                            </Card>
                        ) : (
                            favorites.map((fav) => (
                                <Card key={fav.negocio_id} className="border-none shadow-sm hover:shadow-md transition-shadow rounded-[1.5rem] overflow-hidden cursor-pointer group" onClick={() => window.location.href = `/${fav.negocio_slug}`}>
                                    <CardContent className="p-5 flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-gray-50 overflow-hidden group-hover:scale-110 transition-transform`}>
                                            {fav.negocio_logo ? (
                                                <img src={fav.negocio_logo} alt={fav.negocio_nombre} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="font-black text-lg opacity-40">{fav.negocio_nombre?.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-[#111814] truncate">{fav.negocio_nombre}</h4>
                                            <p className="text-xs text-gray-500 font-medium truncate">{fav.negocio_categoria}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                <span className="text-[10px] font-bold text-gray-600">4.9</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </main >
        </div >
    );
}
