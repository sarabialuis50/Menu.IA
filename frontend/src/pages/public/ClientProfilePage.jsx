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
    Truck, Star, Plus, Briefcase, Home, CheckCircle2, Loader2, Phone, ShieldCheck,
    Lock, Shield, Navigation, Trash2, Eye, EyeOff
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function ClientProfilePage() {
    const { slug } = useParams();
    const navigate = useNavigate();

    // Auth State
    const [token, setToken] = useState(localStorage.getItem('client_token'));
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authStep, setAuthStep] = useState('phone'); // phone, otp, pin
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [pin, setPin] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [business, setBusiness] = useState(null);

    // Data State
    const [orders, setOrders] = useState([]);
    const [addresses, setAddresses] = useState([]);
    // Favorites State
    const [favorites, setFavorites] = useState([]);
    const [loyalty, setLoyalty] = useState(null);
    const [recoveryInfo, setRecoveryInfo] = useState(null);
    const [recoveryAnswer, setRecoveryAnswer] = useState('');
    const [newPin, setNewPin] = useState('');
    const [recoveryMethod, setRecoveryMethod] = useState('hint'); // 'hint' or 'question'
    const [pinHint, setPinHint] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');

    // Password change state
    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [changingPassword, setChangingPassword] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Address Modal State
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [addressForm, setAddressForm] = useState({
        nombre: '',
        direccion: '',
        es_principal: false
    });
    const [savingAddress, setSavingAddress] = useState(false);
    const [detectingLocation, setDetectingLocation] = useState(false);

    // Hidden orders state (frontend hide only)
    const [hiddenOrderIds, setHiddenOrderIds] = useState(() => {
        const saved = localStorage.getItem('client_hidden_orders');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        fetchBusiness();
        if (token) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, [token, slug]);

    async function fetchBusiness() {
        try {
            const res = await axios.get(`/api/business/${slug}`);
            setBusiness(res.data);
        } catch (err) {
            console.error("Error fetching business:", err);
        }
    }

    async function fetchProfile() {
        setLoading(true);
        try {
            const api = axios.create({
                baseURL: (import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) || '/api',
                headers: { Authorization: `Bearer ${token}` }
            });

            const profileRes = await api.get('/client/me');
            const currentUser = profileRes.data;
            setUser(currentUser);

            // Initialize security state from user data
            if (currentUser.recovery_method) setRecoveryMethod(currentUser.recovery_method);
            if (currentUser.pin_hint) setPinHint(currentUser.pin_hint);
            if (currentUser.security_question) setSecurityQuestion(currentUser.security_question);

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
    }

    function logout() {
        localStorage.removeItem('client_token');
        setToken(null);
        setUser(null);
        setAuthStep('phone');
    }

    const handleHideOrder = (orderId) => {
        const newHidden = [...hiddenOrderIds, orderId];
        setHiddenOrderIds(newHidden);
        localStorage.setItem('client_hidden_orders', JSON.stringify(newHidden));
        toast.success("Pedido eliminado de tu vista", {
            description: "El registro permanece en la base de datos del restaurante."
        });
    };

    async function handleRequestOtp(e) {
        e.preventDefault();
        if (!phone || phone.length < 10) {
            toast.error("Ingresa un número válido");
            return;
        }
        setSubmitting(true);
        try {
            await axios.post('/api/auth/client/request-otp', { telefono: phone, negocio_slug: slug });
            setAuthStep('otp');
            toast.success("Código enviado por WhatsApp");
        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.detail?.includes("No tienes un PIN")) {
                // If the backend would support checking PIN first, we could skip OTP
                // But current request-otp always sends OTP. 
                // Let's add an option to use PIN if they already have one.
            }
            toast.error("Error al enviar código. Intenta de nuevo.");
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleLoginPin(e) {
        e.preventDefault();
        if (!pin || pin.length < 4) {
            toast.error("Ingresa tu PIN de 4 dígitos");
            return;
        }
        setSubmitting(true);
        try {
            const res = await axios.post('/api/auth/client/login-pin', { telefono: phone, pin });
            const newToken = res.data.access_token;
            localStorage.setItem('client_token', newToken);
            setToken(newToken);
            toast.success("¡Bienvenido!");
        } catch (error) {
            toast.error(error.response?.data?.detail || "PIN incorrecto");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleVerifyOtp(e) {
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
    }

    async function handleGetRecovery() {
        if (!phone) return toast.error("Ingresa tu número");
        setSubmitting(true);
        try {
            const res = await axios.get(`/api/auth/client/recovery-info/${phone}`);
            setRecoveryInfo(res.data);
            setAuthStep('recovery');
        } catch (error) {
            toast.error(error.response?.data?.detail || "No se encontró información de recuperación");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleResetPin(e) {
        e.preventDefault();
        if (recoveryInfo?.method === 'question' && !recoveryAnswer) return toast.error("Ingresa la respuesta");
        if (newPin.length !== 4) return toast.error("El nuevo PIN debe ser de 4 dígitos");

        setSubmitting(true);
        try {
            await axios.post('/api/auth/client/reset-pin', {
                telefono: phone,
                answer: recoveryAnswer,
                new_pin: newPin
            });
            toast.success("PIN restablecido con éxito");
            setAuthStep('phone');
            setPin('');
            setRecoveryAnswer('');
            setNewPin('');
        } catch (error) {
            toast.error(error.response?.data?.detail || "Error al restablecer PIN");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleChangePassword(e) {
        e.preventDefault();
        if (!passwordData.new_password || !passwordData.confirm_password) {
            toast.error("Completa los campos de contraseña");
            return;
        }
        if (passwordData.new_password !== passwordData.confirm_password) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        setChangingPassword(true);
        try {
            const api = axios.create({
                baseURL: (import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) || '/api',
                headers: { Authorization: `Bearer ${token}` }
            });
            await api.post('/client/change-password', {
                old_password: passwordData.old_password,
                new_password: passwordData.new_password
            });
            toast.success("Contraseña actualizada con éxito");
            setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        } catch (error) {
            toast.error(error.response?.data?.detail || "Error al cambiar contraseña");
        } finally {
            setChangingPassword(false);
        }
    }

    async function handleSaveAddress(e) {
        e.preventDefault();
        if (!addressForm.nombre || !addressForm.direccion) {
            toast.error("Completa todos los campos");
            return;
        }

        setSavingAddress(true);
        try {
            const api = axios.create({
                baseURL: (import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) || '/api',
                headers: { Authorization: `Bearer ${token}` }
            });
            await api.post('/client/addresses', addressForm);
            toast.success("Dirección guardada");
            setShowAddressModal(false);
            setAddressForm({ nombre: '', direccion: '', es_principal: false });
            fetchProfile(); // Refresh list
        } catch (error) {
            toast.error("Error al guardar dirección");
        } finally {
            setSavingAddress(false);
        }
    }

    function handleGetCurrentLocation() {
        if (!navigator.geolocation) {
            toast.error("Geolocalización no soportada por tu navegador");
            return;
        }

        setDetectingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
                    const data = await res.json();
                    if (data.display_name) {
                        setAddressForm(prev => ({ ...prev, direccion: data.display_name }));
                        toast.success("Ubicación detectada");
                    } else {
                        setAddressForm(prev => ({ ...prev, direccion: `${latitude}, ${longitude}` }));
                    }
                } catch (error) {
                    setAddressForm(prev => ({ ...prev, direccion: `${latitude}, ${longitude}` }));
                } finally {
                    setDetectingLocation(false);
                }
            },
            (error) => {
                toast.error("Error al obtener ubicación");
                setDetectingLocation(false);
            }
        );
    }

    const isPasswordDirty = passwordData.new_password &&
        passwordData.confirm_password &&
        passwordData.new_password === passwordData.confirm_password;

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
                        <div className="w-16 h-16 bg-[#4ADE80]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck className="w-8 h-8 text-[#22C55E]" />
                        </div>
                        <h1 className="text-2xl font-black text-[#111814]">
                            {authStep === 'phone' ? 'Bienvenido' : authStep === 'otp' ? 'Verifica tu número' : 'Recuperar PIN'}
                        </h1>
                        <p className="text-gray-500 font-medium">
                            {authStep === 'phone'
                                ? 'Ingresa tu celular y PIN para acceder.'
                                : authStep === 'otp'
                                    ? `Ingresa el código enviado al ${phone}`
                                    : `Sigue los pasos para recuperar tu acceso`
                            }
                        </p>
                    </div>

                    <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden">
                        <CardContent className="p-8">
                            {authStep === 'phone' ? (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (phone.length >= 4 && pin.length === 4) handleLoginPin(e);
                                        else if (phone.length < 4) toast.error("Código de usuario inválido");
                                        else toast.error("Ingresa tu PIN de 4 dígitos");
                                    }}
                                    className="space-y-6"
                                    autoComplete="off"
                                >
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <Input
                                                    type="tel"
                                                    placeholder="Celular"
                                                    className="h-12 rounded-xl bg-gray-50 border-gray-200 text-center font-bold text-lg"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    autoComplete="off"
                                                    name="p_user_login"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <Input
                                                    type="password"
                                                    placeholder="PIN"
                                                    maxLength={4}
                                                    className="h-12 rounded-xl bg-gray-50 border-gray-200 text-center text-2xl tracking-[0.5rem] font-bold"
                                                    value={pin}
                                                    onChange={(e) => setPin(e.target.value)}
                                                    autoComplete="new-password"
                                                    name="p_pin_login"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Button
                                            type="submit"
                                            className="w-full h-12 rounded-xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#111814] font-black text-base shadow-lg shadow-[#4ADE80]/20"
                                            disabled={submitting}
                                        >
                                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar con PIN"}
                                        </Button>

                                        <button
                                            type="button"
                                            onClick={handleGetRecovery}
                                            className="w-full text-xs font-bold text-gray-400 hover:text-[#22C55E] transition-colors"
                                        >
                                            ¿Olvidaste tu PIN?
                                        </button>
                                    </div>

                                    <p className="text-[10px] text-center text-gray-400 mt-4 leading-relaxed">
                                        ¿Primera vez? Usa los <b>últimos 4 dígitos</b> de tu celular como PIN inicial.
                                    </p>
                                </form>
                            ) : authStep === 'otp' ? (
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
                                        className="w-full h-12 rounded-xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#111814] font-black text-base shadow-lg shadow-[#4ADE80]/20"
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
                                        Atrás
                                    </Button>
                                </form>
                            ) : authStep === 'recovery' ? (
                                <form onSubmit={handleResetPin} className="space-y-6" autoComplete="off">
                                    <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Shield className="w-5 h-5 text-[#EAB308]" />
                                            <h3 className="font-black text-[#111814]">Recuperar Acceso</h3>
                                        </div>

                                        {recoveryInfo?.method === 'hint' ? (
                                            <div className="space-y-4">
                                                <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl">
                                                    <p className="text-xs font-bold text-yellow-800 uppercase mb-1">Tu Pista para el PIN:</p>
                                                    <p className="text-sm font-medium text-yellow-900 italic">"{recoveryInfo.hint}"</p>
                                                </div>
                                                <p className="text-xs text-center text-gray-500 font-medium">
                                                    Intenta recordar tu PIN con esta pista y vuelve al inicio.
                                                </p>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full h-11 rounded-xl border-gray-200 text-gray-700 font-bold"
                                                    onClick={() => setAuthStep('phone')}
                                                >
                                                    Entendido, volver a intentar
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold text-gray-500 uppercase">Pregunta de Seguridad:</p>
                                                    <p className="text-sm font-black text-[#111814]">{recoveryInfo?.question}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-gray-700">Tu Respuesta</Label>
                                                    <Input
                                                        placeholder="Respuesta..."
                                                        className="h-11 rounded-xl bg-white border-gray-200 font-medium"
                                                        value={recoveryAnswer}
                                                        onChange={e => setRecoveryAnswer(e.target.value)}
                                                        required
                                                        autoComplete="off"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-gray-700">Escribe un Nuevo PIN</Label>
                                                    <Input
                                                        type="password"
                                                        maxLength={4}
                                                        placeholder="PIN"
                                                        className="h-11 rounded-xl bg-white border-gray-200 text-center text-xl tracking-widest font-black"
                                                        value={newPin}
                                                        onChange={e => setNewPin(e.target.value)}
                                                        required
                                                        autoComplete="new-password"
                                                    />
                                                </div>
                                                <Button
                                                    type="submit"
                                                    className="w-full h-12 rounded-xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#111814] font-black"
                                                    disabled={submitting}
                                                >
                                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Cambiar PIN y Entrar"}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    className="w-full text-gray-500 font-bold text-sm"
                                                    onClick={() => setAuthStep('phone')}
                                                >
                                                    Cancelar
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </form>
                            ) : null}
                        </CardContent>
                    </Card>
                    <Button
                        variant="ghost"
                        onClick={() => navigate(`/${slug}/menu`)}
                        className="w-full text-gray-400 font-bold hover:text-[#111814]"
                    >
                        Volver al menú
                    </Button>
                </div>
            </div >
        );
    }

    // Profile View
    return (
        <div className="min-h-screen bg-gray-50/30 font-inter pb-20">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/${slug}/menu`)} className="rounded-full hover:bg-gray-100">
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

            <main className="max-w-4xl mx-auto p-4 space-y-8">
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

                            {/* Puntos Acumulados Integrated */}
                            <div className="flex flex-col items-center px-8 py-4 bg-[#4ADE80]/5 border-2 border-[#4ADE80]/30 rounded-2xl transition-all hover:border-[#4ADE80] hover:bg-[#4ADE80]/10 shrink-0">
                                <span className="text-4xl font-black text-[#22C55E]">{loyalty?.puntos_actuales || 0}</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Puntos Acumulados</span>
                            </div>

                            <Button
                                onClick={() => navigate(`/${slug}/mi-cuenta/editar`)}
                                className="rounded-xl px-6 bg-white border-2 border-[#4ADE80] text-[#22C55E] hover:bg-[#4ADE80] hover:text-[#111814] font-bold transition-all shadow-md active:scale-95"
                            >
                                Editar Perfil
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Direcciones - Horizontal Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-black text-[#111814] flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-[#22C55E]" />
                            Mis Direcciones
                        </h3>
                        <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="rounded-xl bg-[#4ADE80]/10 text-[#22C55E] hover:bg-[#4ADE80]/20 border-none font-bold gap-2">
                                    <Plus className="w-4 h-4" /> Nueva
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[2rem] max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black">Nueva Dirección</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSaveAddress} className="space-y-6 pt-4">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="font-bold">Nombre (Ej: Casa, Oficina)</Label>
                                            <Input
                                                placeholder="Mi Casa"
                                                value={addressForm.nombre}
                                                onChange={e => setAddressForm({ ...addressForm, nombre: e.target.value })}
                                                className="rounded-xl h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-bold">Dirección Completa</Label>
                                            <div className="relative">
                                                <Input
                                                    placeholder="Calle 123 #45-67..."
                                                    value={addressForm.direccion}
                                                    onChange={e => setAddressForm({ ...addressForm, direccion: e.target.value })}
                                                    className="rounded-xl h-11 pr-12"
                                                />
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg text-[#22C55E] hover:bg-green-50"
                                                    onClick={handleGetCurrentLocation}
                                                    disabled={detectingLocation}
                                                >
                                                    {detectingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-medium ml-1">Usa el ícono de GPS para autocompletar</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="flex-1 rounded-xl h-12 font-bold"
                                            onClick={() => setShowAddressModal(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={savingAddress}
                                            className="flex-1 rounded-xl h-12 bg-[#4ADE80] hover:bg-[#22C55E] text-[#111814] font-black"
                                        >
                                            {savingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar"}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {addresses.length === 0 ? (
                            <div className="col-span-full border-2 border-dashed border-[#4ADE80]/15 rounded-[1.5rem] bg-[#4ADE80]/5 py-12 text-center text-gray-500 font-medium">
                                No hay direcciones guardadas
                            </div>
                        ) : (
                            addresses.map((addr) => (
                                <Card key={addr.id} className="border-none shadow-sm hover:shadow-md transition-shadow rounded-[1.5rem] overflow-hidden group">
                                    <CardContent className="p-5 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                                            <Home className="w-5 h-5 text-[#22C55E]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="font-bold text-[#111814] text-sm truncate">{addr.nombre}</h4>
                                                {addr.es_principal && (
                                                    <Badge className="h-4 text-[9px] px-1.5 bg-[#4ADE80]/20 text-[#111814] hover:bg-[#4ADE80]/30 border-none shadow-none uppercase font-bold">
                                                        Principal
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 font-medium leading-relaxed truncate">{addr.direccion}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Favorites Section Moved Up */}
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-lg font-black text-[#111814] flex items-center gap-2">
                                <Heart className="w-5 h-5 text-[#22C55E]" />
                                Mis Favoritos
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {favorites.length === 0 ? (
                                <Card className="col-span-full border-2 border-[#4ADE80]/10 border-dashed rounded-[1.5rem] bg-green-50/5">
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

                    {/* Recent Orders Section Moved Down */}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {orders.filter(o => !hiddenOrderIds.includes(o.id)).length === 0 ? (
                                <Card className="col-span-full border-none shadow-sm rounded-[1.5rem] bg-gray-50/50">
                                    <CardContent className="p-8 text-center text-gray-500 font-medium">
                                        No tienes pedidos recientes
                                    </CardContent>
                                </Card>
                            ) : (
                                orders.filter(o => !hiddenOrderIds.includes(o.id)).map((order) => (
                                    <Card key={order.id} className="border-none shadow-sm hover:shadow-md transition-shadow rounded-[1.5rem] overflow-hidden group cursor-pointer" onClick={() => navigate(`/${order.negocio_slug || slug}/mis-pedidos?order=${order.id}`)}>
                                        <CardContent className="p-6">
                                            <div className="flex gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0">
                                                    {order.negocio_logo ? (
                                                        <img src={order.negocio_logo} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                                                    ) : (
                                                        <Package className="w-6 h-6 text-gray-400" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
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

                                                    <p className="text-sm text-gray-500 mt-1 truncate">
                                                        {order.negocio_nombre || 'Restaurante'} • {order.items?.length || 0} items • <span className="text-gray-900 font-bold ml-1">${order.total?.toLocaleString()}</span>
                                                    </p>

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
                                                                onClick={(e) => { e.stopPropagation(); navigate(`/${order.negocio_slug || slug}/menu`); }}
                                                            >
                                                                Volver a pedir
                                                            </button>
                                                        )}
                                                        {['entregado', 'cancelado'].includes(order.estado) && (
                                                            <button
                                                                className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors flex items-center gap-1.5 ml-auto border border-red-100 px-2.5 py-1 rounded-lg hover:bg-red-50"
                                                                onClick={(e) => { e.stopPropagation(); handleHideOrder(order.id); }}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                Eliminar
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

                    <div className="space-y-4 pt-4">
                        <div className="px-2">
                            <h3 className="text-lg font-black text-[#111814] flex items-center gap-2">
                                <Shield className="w-5 h-5 text-[#EAB308]" />
                                Seguridad
                            </h3>
                        </div>
                        <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
                            <CardContent className="p-8">
                                <div className="space-y-6">
                                    <div className="pb-6 border-b border-gray-100">
                                        <h4 className="font-bold text-gray-900 mb-2">PIN de Acceso Rápido</h4>
                                        <p className="text-sm text-gray-500 font-medium mb-4">
                                            Establece un PIN de 4 dígitos para entrar a tu cuenta sin esperar el código de WhatsApp.
                                            Te recomendamos usar los primeros o últimos 4 dígitos de tu celular.
                                        </p>
                                        <form onSubmit={async (e) => {
                                            e.preventDefault();
                                            const pinVal = e.target.pin.value;
                                            if (pinVal.length !== 4) return toast.error("El PIN debe tener 4 dígitos");
                                            if (recoveryMethod === 'question' && (!securityQuestion || !securityAnswer)) {
                                                return toast.error("Configura la pregunta y respuesta de seguridad");
                                            }
                                            if (recoveryMethod === 'hint' && !pinHint) {
                                                return toast.error("Escribe una pista para tu PIN");
                                            }

                                            setSubmitting(true);
                                            try {
                                                const api = axios.create({
                                                    baseURL: (import.meta.env && import.meta.env.REACT_APP_BACKEND_URL) || '/api',
                                                    headers: { Authorization: `Bearer ${token}` }
                                                });
                                                await api.post('/client/update-pin', {
                                                    pin: pinVal,
                                                    recovery_method: recoveryMethod,
                                                    pin_hint: pinHint,
                                                    security_question: securityQuestion,
                                                    security_answer: securityAnswer
                                                });
                                                toast.success("PIN y método de recuperación guardados");
                                                e.target.reset();
                                            } catch (err) {
                                                toast.error("Error al guardar configuración");
                                            } finally {
                                                setSubmitting(false);
                                            }
                                        }} className="space-y-4">
                                            <div className="flex flex-col sm:flex-row gap-4 items-end">
                                                <div className="space-y-1 w-full sm:w-32">
                                                    <Label className="text-xs font-bold text-gray-500">Nuevo PIN</Label>
                                                    <Input
                                                        name="pin"
                                                        type="password"
                                                        maxLength={4}
                                                        placeholder="••••"
                                                        className="h-12 rounded-xl bg-gray-50 border-gray-200 font-bold text-center text-xl tracking-widest w-full"
                                                        required
                                                    />
                                                </div>
                                                <Button
                                                    type="submit"
                                                    disabled={submitting}
                                                    className="bg-[#4ADE80] hover:bg-[#22C55E] text-[#111814] font-black h-12 rounded-xl px-8 flex-1 sm:flex-none"
                                                >
                                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar PIN y Seguridad"}
                                                </Button>
                                            </div>

                                            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
                                                <Label className="font-bold text-gray-700">Método de recuperación</Label>
                                                <div className="flex gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setRecoveryMethod('hint')}
                                                        className={`flex-1 p-3 rounded-xl border-2 transition-all text-sm font-bold ${recoveryMethod === 'hint' ? 'border-[#4ADE80] bg-white text-[#111814]' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                                                    >
                                                        Pista (Hint)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRecoveryMethod('question')}
                                                        className={`flex-1 p-3 rounded-xl border-2 transition-all text-sm font-bold ${recoveryMethod === 'question' ? 'border-[#4ADE80] bg-white text-[#111814]' : 'border-gray-100 bg-gray-50 text-gray-400'}`}
                                                    >
                                                        Pregunta Secreta
                                                    </button>
                                                </div>

                                                {recoveryMethod === 'hint' ? (
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold text-gray-500">Pista para recordar tu PIN</Label>
                                                        <Input
                                                            placeholder="Ej: Últimos 4 del cel, año especial..."
                                                            className="h-11 rounded-xl bg-white border-gray-200 text-sm"
                                                            value={pinHint}
                                                            onChange={e => setPinHint(e.target.value)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-bold text-gray-500">Elige tu pregunta</Label>
                                                            <select
                                                                className="w-full h-11 rounded-xl bg-white border border-gray-200 px-4 text-sm font-medium focus:ring-[#4ADE80] focus:border-[#4ADE80]"
                                                                value={securityQuestion}
                                                                onChange={e => setSecurityQuestion(e.target.value)}
                                                            >
                                                                <option value="">Selecciona una pregunta...</option>
                                                                <option value="¿Nombre de tu primera mascota?">¿Nombre de tu primera mascota?</option>
                                                                <option value="¿Ciudad donde naciste?">¿Ciudad donde naciste?</option>
                                                                <option value="¿Nombre de tu escuela primaria?">¿Nombre de tu escuela primaria?</option>
                                                                <option value="¿Marca de tu primer auto?">¿Marca de tu primer auto?</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-xs font-bold text-gray-500">Tu Respuesta</Label>
                                                            <Input
                                                                placeholder="Escribe la respuesta..."
                                                                className="h-11 rounded-xl bg-white border-gray-200 text-sm"
                                                                value={securityAnswer}
                                                                onChange={e => setSecurityAnswer(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </form>
                                    </div>

                                    <form onSubmit={handleChangePassword} className="space-y-5 pt-2">
                                        <p className="text-sm text-gray-500 font-medium mb-4">
                                            Si deseas establecer una contraseña para tu cuenta, o cambiar la actual, ingresa los detalles abajo.
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <Label className="font-bold text-gray-700">Contraseña Actual (si ya tienes una)</Label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <Input
                                                        type={showOldPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        className="pl-11 pr-11 h-12 rounded-xl bg-gray-50 border-gray-200"
                                                        value={passwordData.old_password}
                                                        onChange={e => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                                                        onClick={() => setShowOldPassword(!showOldPassword)}
                                                    >
                                                        {showOldPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="font-bold text-gray-700">Nueva Contraseña</Label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <Input
                                                        type={showNewPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        className="pl-11 pr-11 h-12 rounded-xl bg-gray-50 border-gray-200"
                                                        value={passwordData.new_password}
                                                        onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                    >
                                                        {showNewPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <Label className="font-bold text-gray-700">Confirmar Nueva Contraseña</Label>
                                                <div className="relative">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <Input
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        className="pl-11 pr-11 h-12 rounded-xl bg-gray-50 border-gray-200"
                                                        value={passwordData.confirm_password}
                                                        onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <Button
                                                type="submit"
                                                disabled={changingPassword}
                                                className={`w-full md:w-auto px-10 h-12 rounded-2xl font-black transition-all border-2 border-[#4ADE80] flex items-center justify-center gap-2 ${isPasswordDirty
                                                    ? 'bg-[#4ADE80] text-[#111814] hover:bg-[#22C55E]'
                                                    : 'bg-white text-[#22C55E] hover:bg-green-50'
                                                    }`}
                                            >
                                                {changingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-4 h-4" />}
                                                {changingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
