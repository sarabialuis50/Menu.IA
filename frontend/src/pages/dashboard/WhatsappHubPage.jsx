import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MessageSquareMore, Megaphone, Zap, BarChart, Plus, Copy, Smartphone, Users, Award, AlertCircle, Check, Sparkles, Send, Save, Trash2, LayoutGrid, Calendar, MessageSquare, CheckCircle, ExternalLink, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

export default function WhatsappHubPage() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('templates'); // 'templates' | 'campaigns'
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    // Campañas state
    const [selectedSegment, setSelectedSegment] = useState(null);
    const [campaignMessage, setCampaignMessage] = useState('');
    const [isSendingCampaign, setIsSendingCampaign] = useState(false);

    // Purchase Modal state
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [isCreatingLink, setIsCreatingLink] = useState(false);

    const tags = ['[Nombre]', '[Puntos]', '[Saldo]', '[Premio]', '[Codigo]', '[Nivel]'];

    const segments = [
        {
            id: 'all',
            name: 'Todos los Miembros',
            count: 204,
            desc: 'Envía un mensaje general a toda tu base de datos de clientes registrados.',
            icon: <Users className="w-5 h-5" />,
            defaultMessage: '¡Hola [Nombre]! 👋 Tenemos nuevas sorpresas para ti en [Negocio]. ¡Ven a visitarnos y descubre lo que hemos preparado! ✨'
        },
        {
            id: 'vip',
            name: 'Clientes VIP',
            count: 51,
            desc: 'Dirígete exclusivamente a tus clientes más leales y frecuentes para premiar su fidelidad.',
            icon: <Award className="w-5 h-5" />,
            defaultMessage: '¡Hola [Nombre]! 🌟 Como uno de nuestros clientes VIP, tienes un beneficio exclusivo esperando por ti. ¡Gracias por tu lealtad! 🏆'
        },
        {
            id: 'new',
            name: 'Nuevos (Mes)',
            count: 42,
            desc: 'Saluda a los clientes que se unieron en los últimos 30 días para fidelizarlos desde el inicio.',
            icon: <Plus className="w-5 h-5" />,
            defaultMessage: '¡Bienvenido a la familia, [Nombre]! 🚀 Queremos que tu primer mes sea inolvidable. ¡Usa este código en tu próxima visita! 🎁'
        },
        {
            id: 'inactive',
            name: 'Inactivos',
            count: 87,
            desc: 'Recupera a los clientes que no han visitado tu negocio en más de 30 días con una oferta especial.',
            icon: <AlertCircle className="w-5 h-5" />,
            defaultMessage: '¡Te extrañamos, [Nombre]! 🔥 Hace tiempo que no nos vemos en [Negocio]. Te regalamos un beneficio especial para motivar tu regreso. ¡Te esperamos! 🥘'
        }
    ];

    useEffect(() => {
        const initialTemplates = [
            {
                id: 'welcome',
                name: 'Bienvenida',
                trigger_type: 'BIENVENIDA',
                trigger: 'Se envía automáticamente cuando un cliente se registra por primera vez.',
                message: '¡Hola [Nombre]! 👋 Bienvenido a [Negocio]. Te regalamos tus primeros 50 puntos para que empieces a disfrutar. 🎁',
                status: true,
                stats: { alcance: 204, apertura: '97%', conversion: '12%', tip: 'El mensaje de bienvenida tiene la mayor tasa de interacción (97%).' }
            },
            {
                id: 'points',
                name: 'Acreditación',
                trigger_type: 'ACREDITACIÓN PUNTOS',
                trigger: 'Se envía cada vez que un cliente acumula nuevos puntos.',
                message: '¡Genial [Nombre]! Has acumulado puntos en tu visita. Tu nuevo saldo es de [Saldo] puntos. 🌟',
                status: true,
                stats: { alcance: 512, apertura: '84%', conversion: '18%', tip: 'Notificar puntos acumulados aumenta la recurrencia un 18%.' }
            },
            {
                id: 'reward',
                name: 'Premio',
                trigger_type: 'PREMIO DESBLOQUEADO',
                trigger: 'Se envía cuando un cliente alcanza los puntos necesarios para un premio.',
                message: '¡Felicidades [Nombre]! 🎉 Has desbloqueado el premio: [Premio]. Reclámalo en tu próxima visita con el código [Codigo].',
                status: true,
                stats: { alcance: 128, apertura: '92%', conversion: '64%', tip: '¡Impresionante! El canje de premios desbloqueados tiene una conversión del 64%.' }
            },
            {
                id: 'redemption',
                name: 'Canje',
                trigger_type: 'CONFIRMACIÓN CANJE',
                trigger: 'Se envía inmediatamente después de que un cliente canjea un premio.',
                message: 'Hola [Nombre], confirmamos el canje de tu premio. ¡Esperamos que lo disfrutes! 🥤',
                status: false,
                stats: { alcance: 89, apertura: '95%', conversion: '100%', tip: 'La confirmación inmediata genera confianza y fidelidad extrema.' }
            }
        ];
        setTemplates(initialTemplates);
        setSelectedTemplate(initialTemplates[0]);
        setSelectedSegment(segments[0]);
        setCampaignMessage(segments[0].defaultMessage);

        // Auto-open purchase modal if requested via URL
        if (searchParams.get('purchase') === 'true') {
            setIsPurchaseModalOpen(true);
        }
    }, [searchParams]);

    const handleSaveTemplate = async () => {
        setIsSavingTemplate(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSavingTemplate(false);
        toast.success('Automatización guardada correctamente');
        setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? selectedTemplate : t));
    };

    const handleSendCampaign = async () => {
        setIsSendingCampaign(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsSendingCampaign(false);
        toast.success('Campaña enviada con éxito');
    };

    const handleSegmentChange = (segment) => {
        setSelectedSegment(segment);
        setCampaignMessage(segment.defaultMessage);
    };

    const { api } = useAuth();
    const handlePurchasePack = async (amount) => {
        try {
            setIsCreatingLink(true);
            const response = await api().post('/payments/create-wa-pack-link', { amount });
            if (response.data.init_point) {
                window.location.href = response.data.init_point;
            } else {
                toast.error("No se pudo generar el link de pago");
            }
        } catch (error) {
            console.error("Error creating pack payment:", error);
            toast.error("Error al procesar la compra");
        } finally {
            setIsCreatingLink(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8 pb-10">
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
                    {/* Phone Preview - TOP on mobile */}
                    <div className="lg:col-span-4 order-1 lg:order-2">
                        {/* WhatsApp Usage Card */}
                        <Card className="rounded-[2rem] border-none shadow-2xl bg-[#4ADE80] overflow-hidden text-[#111814] group mb-6">
                            <CardContent className="p-8 flex flex-col h-full space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                                            <MessageSquare className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-white">WhatsApp Hub</CardTitle>
                                            <div className="flex items-center gap-1.5 text-[8px] font-bold text-white/60">
                                                <div className="w-1 h-1 rounded-full bg-white opacity-40" />
                                                SINCRONIZACIÓN ACTIVA
                                            </div>
                                        </div>
                                    </div>
                                    <AlertCircle className="w-4 h-4 text-white/40" />
                                </div>

                                <div className="space-y-4 py-2">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-4xl font-black leading-none">
                                                {user?.wa_credits > 0 ? user.wa_credits.toLocaleString() : '0/0'}
                                            </h3>
                                            <Badge className="bg-white/20 text-white text-[7px] font-black tracking-widest border-white border-2 px-2 py-0.5 text-center ml-2 uppercase">Saldo Disponible</Badge>
                                        </div>
                                        <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest px-1">Créditos de Campaña</p>
                                    </div>
                                    <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all duration-1000"
                                            style={{ width: user?.wa_credits > 0 ? '100%' : '0%' }}
                                        />
                                    </div>
                                    <p className="text-[9px] font-bold text-white/80 italic text-center">
                                        {user?.wa_credits > 0
                                            ? `🚀 Tienes ${user.wa_credits.toLocaleString()} mensajes listos para enviar.`
                                            : "⚠️ No tienes créditos para campañas masivas."}
                                    </p>
                                </div>

                                <div className="bg-white/10 rounded-2xl p-4 flex items-center justify-between border border-white/10">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="w-4 h-4 text-white" />
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-black uppercase tracking-wider">Reporte Programado</p>
                                            <p className="text-[8px] font-bold text-white/60">Próximo reset: 01/3/2026</p>
                                        </div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-white/40" />
                                </div>

                                <Button
                                    onClick={() => setIsPurchaseModalOpen(true)}
                                    className="col-span-2 bg-white text-[#22C55E] border-2 border-transparent hover:bg-transparent hover:text-white hover:border-white font-black text-[9px] uppercase h-10 rounded-xl tracking-wider shadow-xl shadow-green-900/10 transition-all px-2 w-full"
                                >
                                    ADQUIRIR PACK DE MENSAJES
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="lg:sticky lg:top-[128px]">
                            <div className="bg-white rounded-[1.5rem] border-[5px] border-gray-900 shadow-2xl w-full max-w-[280px] h-[400px] md:h-[450px] overflow-hidden relative mx-auto transition-all">
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-28 h-4 bg-gray-900 rounded-b-lg z-20"></div>
                                <div className="w-full h-full bg-[#E5DDD5] flex flex-col relative">
                                    <div className="bg-[#075E54] p-4 pt-10 text-white flex items-center gap-3 shrink-0">
                                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm shadow-inner">
                                            {user?.business_name?.[0] || 'M'}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tight leading-none">{user?.business_name || 'Mi Negocio'}</p>
                                            <p className="text-[10px] opacity-70 font-bold uppercase mt-0.5">En línea</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-hide">
                                        <div className="max-w-[90%] bg-white rounded-2xl rounded-tl-sm p-4 shadow-md relative border-b-2 border-gray-100">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <span className="text-[9px] font-black text-[#22C55E] uppercase tracking-widest">OFICIAL</span>
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
                                            </div>
                                            <p className="text-sm text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">
                                                {activeTab === 'templates'
                                                    ? (selectedTemplate?.message || 'Escribe tu mensaje...')
                                                    : (campaignMessage || 'Escribiendo campaña...')
                                                }
                                            </p>
                                            <div className="flex items-center justify-end gap-1 mt-2">
                                                <p className="text-[8px] text-gray-400 font-bold uppercase">Ahora</p>
                                                <Check className="w-2.5 h-2.5 text-[#22C55E]" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-100 p-3 px-4 flex items-center gap-3 shrink-0">
                                        <div className="flex-1 h-9 bg-white rounded-full border-2 border-gray-200"></div>
                                        <div className="w-10 h-10 rounded-full bg-[#075E54] flex items-center justify-center text-white shadow-lg"><Smartphone className="w-5 h-5" /></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area - MIDDLE on mobile */}
                    <div className="lg:col-span-8 flex flex-col space-y-6 order-2 lg:order-1">
                        {/* Tabs Navigation - Pill Style - Left Aligned */}
                        <div className="flex justify-start mb-2">
                            <div className="bg-gray-100 p-1.5 rounded-full flex items-center gap-1 shadow-inner border border-gray-200">
                                <button
                                    onClick={() => setActiveTab('templates')}
                                    className={`px-6 py-2.5 text-[10px] font-black tracking-widest transition-all flex items-center gap-2 rounded-full ${activeTab === 'templates'
                                        ? 'bg-[#4ADE80] text-[#111814] shadow-lg shadow-green-100'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    <Zap className={`w-3 h-3 ${activeTab === 'templates' ? 'fill-current' : ''}`} />
                                    MENSAJES AUTOMÁTICOS
                                </button>
                                <button
                                    onClick={() => setActiveTab('campaigns')}
                                    className={`px-6 py-2.5 text-[10px] font-black tracking-widest transition-all flex items-center gap-2 rounded-full relative ${activeTab === 'campaigns'
                                        ? 'bg-[#4ADE80] text-[#111814] shadow-lg shadow-green-100'
                                        : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    <MessageSquareMore className={`w-3 h-3 ${activeTab === 'campaigns' ? 'fill-current' : ''}`} />
                                    CAMPAÑAS MASIVAS
                                    {(!user?.wa_credits || user?.wa_credits <= 0) && (
                                        <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-amber-500 bg-white rounded-full p-0.5 shadow-sm" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {activeTab === 'templates' ? (
                            <>
                                {/* Selector de Disparadores Atómicos */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-[#22C55E]">
                                        <Zap className="w-3.5 h-3.5 fill-current" />
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#23a352]">Disparadores Atómicos</h3>
                                        <div className="ml-auto px-2 py-0.5 bg-green-50 rounded-full text-[9px] font-black border border-green-100 uppercase tracking-tighter">
                                            {templates.filter(t => t.status).length} ACTIVOS
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 border-2 border-gray-200 p-2 rounded-[1.5rem] bg-gray-50/30">
                                        {templates.map((template) => (
                                            <button
                                                key={template.id}
                                                onClick={() => setSelectedTemplate(template)}
                                                className={`p-4 rounded-2xl border transition-all flex items-start gap-4 text-left ${selectedTemplate?.id === template.id
                                                    ? 'bg-white border-[#22C55E] border-2 shadow-lg shadow-green-100 ring-4 ring-green-50/50'
                                                    : 'bg-white border-gray-100 border-2 hover:border-gray-200 shadow-sm'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-xl shrink-0 ${selectedTemplate?.id === template.id ? 'bg-[#4ADE80] text-[#111814] shadow-md' : 'bg-gray-50 text-gray-300'}`}>
                                                    <Zap className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`font-black text-[10px] uppercase tracking-tight leading-none mb-2 ${selectedTemplate?.id === template.id ? 'text-[#22C55E]' : 'text-gray-500'}`}>{template.name}</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${template.status ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                            {template.status ? 'EN EXECUCIÓN' : 'PAUSADO'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Editor de Automatización */}
                                {selectedTemplate && (
                                    <div className="space-y-4 flex flex-col flex-1">
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-white border-2 border-[#22C55E] text-[#22C55E] flex items-center justify-center font-black shadow-sm">
                                                    <MessageSquareMore className="w-4 h-4" />
                                                </div>
                                                <h3 className="font-black text-gray-900 text-base uppercase tracking-tight">Personaliza el mensaje</h3>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className={`px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest flex items-center gap-2 border transition-colors ${selectedTemplate.status ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                                                    <div className={`w-2 h-2 rounded-full ${selectedTemplate.status ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                                    {selectedTemplate.status ? 'ACTIVADO' : 'DESACTIVADO'}
                                                </div>
                                                <Switch
                                                    checked={selectedTemplate.status}
                                                    onCheckedChange={(checked) => setSelectedTemplate({ ...selectedTemplate, status: checked })}
                                                    className="data-[state=checked]:bg-[#4ADE80]"
                                                />
                                            </div>
                                        </div>

                                        <Card className="border-2 border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden bg-white flex flex-col flex-1 min-h-[500px] rounded-[1.5rem]">
                                            <div className="p-7 flex-1 flex flex-col space-y-6">
                                                <div className="bg-gray-50/80 rounded-2xl p-5 border-2 border-dashed border-gray-200 flex items-center gap-3">
                                                    <AlertCircle className="w-5 h-5 text-[#22C55E] shrink-0" />
                                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-tight leading-relaxed">{selectedTemplate.trigger}</p>
                                                </div>

                                                <div className="flex-1 border-2 border-gray-50 rounded-2xl p-4 bg-gray-50/10">
                                                    <textarea
                                                        value={selectedTemplate.message}
                                                        onChange={(e) => setSelectedTemplate({ ...selectedTemplate, message: e.target.value })}
                                                        className="w-full h-full min-h-[180px] bg-transparent resize-none border-none focus:ring-0 text-gray-800 placeholder:text-gray-300 text-lg font-medium leading-relaxed scrollbar-hide"
                                                        placeholder="Escribe el mensaje de la automatización..."
                                                    />
                                                </div>

                                                <div className="pt-6 border-t-2 border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
                                                    <div className="space-y-3 min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Etiquetas Inteligentes</span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {tags.map(tag => (
                                                                <button
                                                                    key={tag}
                                                                    onClick={() => setSelectedTemplate({ ...selectedTemplate, message: selectedTemplate.message + ' ' + tag })}
                                                                    className="whitespace-nowrap text-[10px] font-bold px-3 py-1.5 bg-white border-2 border-gray-100 hover:border-[#22C55E] hover:text-[#22C55E] hover:shadow-sm text-gray-600 rounded-xl transition-all"
                                                                >
                                                                    {tag}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="md:pl-6 md:border-l-2 border-gray-100 flex flex-col items-center md:items-end gap-3 shrink-0">
                                                        <Button
                                                            onClick={handleSaveTemplate}
                                                            disabled={isSavingTemplate}
                                                            className="h-11 px-6 rounded-xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#111814] font-black flex items-center gap-2 transition-all shadow-lg shadow-green-100 disabled:opacity-50 text-[11px] tracking-widest"
                                                        >
                                                            {isSavingTemplate ? (
                                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            ) : (
                                                                <Save className="w-4 h-4" />
                                                            )}
                                                            GUARDAR CAMBIOS
                                                        </Button>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center md:text-right">
                                                            {selectedTemplate.message.length} <span className="text-gray-200">/</span> 500 caract.
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="relative">
                                {(!user?.wa_credits || user.wa_credits <= 0) && (
                                    <div className="absolute inset-x-0 -top-4 -bottom-4 z-50 backdrop-blur-[2px] bg-white/40 flex items-center justify-center p-6 rounded-[2.5rem]">
                                        <div className="max-w-sm w-full bg-white border-2 border-amber-100 shadow-2xl rounded-[2rem] p-8 text-center flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                                                <Lock className="w-8 h-8 text-amber-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Módulo Bloqueado</h3>
                                                <p className="text-sm text-gray-500 font-medium">
                                                    Las campañas masivas requieren un pack de mensajes activo. Recarga ahora para empezar a impactar a tus clientes.
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => setIsPurchaseModalOpen(true)}
                                                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl uppercase tracking-widest text-[10px]"
                                            >
                                                Adquirir Pack de Marketing
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                <div className={(!user?.wa_credits || user.wa_credits <= 0) ? 'opacity-30 pointer-events-none' : ''}>
                                    {/* Selector de Audiencia */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-[#22C55E]">
                                            <Users className="w-3.5 h-3.5 fill-current" />
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#23a352]">Audiencia Objetivo</h3>
                                            <div className="ml-auto px-2 py-0.5 bg-green-50 rounded-full text-[9px] font-black border border-green-100 uppercase tracking-tighter text-[#22C55E]">
                                                {selectedSegment?.count} CLIENTES SELECCIONADOS
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-3 border-2 border-gray-200 p-2 rounded-[1.5rem] bg-gray-50/30">
                                            {segments.map((segment) => (
                                                <button
                                                    key={segment.id}
                                                    onClick={() => handleSegmentChange(segment)}
                                                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center ${selectedSegment?.id === segment.id
                                                        ? 'bg-white border-[#22C55E] border-2 shadow-lg shadow-green-100 ring-4 ring-green-50/50'
                                                        : 'bg-white border-transparent border-2 hover:border-gray-200 shadow-sm'
                                                        }`}
                                                >
                                                    <div className={`p-2 rounded-xl ${selectedSegment?.id === segment.id ? 'bg-[#4ADE80] text-[#111814] shadow-md' : 'bg-gray-50 text-gray-300'}`}>
                                                        {segment.icon}
                                                    </div>
                                                    <div>
                                                        <p className={`font-black text-[9px] uppercase tracking-tighter leading-none mb-1 ${selectedSegment?.id === segment.id ? 'text-[#22C55E]' : 'text-gray-500'}`}>{segment.name}</p>
                                                        <p className="text-[11px] font-black text-gray-900">{segment.count}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Editor de Mensaje de Campaña */}
                                    <div className="space-y-4 flex flex-col flex-1 mt-6">
                                        <div className="flex items-center gap-3 px-1">
                                            <div className="w-9 h-9 rounded-full bg-white border-2 border-[#22C55E] text-[#22C55E] flex items-center justify-center font-black shadow-sm">
                                                <Send className="w-4 h-4" />
                                            </div>
                                            <h3 className="font-black text-gray-900 text-base uppercase tracking-tight">Personaliza el mensaje de campaña</h3>
                                        </div>

                                        <Card className="border-2 border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden bg-white flex flex-col flex-1 min-h-[500px] rounded-[1.5rem]">
                                            <div className="p-7 flex-1 flex flex-col space-y-6">
                                                <div className="bg-gray-50/80 rounded-2xl p-5 border-2 border-dashed border-gray-200 flex flex-col gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <AlertCircle className="w-5 h-5 text-[#22C55E] shrink-0" />
                                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-tight leading-relaxed">
                                                            {selectedSegment?.desc}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex-1 border-2 border-gray-50 rounded-2xl p-4 bg-gray-50/10">
                                                    <textarea
                                                        value={campaignMessage}
                                                        onChange={(e) => setCampaignMessage(e.target.value)}
                                                        className="w-full h-full min-h-[180px] bg-transparent resize-none border-none focus:ring-0 text-gray-800 placeholder:text-gray-300 text-lg font-medium leading-relaxed scrollbar-hide"
                                                        placeholder="Escribe el mensaje que recibirán todos los clientes seleccionados..."
                                                    />
                                                </div>

                                                <div className="pt-6 border-t-2 border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
                                                    <div className="space-y-3 min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Etiquetas Inteligentes</span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {tags.map(tag => (
                                                                <button
                                                                    key={tag}
                                                                    onClick={() => setCampaignMessage(campaignMessage + ' ' + tag)}
                                                                    className="whitespace-nowrap text-[10px] font-bold px-3 py-1.5 bg-white border-2 border-gray-100 hover:border-[#22C55E] hover:text-[#22C55E] hover:shadow-sm text-gray-600 rounded-xl transition-all"
                                                                >
                                                                    {tag}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="md:pl-6 md:border-l-2 border-gray-100 flex flex-col items-center md:items-end gap-3 shrink-0">
                                                        <Button
                                                            onClick={handleSendCampaign}
                                                            disabled={isSendingCampaign || !campaignMessage.trim()}
                                                            className="h-11 px-6 rounded-xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#111814] font-black flex items-center gap-2 transition-all shadow-lg shadow-green-100 disabled:opacity-50 text-[11px] tracking-widest"
                                                        >
                                                            {isSendingCampaign ? (
                                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            ) : (
                                                                <Send className="w-4 h-4" />
                                                            )}
                                                            ENVIAR CAMPAÑA
                                                        </Button>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center md:text-right">
                                                            {campaignMessage.length} <span className="text-gray-200">/</span> 500 caract.
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Impact Stats - BOTTOM on mobile */}
                    <div className="lg:col-span-12 order-3 lg:order-3">
                        <div className="flex justify-center lg:justify-end mt-4 lg:mt-0">
                            <Card className="border-2 border-gray-200 shadow-xl bg-white overflow-hidden rounded-[2rem] w-full max-w-[280px] lg:max-w-none lg:w-full border-t-[10px] border-t-green-500">
                                <div className="p-5 border-b flex items-center justify-between">
                                    <h4 className="font-black text-gray-900 text-[10px] flex items-center gap-2 uppercase tracking-widest">
                                        <BarChart className="w-3.5 h-3.5 text-[#22C55E]" />
                                        Impacto Estimado
                                    </h4>
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="flex justify-between md:flex-col md:items-start items-center gap-1">
                                            <span className="text-gray-400 font-black text-[10px] uppercase">Alcance</span>
                                            <span className="font-black text-gray-900 text-sm">
                                                {activeTab === 'templates' ? (selectedTemplate?.stats?.alcance || 0) : (selectedSegment?.count || 0)} Clientes
                                            </span>
                                        </div>
                                        <div className="flex justify-between md:flex-col md:items-start items-center gap-1">
                                            <span className="text-gray-400 font-black text-[10px] uppercase">Tasa Apertura</span>
                                            <span className="font-black text-[#22C55E] text-lg">
                                                {activeTab === 'templates' ? (selectedTemplate?.stats?.apertura || '95%') : '96%'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between md:flex-col md:items-start items-center gap-1">
                                            <span className="text-gray-400 font-black text-[10px] uppercase">Conversión</span>
                                            <span className="font-black text-[#22C55E] text-lg">
                                                {activeTab === 'templates' ? (selectedTemplate?.stats?.conversion || '10%') : '8%'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="pt-4 mt-4 border-t-2 border-gray-50">
                                        <p className="text-[10px] text-gray-400 font-black italic leading-relaxed text-center lg:text-left uppercase tracking-tighter">
                                            {activeTab === 'templates'
                                                ? (selectedTemplate?.stats?.tip || 'Optimización automática activada.')
                                                : `Impactarás al ${selectedSegment ? ((selectedSegment.count / 204) * 100).toFixed(0) : 0}% de tu base.`}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-[#4ADE80] p-8 text-[#111814] relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <MessageSquareMore className="w-24 h-24" />
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Recargar Mensajes</DialogTitle>
                            <DialogDescription className="text-white/80 font-bold text-xs uppercase tracking-widest mt-2">
                                Elige el pack que mejor se adapte a tu próxima campaña
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-4 bg-[#FAFAF9]">
                        {[
                            { amount: 1000, price: "$150.000", desc: "Ideal para avisos puntuales" },
                            { amount: 5000, price: "$725.000", desc: "Perfecto para campañas mensuales", popular: true },
                            { amount: 10000, price: "$1.400.000", desc: "Para grandes lanzamientos" }
                        ].map((pack) => (
                            <button
                                key={pack.amount}
                                onClick={() => handlePurchasePack(pack.amount)}
                                disabled={isCreatingLink}
                                className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-left group
                                    ${pack.popular ? 'bg-white border-[#22C55E] shadow-lg shadow-green-100' : 'bg-white border-gray-100 hover:border-gray-200'}
                                    ${isCreatingLink ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-gray-900 text-lg">{pack.amount.toLocaleString()}</span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">MENSAJES</span>
                                        {pack.popular && <Badge className="bg-[#4ADE80] text-[#111814] text-[7px] font-black px-2 border-none">POPULAR</Badge>}
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight leading-none">{pack.desc}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-[#22C55E] text-xl leading-none">{pack.price}</p>
                                    <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest mt-1">COP</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="px-8 pb-8 bg-[#FAFAF9]">
                        <p className="text-[9px] text-gray-400 font-bold text-center uppercase tracking-widest leading-relaxed">
                            🔒 Pago seguro vía MercadoPago. <br />
                            Los mensajes se añaden inmediatamente a tu cuenta.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
