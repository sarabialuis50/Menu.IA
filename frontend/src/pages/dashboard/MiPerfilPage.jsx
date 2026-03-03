import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import {
    Building2,
    MapPin,
    Phone,
    Clock,
    ExternalLink,
    QrCode,
    Share2,
    Globe,
    Camera,
    CheckCircle2,
    Utensils,
    Image as ImageIcon,
    Save,
    Eye,
    ArrowUpRight,
    Loader2,
    Upload,
    Power,
    Store,
    Shield,
    Lock,
    Instagram,
    Facebook
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function MiPerfilPage() {
    const { slug } = useParams();
    const { user, api } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [businessData, setBusinessData] = useState({
        nombre: '',
        descripcion: '',
        direccion: '',
        telefono: '',
        horarios: {
            semana: '12:00 PM - 10:00 PM',
            sabado: '12:00 PM - 11:00 PM',
            domingos: '12:00 PM - 9:00 PM'
        },
        banner_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&q=80',
        logo_url: '',
        subdominio: slug,
        slogan: '',
        abierto: true,
        whatsapp: '',
        instagram_url: '',
        facebook_url: '',
        tiktok_url: ''
    });

    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [changingPassword, setChangingPassword] = useState(false);

    const isPasswordDirty = passwordData.old_password || passwordData.new_password || passwordData.confirm_password;

    const handleImageUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecciona una imagen válida');
            return;
        }

        if (type === 'logo') setUploadingLogo(true);
        else setUploadingBanner(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api().post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const url = response.data.url;
            setBusinessData(prev => ({
                ...prev,
                [type === 'logo' ? 'logo_url' : 'banner_url']: url
            }));
            toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} actualizado correctamente`);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Error al subir la imagen');
        } finally {
            if (type === 'logo') setUploadingLogo(false);
            else setUploadingBanner(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const fetchBusiness = async () => {
            if (!slug) return;
            try {
                const response = await api().get(`/business/${slug}`);
                if (!isMounted) return;

                let parsedHorarios = { semana: '', sabado: '', domingos: '' };
                if (response.data.horarios) {
                    const h = response.data.horarios;
                    if (typeof h === 'string' && h.trim().startsWith('{')) {
                        try {
                            const obj = JSON.parse(h);
                            parsedHorarios = {
                                semana: obj.semana || obj.week || '',
                                sabado: obj.sabado || obj.saturday || '',
                                domingos: obj.domingos || obj.sunday || obj.fines || obj.weekend || ''
                            };
                        } catch (e) {
                            parsedHorarios = { semana: h, sabado: '', domingos: '' };
                        }
                    } else if (typeof h === 'object') {
                        parsedHorarios = {
                            semana: h.semana || h.week || '',
                            sabado: h.sabado || h.saturday || '',
                            domingos: h.domingos || h.sunday || h.fines || h.weekend || ''
                        };
                    } else {
                        parsedHorarios = { semana: String(h), sabado: '', domingos: '' };
                    }
                }

                setBusinessData(prev => ({
                    ...prev,
                    ...response.data,
                    horarios: parsedHorarios,
                    subdominio: slug
                }));
            } catch (error) {
                console.error('Error fetching business:', error);
                if (isMounted) toast.error('Error al cargar la información del negocio');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchBusiness();
        return () => { isMounted = false; };
    }, [slug, api]);

    const [detecting, setDetecting] = useState(false);

    const detectLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Tu navegador no soporta geolocalización');
            return;
        }

        setDetecting(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    // Reverse geocoding using Nominatim (free)
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
                    );
                    const data = await response.json();
                    if (data.display_name) {
                        setBusinessData(prev => ({ ...prev, direccion: data.display_name }));
                        toast.success('Ubicación detectada correctamente');
                    }
                } catch (error) {
                    console.error('Error in reverse geocoding:', error);
                    toast.error('No se pudo obtener la dirección exacta, por favor ingrésala manualmente');
                } finally {
                    setDetecting(false);
                }
            },
            (error) => {
                setDetecting(false);
                console.error('Error getting location:', error);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        toast.error('Permiso denegado. Por favor, permite el acceso al GPS en tu navegador.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        toast.error('Ubicación no disponible. Intenta ingresarla manualmente.');
                        break;
                    case error.TIMEOUT:
                        toast.error('Tiempo de espera agotado al buscar ubicación.');
                        break;
                    default:
                        toast.error('Error desconocido al detectar ubicación.');
                }
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            await api().put(`/business/${slug}`, businessData);
            toast.success('Perfil actualizado correctamente');
        } catch (error) {
            toast.error('Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!passwordData.old_password || !passwordData.new_password) {
            toast.error('Por favor completa todos los campos');
            return;
        }
        if (passwordData.new_password !== passwordData.confirm_password) {
            toast.error('Las contraseñas no coinciden');
            return;
        }
        setChangingPassword(true);
        try {
            await api().post('/auth/change-password', {
                old_password: passwordData.old_password,
                new_password: passwordData.new_password
            });
            toast.success('Contraseña actualizada correctamente');
            setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al cambiar la contraseña');
        } finally {
            setChangingPassword(false);
        }
    };

    const previewUrl = `/${slug}/menu`;
    const baseUrl = window.location.origin;

    const downloadQR = () => {
        const svg = document.getElementById('business-qr-code');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = 400;
            canvas.height = 500;

            // White background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw QR
            ctx.drawImage(img, 50, 50, 300, 300);

            // Add text
            ctx.fillStyle = '#111814';
            ctx.font = 'bold 24px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(businessData.nombre || 'Mi Negocio', canvas.width / 2, 400);

            ctx.font = '16px Inter, sans-serif';
            ctx.fillStyle = '#618972';
            ctx.fillText('Escanea para ver el catálogo', canvas.width / 2, 430);

            // Download
            const link = document.createElement('a');
            link.download = `${slug}-qr.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22C55E]" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[#22C55E] font-bold text-sm uppercase tracking-widest">
                            <span className="w-8 h-[2px] bg-[#4ADE80]"></span>
                            Configuración de Marca
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-[#111814] tracking-tighter">Mi Perfil Público</h1>
                        <p className="text-[#618972] font-medium text-sm md:text-base">Personaliza cómo los clientes experimentan tu marca online.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:flex gap-3 w-full md:w-auto">
                        <Button variant="outline" asChild className="rounded-2xl h-12 px-6 border-gray-200 hover:bg-gray-50 text-[#111814] font-bold gap-2 w-full md:w-auto flex justify-center">
                            <Link to={`/${slug}`}>
                                <Eye className="w-4 h-4" />
                                Ver Perfil
                                <ArrowUpRight className="w-4 h-4 opacity-50" />
                            </Link>
                        </Button>
                        <Button
                            className="rounded-2xl h-12 px-8 bg-[#4ADE80] hover:bg-[#22C55E] text-[#111814] font-bold gap-2 shadow-lg shadow-[#4ADE80]/20 w-full md:w-auto"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Guardando...' : 'Publicar Cambios'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Editor */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Visual Identity Card */}
                        <Card className="border-none shadow-sm overflow-hidden rounded-[2.5rem] bg-white">
                            <div className="relative h-64 bg-gray-100">
                                <img
                                    src={businessData.banner_url}
                                    alt="Banner Preview"
                                    className="w-full h-full object-cover"
                                />
                                <div
                                    className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-colors flex items-center justify-center group cursor-pointer"
                                    onClick={() => !uploadingBanner && document.getElementById('banner-upload').click()}
                                >
                                    <input
                                        type="file"
                                        id="banner-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, 'banner')}
                                    />
                                    <div className="bg-white/90 px-4 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 flex items-center gap-2 font-bold text-sm text-[#111814]">
                                        {uploadingBanner ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-[#22C55E]" />
                                        ) : (
                                            <Upload className="w-4 h-4 text-[#22C55E]" />
                                        )}
                                        {uploadingBanner ? 'Subiendo...' : 'Cambiar Banner'}
                                    </div>
                                </div>
                                <div className="absolute -bottom-12 left-10">
                                    <div
                                        className="relative w-32 h-32 rounded-full bg-white p-1 shadow-2xl overflow-hidden group cursor-pointer"
                                        onClick={() => !uploadingLogo && document.getElementById('logo-upload').click()}
                                    >
                                        <input
                                            type="file"
                                            id="logo-upload"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'logo')}
                                        />
                                        <img
                                            src={businessData.logo_url || `https://ui-avatars.com/api/?name=${businessData.nombre}&background=13ec6d&color=111814&bold=true`}
                                            alt="Logo Preview"
                                            className="w-full h-full object-cover rounded-full border-2 border-gray-50"
                                        />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            {uploadingLogo ? (
                                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                                            ) : (
                                                <Camera className="w-6 h-6 text-white" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <CardContent className="pt-20 pb-10 px-10 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2.5">
                                        <Label className="text-[#111814] font-bold ml-1">Nombre Comercial</Label>
                                        <Input
                                            value={businessData.nombre}
                                            onChange={e => setBusinessData({ ...businessData, nombre: e.target.value })}
                                            className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#22C55E]/20 transition-all font-medium"
                                            placeholder="Nombre de tu negocio"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-[#111814] font-bold ml-1">Eslogan de Marca</Label>
                                        <Input
                                            placeholder="Ej: Sabor auténtico en cada rebanada"
                                            value={businessData.slogan || ''}
                                            onChange={e => setBusinessData({ ...businessData, slogan: e.target.value })}
                                            className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#22C55E]/20 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <Label className="text-[#111814] font-bold ml-1">Descripción del Negocio</Label>
                                    <Textarea
                                        rows={4}
                                        value={businessData.descripcion || ''}
                                        onChange={e => setBusinessData({ ...businessData, descripcion: e.target.value })}
                                        className="rounded-3xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#22C55E]/20 transition-all font-medium leading-relaxed"
                                        placeholder="Cuéntales a tus clientes tu historia..."
                                    />
                                </div>
                            </CardContent>
                        </Card>


                        {/* Social Media Card */}
                        <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
                            <CardHeader className="px-10 pt-10 pb-2">
                                <CardTitle className="text-xl font-bold flex items-center gap-3">
                                    <div className="p-2 bg-[#4ADE80]/10 rounded-xl">
                                        <Share2 className="w-5 h-5 text-[#22C55E]" />
                                    </div>
                                    Redes Sociales
                                </CardTitle>
                                <CardDescription className="ml-13">Configura los enlaces a tus perfiles oficiales.</CardDescription>
                            </CardHeader>
                            <CardContent className="px-10 pb-10 pt-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2.5">
                                        <Label className="text-[#111814] font-bold ml-1 flex items-center gap-2">
                                            <div className="w-5 h-5 flex items-center justify-center text-[#25D366]">
                                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                </svg>
                                            </div>
                                            WhatsApp Business (10 dígitos)
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                maxLength={10}
                                                className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium"
                                                value={businessData.whatsapp || ''}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setBusinessData({ ...businessData, whatsapp: val });
                                                }}
                                                placeholder="3128833350"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-[#111814] font-bold ml-1 flex items-center gap-2">
                                            <Instagram className="w-5 h-5 text-pink-600" />
                                            Instagram URL
                                        </Label>
                                        <Input
                                            className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium"
                                            value={businessData.instagram_url || ''}
                                            onChange={e => setBusinessData({ ...businessData, instagram_url: e.target.value })}
                                            placeholder="https://instagram.com/tunegocio"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-[#111814] font-bold ml-1 flex items-center gap-2">
                                            <Facebook className="w-5 h-5 text-blue-700" />
                                            Facebook URL
                                        </Label>
                                        <Input
                                            className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium"
                                            value={businessData.facebook_url || ''}
                                            onChange={e => setBusinessData({ ...businessData, facebook_url: e.target.value })}
                                            placeholder="https://facebook.com/tunegocio"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-[#111814] font-bold ml-1 flex items-center gap-2">
                                            <div className="w-5 h-5 flex items-center justify-center text-slate-900">
                                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-1.13-.31-2.34-.25-3.41.33-.71.38-1.27 1.03-1.51 1.8-.31.82-.28 1.73.08 2.51.26.6.68 1.14 1.22 1.51.51.35 1.12.53 1.74.54 1.14.03 2.25-.51 2.91-1.44.27-.41.43-.88.46-1.37.07-2.17.03-4.35.05-6.52.02-3.13.01-6.25.03-9.37z" />
                                                </svg>
                                            </div>
                                            TikTok URL
                                        </Label>
                                        <Input
                                            className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium"
                                            value={businessData.tiktok_url || ''}
                                            onChange={e => setBusinessData({ ...businessData, tiktok_url: e.target.value })}
                                            placeholder="https://tiktok.com/@tunegocio"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Contact Info Card */}
                        <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
                            <CardHeader className="px-10 pt-10 pb-2">
                                <CardTitle className="text-xl font-bold flex items-center gap-3">
                                    <div className="p-2 bg-[#4ADE80]/10 rounded-xl">
                                        <MapPin className="w-5 h-5 text-[#22C55E]" />
                                    </div>
                                    Ubicación y Contacto
                                </CardTitle>
                                <CardDescription className="ml-13">Estos datos serán públicos para que tus clientes te encuentren.</CardDescription>
                            </CardHeader>
                            <CardContent className="px-10 pb-10 pt-6 space-y-6">
                                <div className="space-y-6">
                                    <div className="space-y-2.5">
                                        <Label className="text-[#111814] font-bold ml-1">Dirección Física</Label>
                                        <div className="relative group/input">
                                            <button
                                                onClick={detectLocation}
                                                disabled={detecting}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[#4ADE80]/10 text-[#618972] hover:text-[#22C55E] transition-colors z-10 disabled:opacity-50"
                                                title="Detectar mi ubicación actual"
                                            >
                                                {detecting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <MapPin className="w-4 h-4" />
                                                )}
                                            </button>
                                            <Input
                                                className="pl-11 h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#22C55E]/20 transition-all font-medium w-full"
                                                value={businessData.direccion || ''}
                                                onChange={e => setBusinessData({ ...businessData, direccion: e.target.value })}
                                                placeholder="Calle 123 #45-67, Ciudad"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-[#111814] font-bold ml-1">WhatsApp de Pedidos</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#618972]" />
                                            <Input
                                                className="pl-11 h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#22C55E]/20 transition-all font-medium w-full"
                                                value={businessData.telefono || ''}
                                                onChange={e => setBusinessData({ ...businessData, telefono: e.target.value })}
                                                placeholder="+57 300 123 4567"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 pt-4 border-t border-gray-50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2.5">
                                            <Label className="text-[#111814] font-bold ml-1 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-[#22C55E]" />
                                                Lunes a Viernes
                                            </Label>
                                            <Input
                                                value={businessData.horarios?.semana || ''}
                                                onChange={e => setBusinessData({
                                                    ...businessData,
                                                    horarios: { ...businessData.horarios, semana: e.target.value }
                                                })}
                                                className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium"
                                                placeholder="Ej: 12:00 PM - 10:00 PM"
                                            />
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label className="text-[#111814] font-bold ml-1 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-[#22C55E]" />
                                                Sábados
                                            </Label>
                                            <Input
                                                value={businessData.horarios?.sabado || ''}
                                                onChange={e => setBusinessData({
                                                    ...businessData,
                                                    horarios: { ...businessData.horarios, sabado: e.target.value }
                                                })}
                                                className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium"
                                                placeholder="Ej: 12:00 PM - 11:00 PM"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-[#111814] font-bold ml-1 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-[#22C55E]" />
                                            Domingos y Festivos
                                        </Label>
                                        <Input
                                            value={businessData.horarios?.domingos || ''}
                                            onChange={e => setBusinessData({
                                                ...businessData,
                                                horarios: { ...businessData.horarios, domingos: e.target.value }
                                            })}
                                            className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium w-full"
                                            placeholder="Ej: 12:00 PM - 9:00 PM"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Map Card - Horizontal Format */}
                        <Card className="border-none shadow-sm rounded-[2.5rem] bg-gray-100 overflow-hidden h-[300px] relative group">
                            <iframe
                                title="Ubicación del Negocio"
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(businessData.direccion || 'Colombia')}&output=embed&hl=es`}
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                className="opacity-90 group-hover:opacity-100 transition-all duration-500"
                            ></iframe>
                            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg pointer-events-none">
                                <p className="text-sm font-bold text-[#111814] flex items-center gap-2 truncate">
                                    <MapPin className="w-4 h-4 text-[#22C55E] shrink-0" />
                                    {businessData.direccion || 'Ubicación Exacta'}
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar / Tools */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Business Status Card */}
                        <Card className={`border-none shadow-lg rounded-[2.5rem] overflow-hidden transition-all duration-500 ${businessData.abierto ? 'bg-white' : 'bg-red-50'}`}>
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-lg font-black flex items-center gap-3">
                                    <div className={`p-2 rounded-xl transition-colors ${businessData.abierto ? 'bg-[#4ADE80]/10 text-[#22C55E]' : 'bg-red-100 text-red-600'}`}>
                                        <Power className="w-5 h-5" />
                                    </div>
                                    Estado del Negocio
                                </CardTitle>
                                <CardDescription className="font-medium">
                                    Controla si tu negocio está recibiendo pedidos en este momento.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="px-8 pb-8">
                                <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${businessData.abierto
                                    ? 'bg-[#4ADE80]/5 border-[#4ADE80]/20'
                                    : 'bg-red-100/50 border-red-200'
                                    }`}>
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-black uppercase tracking-wider ${businessData.abierto ? 'text-[#22C55E]' : 'text-red-600'}`}>
                                            {businessData.abierto ? 'Abierto' : 'Cerrado'}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-500">
                                            {businessData.abierto ? 'Recibiendo pedidos' : 'No se aceptan pedidos'}
                                        </span>
                                    </div>
                                    <Switch
                                        checked={businessData.abierto}
                                        onCheckedChange={(checked) => {
                                            setBusinessData({ ...businessData, abierto: checked });
                                            // Optional: auto-save for this specific field
                                            api().put(`/business/${slug}`, { ...businessData, abierto: checked });
                                            toast.success(checked ? 'Negocio Abierto' : 'Negocio Cerrado');
                                        }}
                                        className={`${businessData.abierto ? 'data-[state=checked]:bg-[#22C55E]' : 'data-[state=unchecked]:bg-gray-200'}`}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* URL / Share Card */}
                        <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-[#22C55E]" />
                                    Tu Sitio Web
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-8 pb-8 space-y-6">
                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-[#618972] uppercase tracking-widest">Enlace Directo</span>
                                        <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            readOnly
                                            value={`menuia.co/${slug}`}
                                            className="h-10 bg-white border-dashed rounded-xl text-xs font-mono text-[#111814]"
                                        />
                                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white" onClick={() => {
                                            navigator.clipboard.writeText(`https://menuia.co/${slug}`);
                                            toast.success('Link copiado');
                                        }}>
                                            <Share2 className="w-4 h-4 text-[#22C55E]" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#618972]">
                                        <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                                        Subdominio personalizado activo
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#618972]">
                                        <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                                        Certificado SSL (Sitio Seguro)
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* QR Code Action */}
                        <Card className="border border-gray-100 shadow-xl rounded-[2.5rem] bg-white overflow-hidden relative group hover:shadow-2xl hover:border-[#22C55E]/20 transition-all duration-500">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#4ADE80]/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-[#4ADE80]/10 transition-all duration-500"></div>
                            <CardContent className="p-8 flex flex-col items-center text-center space-y-6 relative z-10">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight text-gray-900">Código QR del Catálogo</h3>
                                    <p className="text-gray-500 text-sm mt-1 font-medium">Imprímelo para que tus clientes accedan instantáneamente.</p>
                                </div>
                                <div className="w-full aspect-square max-w-[240px] bg-white rounded-[2rem] p-4 flex items-center justify-center border-2 border-dashed border-gray-200 group-hover:border-[#22C55E] transition-colors duration-500">
                                    <QRCodeSVG
                                        id="business-qr-code"
                                        value={`${baseUrl}/${slug}/menu`}
                                        size={200}
                                        level="H"
                                        includeMargin={false}
                                        className="w-full h-full"
                                    />
                                </div>
                                <Button
                                    onClick={downloadQR}
                                    className="w-full h-12 rounded-2xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#111814] font-black shadow-lg shadow-[#4ADE80]/20 transition-all duration-300"
                                >
                                    Descargar QR
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Vertical Security Section */}
                        <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-lg font-bold flex items-center gap-3">
                                    <div className="p-2 bg-[#FACC15]/10 rounded-xl">
                                        <Shield className="w-5 h-5 text-[#EAB308]" />
                                    </div>
                                    Seguridad y Contraseña
                                </CardTitle>
                                <CardDescription className="text-xs font-medium">Actualiza tu acceso para mantener la cuenta segura.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 pt-2">
                                <form onSubmit={handleChangePassword} className="space-y-5">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-[#111814] font-bold ml-1 text-xs">Contraseña Actual</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input
                                                    type="password"
                                                    value={passwordData.old_password}
                                                    onChange={e => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                                    className="pl-11 h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all text-sm"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[#111814] font-bold ml-1 text-xs">Nueva Contraseña</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input
                                                    type="password"
                                                    value={passwordData.new_password}
                                                    onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                                    className="pl-11 h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all text-sm"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[#111814] font-bold ml-1 text-xs">Confirmar Nueva</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input
                                                    type="password"
                                                    value={passwordData.confirm_password}
                                                    onChange={e => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                                    className="pl-11 h-11 rounded-xl border-gray-100 bg-gray-50 focus:bg-white transition-all text-sm"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={changingPassword}
                                        className={`w-full rounded-2xl h-12 font-black transition-all border-2 border-[#4ADE80] flex items-center justify-center gap-2 ${isPasswordDirty
                                            ? 'bg-[#4ADE80] text-[#111814] hover:bg-[#22C55E]'
                                            : 'bg-white text-[#22C55E] hover:bg-green-50'
                                            }`}
                                    >
                                        {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                                        {changingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div >
            </div >
        </DashboardLayout >
    );
}
