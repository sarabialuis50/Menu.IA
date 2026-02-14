import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart, CartProvider } from '@/context/CartContext';
import { PublicLayout } from '@/layouts/PublicLayout';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
    ShoppingCart,
    Plus,
    MapPin,
    Clock,
    Phone,
    LayoutGrid,
    ChevronRight,
    Star,
    CheckCircle2,
    ArrowRight,
    UtensilsCrossed,
    Verified,
    Store,
    Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Backend API URL
const API = (import.meta.env?.VITE_BACKEND_URL || import.meta.env?.REACT_APP_BACKEND_URL) || '';


const BusinessHomePageContent = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [business, setBusiness] = useState(null);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [slug]);

    const fetchData = async () => {
        try {
            const [businessRes, productsRes] = await Promise.all([
                axios.get(`${API}/api/business/${slug}`),
                axios.get(`${API}/api/products/${slug}`)
            ]);

            setBusiness(businessRes.data);
            // Take first 4 products as featured (matching the 4 grid in HTML)
            const productsData = Array.isArray(productsRes.data) ? productsRes.data : [];
            setFeaturedProducts(productsData.filter(p => p.disponible).slice(0, 4));
        } catch (error) {
            console.error('Error fetching data:', error);
            // toast.error('Error al cargar la información');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f6f8f7]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#13ec6d]" />
            </div>
        );
    }

    if (!business) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f8f7] p-4 text-center">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                    <UtensilsCrossed className="w-10 h-10 text-gray-300" />
                </div>
                <h1 className="font-heading text-3xl font-bold mb-3 text-[#111814]">Negocio no encontrado</h1>
                <p className="text-[#618972] max-w-xs mb-8">El enlace que seguiste podría estar roto o el restaurante ya no está disponible.</p>
                <Button onClick={() => navigate('/')} className="bg-[#13ec6d] hover:bg-[#0fd660] text-[#111814] px-8 h-12 rounded-xl font-bold">
                    Ir al inicio
                </Button>
            </div>
        );
    }

    return (
        <PublicLayout businessName={business.nombre} businessLogo={business.logo_url} slug={slug}>
            <div className="bg-[#f6f8f7] min-h-screen pb-20">
                {/* Hero Section */}
                <section className="max-w-[1200px] mx-auto w-full px-4 md:px-10 pt-6">
                    {/* Banner Image */}
                    <div className="w-full h-64 md:h-96 bg-gray-200 overflow-hidden relative rounded-[2.5rem] shadow-xl border border-white">
                        <img
                            src={business.banner_url || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&q=80'}
                            alt={business.nombre}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#102218]/60 via-transparent to-transparent" />
                    </div>

                    {/* Profile Info Container */}
                    <div className="flex flex-col items-center -mt-16 md:-mt-20 z-10 relative px-4">
                        {/* Avatar/Logo */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="size-32 md:size-40 rounded-full border-[6px] border-[#f6f8f7] bg-white shadow-2xl overflow-hidden flex items-center justify-center p-1"
                        >
                            <div className="w-full h-full rounded-full overflow-hidden bg-[#13ec6d]/10">
                                <img
                                    src={business.logo_url || `https://ui-avatars.com/api/?name=${business.nombre}&background=13ec6d&color=111814&bold=true&size=512`}
                                    alt="Logo"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </motion.div>

                        {/* Text Content */}
                        <div className="mt-6 text-center max-w-2xl px-4">
                            <motion.h1
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="text-4xl md:text-5xl font-black text-[#111814] mb-3 tracking-tighter"
                            >
                                {business.nombre}
                            </motion.h1>
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-[#13ec6d] font-bold text-xl mb-5 tracking-tight"
                            >
                                {business.slogan || 'Sabor auténtico en cada plato'}
                            </motion.p>
                            <motion.p
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-[#618972] text-base md:text-lg leading-relaxed font-medium"
                            >
                                {business.descripcion || 'Bienvenido a nuestro restaurante. Disfruta de la mejor experiencia culinaria con ingredientes frescos y recetas preparadas con pasión.'}
                            </motion.p>

                            {/* Quick Info Badges */}
                            <div className="flex flex-wrap justify-center gap-3 mt-8">
                                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Verificado
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-orange-50 text-orange-700 text-xs font-bold border border-orange-100">
                                    <Star className="w-4 h-4 fill-orange-700" />
                                    4.9 (1.2k)
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                                    <Clock className="w-4 h-4" />
                                    Abierto ahora
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Divider */}
                <div className="max-w-[1200px] mx-auto px-4 md:px-10 mt-12 mb-10">
                    <div className="h-px bg-[#f0f4f2] w-full" />
                </div>

                {/* Featured Products */}
                {/* Featured Products */}
                <section className="px-4 md:px-10 mb-10 w-full overflow-hidden max-w-[1200px] mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-[#111814]">Destacados del Menú</h2>
                        <Link to={`/${slug}/menu-completo`} className="text-[#13ec6d] text-sm font-semibold hover:underline">
                            Ver todo
                        </Link>
                    </div>

                    <div className="relative group/carousel">
                        {/* Carousel Container */}
                        <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar snap-x snap-mandatory">
                            {featuredProducts.length > 0 ? (
                                featuredProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        onClick={() => navigate(`/${slug}/menu-completo`)}
                                        className="min-w-[280px] md:min-w-[320px] snap-center flex flex-col gap-3 rounded-xl bg-white shadow-sm border border-[#f0f4f2] overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                                    >
                                        <div className="w-full h-48 md:h-56 relative overflow-hidden">
                                            <img
                                                src={product.imagen || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'}
                                                alt={product.nombre}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        </div>
                                        <div className="p-4 pt-2">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-[#111814] text-lg leading-tight">{product.nombre}</h3>
                                                <span className="text-[#13ec6d] font-bold text-lg">{formatCurrency(product.precio)}</span>
                                            </div>
                                            <p className="text-sm text-[#618972] line-clamp-2">
                                                {product.descripcion || "Platillo delicioso preparado con ingredientes frescos de la mejor calidad."}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="w-full py-12 text-center bg-white rounded-xl border border-dashed border-gray-200">
                                    <UtensilsCrossed className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-400 font-medium text-sm">No hay productos destacados aún</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Location and Info */}
                <section className="max-w-[1200px] mx-auto px-4 md:px-10 mb-24">
                    <h2 className="text-2xl font-black text-[#111814] mb-8 tracking-tight">Ubicación y Horarios</h2>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
                        <div className="md:col-span-7 bg-white p-2 rounded-[2.5rem] shadow-sm border border-[#f0f4f2] h-[300px] md:h-auto overflow-hidden">
                            <div className="w-full h-full bg-gray-100 rounded-[2rem] relative overflow-hidden group">
                                <iframe
                                    title="Ubicación del Negocio"
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(business.direccion || 'Colombia')}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0, filter: 'grayscale(100%)' }}
                                    allowFullScreen=""
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    className="opacity-80 group-hover:opacity-100 group-hover:filter-none transition-all duration-700"
                                ></iframe>
                            </div>
                        </div>

                        <div className="md:col-span-5 flex flex-col gap-4">
                            {/* Address Card */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#f0f4f2] flex gap-5 hover:border-[#13ec6d]/30 transition-colors">
                                <div className="bg-[#13ec6d]/10 p-4 rounded-2xl h-fit text-[#13ec6d]">
                                    <Store className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-[#111814] mb-1">Dirección</h3>
                                    <p className="text-[#618972] text-sm leading-relaxed">{business.direccion || 'Av. Principal 123, Ciudad'}</p>
                                </div>
                            </div>

                            {/* Contact Card */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#f0f4f2] flex gap-5 hover:border-[#13ec6d]/30 transition-colors">
                                <div className="bg-[#13ec6d]/10 p-4 rounded-2xl h-fit text-[#13ec6d]">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-extrabold text-[#111814] mb-1">Contacto</h3>
                                    <p className="text-[#618972] text-sm leading-relaxed">{business.telefono || 'Escríbenos por WhatsApp'}</p>
                                    {business.whatsapp && (
                                        <Button variant="link" className="text-[#13ec6d] p-0 h-auto font-bold text-xs mt-2 hover:no-underline" onClick={() => window.open(`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`, '_blank')}>WhatsApp directo</Button>
                                    )}
                                </div>
                            </div>

                            {/* Hours Card */}
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#f0f4f2] flex gap-5 hover:border-[#13ec6d]/30 transition-colors">
                                <div className="bg-[#13ec6d]/10 p-4 rounded-2xl h-fit text-[#13ec6d]">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-[#111814] mb-1">Horario</h3>
                                    {(() => {
                                        let horarios = business.horarios;
                                        if (typeof horarios === 'string' && horarios.trim().startsWith('{')) {
                                            try { horarios = JSON.parse(horarios); } catch (e) { }
                                        }

                                        if (typeof horarios === 'object' && horarios !== null) {
                                            return (
                                                <div className="space-y-1">
                                                    <p className="text-[#618972] text-sm leading-relaxed">
                                                        <span className="font-bold text-[#618972] opacity-80">Lun - Vie: </span>
                                                        {horarios.semana || horarios.week || 'Consultar'}
                                                    </p>
                                                    {(horarios.sabado || horarios.saturday) && (
                                                        <p className="text-[#618972] text-sm leading-relaxed">
                                                            <span className="font-bold text-[#618972] opacity-80">Sábados: </span>
                                                            {horarios.sabado || horarios.saturday}
                                                        </p>
                                                    )}
                                                    <p className="text-[#618972] text-sm leading-relaxed">
                                                        <span className="font-bold text-[#618972] opacity-80">Dom - Fest: </span>
                                                        {horarios.domingos || horarios.sunday || horarios.fines || horarios.weekend || 'Consultar'}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return <p className="text-[#618972] text-sm leading-relaxed whitespace-pre-wrap">{horarios || 'Lun - Vie: 12:00 PM - 10:00 PM'}</p>;
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Floating Bottom CTA */}
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    className="fixed bottom-0 left-0 w-full z-50 bg-white/80 dark:bg-[#1a2e22]/95 backdrop-blur-xl border-t border-[#f0f4f2] py-5 px-4 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)]"
                >
                    <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-6 px-4 md:px-6">
                        <div className="hidden sm:flex flex-col">
                            <span className="text-[10px] text-[#618972] uppercase tracking-[0.2em] font-black">¿Tienes hambre?</span>
                            <span className="text-sm font-bold text-[#111814]">Explora nuestra carta completa</span>
                        </div>
                        <Button
                            onClick={() => navigate(`/${slug}/menu-completo`)}
                            className="flex-1 sm:flex-none sm:min-w-[280px] h-14 bg-[#13ec6d] hover:bg-[#0fd660] text-[#111814] text-lg font-black rounded-2xl shadow-xl shadow-[#13ec6d]/30 transform active:scale-95 transition-all flex items-center gap-3 overflow-hidden group"
                        >
                            <div className="bg-white/20 p-2 rounded-xl group-hover:rotate-12 transition-transform">
                                <UtensilsCrossed className="w-5 h-5" />
                            </div>
                            <span>VER MENÚ COMPLETO</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        </Button>
                    </div>
                </motion.div>
            </div >
        </PublicLayout >
    );
};

export default function BusinessHomePage() {
    return (
        <CartProvider>
            <BusinessHomePageContent />
        </CartProvider>
    );
}
