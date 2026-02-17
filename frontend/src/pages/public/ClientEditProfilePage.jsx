
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft, Camera, User, Mail, Phone, Lock, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from 'sonner';

export default function ClientEditProfilePage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Auth
    const [token] = useState(localStorage.getItem('client_token'));

    const [formData, setFormData] = useState({
        nombre: "",
        email: "",
        telefono: "",
        avatar_url: ""
    });

    useEffect(() => {
        if (!token) {
            navigate(`/${slug}/mi-cuenta`);
            return;
        }
        fetchProfile();
    }, [token]);

    const fetchProfile = async () => {
        try {
            const res = await axios.get('/api/client/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormData({
                nombre: res.data.nombre || "",
                email: res.data.email || "",
                telefono: res.data.telefono || "",
                avatar_url: res.data.avatar_url || ""
            });
        } catch (error) {
            console.error(error);
            if (error.response?.status === 401) {
                navigate(`/${slug}/mi-cuenta`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            await axios.put('/api/client/me', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Perfil actualizado correctamente");
            navigate(`/${slug}/mi-cuenta`);
        } catch (error) {
            toast.error("Error al actualizar perfil");
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarChange = () => {
        // Implement real file upload if needed, for now just UI
        document.getElementById('avatar-upload').click();
        toast.info("La carga de imágenes se implementará pronto.");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-[#22C55E]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/30 font-inter pb-20">
            {/* Header */}
            <header className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm">
                <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/${slug}/mi-cuenta`)}
                        className="rounded-full hover:bg-gray-100"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </Button>
                    <h1 className="text-xl font-black tracking-tight text-[#111814]">Editar Perfil</h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-6">
                <form onSubmit={handleSave} className="space-y-8">

                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center justify-center gap-4 py-8">
                        <div className="relative group cursor-pointer" onClick={handleAvatarChange}>
                            <div className="w-32 h-32 rounded-full p-1 bg-white shadow-xl border border-gray-100 relative overflow-hidden">
                                <Avatar className="w-full h-full">
                                    <AvatarImage src={formData.avatar_url} className="object-cover" />
                                    <AvatarFallback className="bg-gray-100 text-gray-400 font-bold text-3xl">
                                        {formData.nombre?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <div className="absolute bottom-0 right-2 w-10 h-10 bg-[#22C55E] rounded-full flex items-center justify-center border-4 border-white shadow-lg text-[#111814]">
                                <Camera className="w-5 h-5" />
                            </div>
                            <input
                                type="file"
                                id="avatar-upload"
                                className="hidden"
                                accept="image/*"
                            />
                        </div>
                        <p className="text-sm font-medium text-gray-400">PNG, JPG hasta 5MB</p>
                    </div>

                    {/* Personal Info */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="w-5 h-5 text-[#22C55E]" />
                            <h3 className="text-lg font-black text-[#111814]">Información Personal</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="font-bold text-gray-700">Nombre Completo</Label>
                                <Input
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    className="h-12 rounded-xl bg-white border-gray-200 focus:ring-[#22C55E]/20 focus:border-[#22C55E]"
                                    placeholder="Tu nombre"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-700">Correo Electrónico</Label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <Input
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="h-12 pl-10 rounded-xl bg-white border-gray-200 focus:ring-[#22C55E]/20 focus:border-[#22C55E]"
                                            type="email"
                                            placeholder="correo@ejemplo.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-gray-700">Número de Teléfono</Label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <Input
                                            value={formData.telefono}
                                            disabled
                                            className="h-12 pl-10 rounded-xl bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400">El teléfono no se puede cambiar.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-6 pt-4 border-t border-gray-100 opacity-50 pointer-events-none">
                        <div className="flex items-center gap-2 mb-2">
                            <Lock className="w-5 h-5 text-[#22C55E]" />
                            <h3 className="text-lg font-black text-[#111814]">Seguridad</h3>
                        </div>
                        <p className="text-sm text-gray-400">El inicio de sesión se realiza mediante código OTP por WhatsApp, no se requiere contraseña.</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-8 border-t border-gray-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(`/${slug}/mi-cuenta`)}
                            className="flex-1 h-12 rounded-xl font-bold border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving}
                            className="flex-1 h-12 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-[#111814] font-black shadow-lg shadow-[#22C55E]/20"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cambios"}
                        </Button>
                    </div>

                </form>
            </main>
        </div>
    );
}
