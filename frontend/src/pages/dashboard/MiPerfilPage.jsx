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
    Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        slogan: ''
    });

    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

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
        const fetchBusiness = async () => {
            try {
                const response = await api().get(`/business/${slug}`);
                let parsedHorarios = { semana: '', fines: '' };

                if (response.data.horarios) {
                    if (typeof response.data.horarios === 'string') {
                        if (response.data.horarios.trim().startsWith('{')) {
                            try {
                                const obj = JSON.parse(response.data.horarios);
                                parsedHorarios = {
                                    semana: obj.semana || obj.week || '',
                                    sabado: obj.sabado || obj.saturday || '',
                                    domingos: obj.domingos || obj.sunday || obj.fines || obj.weekend || ''
                                };
                            } catch (e) {
                                parsedHorarios = { semana: response.data.horarios, sabado: '', domingos: '' };
                            }
                        } else {
                            parsedHorarios = { semana: response.data.horarios, sabado: '', domingos: '' };
                        }
                    } else if (typeof response.data.horarios === 'object') {
                        parsedHorarios = {
                            semana: response.data.horarios.semana || response.data.horarios.week || '',
                            sabado: response.data.horarios.sabado || response.data.horarios.saturday || '',
                            domingos: response.data.horarios.domingos || response.data.horarios.sunday || response.data.horarios.fines || response.data.horarios.weekend || ''
                        };
                    }
                }

                setBusinessData({
                    ...businessData,
                    ...response.data,
                    horarios: parsedHorarios,
                    subdominio: slug
                });
            } catch (error) {
                console.error('Error fetching business:', error);
                toast.error('Error al cargar la información del negocio');
            } finally {
                setLoading(false);
            }
        };
        fetchBusiness();
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

    const previewUrl = `/${slug}/menu-completo`;
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
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#13ec6d]" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[#13ec6d] font-bold text-sm uppercase tracking-widest">
                            <span className="w-8 h-[2px] bg-[#13ec6d]"></span>
                            Configuración de Marca
                        </div>
                        <h1 className="text-4xl font-black text-[#111814] tracking-tighter">Mi Perfil Público</h1>
                        <p className="text-[#618972] font-medium">Personaliza cómo los clientes experimentan tu marca online.</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" asChild className="rounded-2xl h-12 px-6 border-gray-200 hover:bg-gray-50 text-[#111814] font-bold gap-2">
                            <Link to={`/${slug}`}>
                                <Eye className="w-4 h-4" />
                                Ver Perfil
                                <ArrowUpRight className="w-4 h-4 opacity-50" />
                            </Link>
                        </Button>
                        <Button
                            className="rounded-2xl h-12 px-8 bg-[#13ec6d] hover:bg-[#0fd660] text-[#111814] font-bold gap-2 shadow-lg shadow-[#13ec6d]/20"
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
                                            <Loader2 className="w-4 h-4 animate-spin text-[#13ec6d]" />
                                        ) : (
                                            <Upload className="w-4 h-4 text-[#13ec6d]" />
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
                                            className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#13ec6d]/20 transition-all font-medium"
                                            placeholder="Nombre de tu negocio"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <Label className="text-[#111814] font-bold ml-1">Eslogan de Marca</Label>
                                        <Input
                                            placeholder="Ej: Sabor auténtico en cada rebanada"
                                            value={businessData.slogan || ''}
                                            onChange={e => setBusinessData({ ...businessData, slogan: e.target.value })}
                                            className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#13ec6d]/20 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <Label className="text-[#111814] font-bold ml-1">Descripción del Negocio</Label>
                                    <Textarea
                                        rows={4}
                                        value={businessData.descripcion || ''}
                                        onChange={e => setBusinessData({ ...businessData, descripcion: e.target.value })}
                                        className="rounded-3xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#13ec6d]/20 transition-all font-medium leading-relaxed"
                                        placeholder="Cuéntales a tus clientes tu historia..."
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Contact Info Card */}
                        <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
                            <CardHeader className="px-10 pt-10 pb-2">
                                <CardTitle className="text-xl font-bold flex items-center gap-3">
                                    <div className="p-2 bg-[#13ec6d]/10 rounded-xl">
                                        <MapPin className="w-5 h-5 text-[#13ec6d]" />
                                    </div>
                                    Ubicación y Contacto
                                </CardTitle>
                                <CardDescription className="ml-13">Estos datos serán públicos para que tus clientes te encuentren.</CardDescription>
                            </CardHeader>
                            <CardContent className="px-10 pb-10 pt-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2.5">
                                        <Label className="text-[#111814] font-bold ml-1">Dirección Física</Label>
                                        <div className="relative group/input">
                                            <button
                                                onClick={detectLocation}
                                                disabled={detecting}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-[#13ec6d]/10 text-[#618972] hover:text-[#13ec6d] transition-colors z-10 disabled:opacity-50"
                                                title="Detectar mi ubicación actual"
                                            >
                                                {detecting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <MapPin className="w-4 h-4" />
                                                )}
                                            </button>
                                            <Input
                                                className="pl-11 h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#13ec6d]/20 transition-all font-medium"
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
                                                className="pl-11 h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#13ec6d]/20 transition-all font-medium"
                                                value={businessData.telefono || ''}
                                                onChange={e => setBusinessData({ ...businessData, telefono: e.target.value })}
                                                placeholder="+57 300 123 4567"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2.5">
                                            <Label className="text-[#111814] font-bold ml-1 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-[#13ec6d]" />
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
                                                <Clock className="w-4 h-4 text-[#13ec6d]" />
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
                                        <div className="space-y-2.5">
                                            <Label className="text-[#111814] font-bold ml-1 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-[#13ec6d]" />
                                                Domingos y Festivos
                                            </Label>
                                            <Input
                                                value={businessData.horarios?.domingos || ''}
                                                onChange={e => setBusinessData({
                                                    ...businessData,
                                                    horarios: { ...businessData.horarios, domingos: e.target.value }
                                                })}
                                                className="h-12 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium"
                                                placeholder="Ej: 12:00 PM - 9:00 PM"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar / Tools */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* URL / Share Card */}
                        <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-[#13ec6d]" />
                                    Tu Sitio Web
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-8 pb-8 space-y-6">
                                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-[#618972] uppercase tracking-widest">Enlace Directo</span>
                                        <CheckCircle2 className="w-4 h-4 text-[#13ec6d]" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            readOnly
                                            value={`menuia.co/${slug}/menu-completo`}
                                            className="h-10 bg-white border-dashed rounded-xl text-xs font-mono text-[#111814]"
                                        />
                                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white" onClick={() => {
                                            navigator.clipboard.writeText(`https://menuia.co/${slug}/menu-completo`);
                                            toast.success('Link copiado');
                                        }}>
                                            <Share2 className="w-4 h-4 text-[#13ec6d]" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#618972]">
                                        <CheckCircle2 className="w-4 h-4 text-[#13ec6d]" />
                                        Subdominio personalizado activo
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#618972]">
                                        <CheckCircle2 className="w-4 h-4 text-[#13ec6d]" />
                                        Certificado SSL (Sitio Seguro)
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* QR Code Action */}
                        <Card className="border border-gray-100 shadow-xl rounded-[2.5rem] bg-white overflow-hidden relative group hover:shadow-2xl hover:border-[#13ec6d]/20 transition-all duration-500">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#13ec6d]/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-[#13ec6d]/10 transition-all duration-500"></div>
                            <CardContent className="p-8 flex flex-col items-center text-center space-y-6 relative z-10">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight text-gray-900">Código QR del Catálogo</h3>
                                    <p className="text-gray-500 text-sm mt-1 font-medium">Imprímelo para que tus clientes accedan instantáneamente.</p>
                                </div>
                                <div className="w-full aspect-square max-w-[240px] bg-white rounded-[2rem] p-4 flex items-center justify-center border-2 border-dashed border-gray-200 group-hover:border-[#13ec6d] transition-colors duration-500">
                                    <QRCodeSVG
                                        id="business-qr-code"
                                        value={`${baseUrl}/${slug}/menu-completo`}
                                        size={200}
                                        level="H"
                                        includeMargin={false}
                                        className="w-full h-full"
                                    />
                                </div>
                                <Button
                                    onClick={downloadQR}
                                    className="w-full h-12 rounded-2xl bg-[#13ec6d] hover:bg-[#0fd660] text-[#111814] font-black shadow-lg shadow-[#13ec6d]/20 transition-all duration-300"
                                >
                                    Descargar QR
                                </Button>
                            </CardContent>
                        </Card>
                        {/* Map Card */}
                        <Card className="border-none shadow-sm rounded-[2.5rem] bg-gray-100 overflow-hidden h-[240px] relative group mt-8">
                            <iframe
                                title="Ubicación del Negocio"
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(businessData.direccion || 'Colombia')}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                width="100%"
                                height="100%"
                                style={{ border: 0, filter: 'grayscale(100%)' }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                className="opacity-60 group-hover:opacity-100 group-hover:filter-none transition-all duration-500"
                            ></iframe>
                            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg pointer-events-none">
                                <p className="text-xs font-bold text-[#111814] flex items-center gap-2 truncate">
                                    <MapPin className="w-3 h-3 text-[#13ec6d] shrink-0" />
                                    {businessData.direccion || 'Ubicación Exacta'}
                                </p>
                            </div>
                        </Card>
                    </div>
                </div >
            </div >
        </DashboardLayout >
    );
}
