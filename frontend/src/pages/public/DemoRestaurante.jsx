import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart,
    Plus,
    Minus,
    Search,
    ArrowLeft,
    Star,
    UtensilsCrossed,
    Filter,
    Sparkles,
    CheckCircle2,
    User,
    X,
    Send,
    MapPin,
    Phone,
    CreditCard,
    ChefHat,
    ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

// Mock Data for the Demo
const DEMO_BUSINESS = {
    nombre: "Fast Food Pro Demo",
    logo_url: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&q=80",
    banner_url: "https://images.unsplash.com/photo-1549611016-3a70d82b5040?w=1200&q=80",
    slogan: "Descubre una explosión de sabores preparados con pasión.",
    banner_tag: "Los mejores sabores",
    banner_title: "Nuestro Menú",
    banner_description: "Descubre una explosión de sabores preparados con pasión.",
    slug: "demo-restaurante"
};

const DEMO_CATEGORIES = [
    { nombre: 'Todas', icono: '🍽️' },
    { nombre: 'Hamburguesas', icono: '🍔' },
    { nombre: 'Pizzas', icono: '🍕' },
    { nombre: 'Perros calientes', icono: '🌭' },
    { nombre: 'Salchipapas', icono: '🍟' },
    { nombre: 'Sandwich', icono: '🥪' },
    { nombre: 'Mazorcadas', icono: '🌽' },
    { nombre: 'Asados', icono: '🥩' },
    { nombre: 'Bebidas', icono: '🥤' },
    { nombre: 'Postres', icono: '🍰' }
];

const DEMO_PRODUCTS = [
    // Hamburguesas
    { id: 1, categoria: 'Hamburguesas', nombre: 'Clásica Grill', precio: 18000, descripcion: 'Carne artesanal, queso cheddar, lechuga y tomate.', imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80', destacado: true, etiqueta: 'NUEVO' },
    { id: 2, categoria: 'Hamburguesas', nombre: 'Monster Bacon', precio: 25000, descripcion: 'Doble carne, triple tocino crujiente y mucha salsa.', imagen: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&q=80', destacado: true, etiqueta: 'OFERTA', precio_original: 28000, oferta_porcentaje: 10 },
    { id: 3, categoria: 'Hamburguesas', nombre: 'Crispy Chicken', precio: 22000, descripcion: 'Pechuga de pollo apanada, cole slaw y pepinillos.', imagen: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500&q=80', etiqueta: 'HOT' },
    { id: 4, categoria: 'Hamburguesas', nombre: 'Veggie Power', precio: 20000, descripcion: 'Hamburguesa de lentejas, champiñones y rúcula.', imagen: 'https://images.unsplash.com/photo-1525059696034-4967a8504e71?w=500&q=80' },
    { id: 37, categoria: 'Hamburguesas', nombre: 'Doble Queso XL', precio: 24000, descripcion: 'Doble carne y cuatro capas de queso monterey jack.', imagen: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&q=80', destacado: false },

    // Pizzas
    { id: 5, categoria: 'Pizzas', nombre: 'Pepperoni Supreme', precio: 32000, descripcion: 'Mucho pepperoni, mozzarella y salsa de la casa.', imagen: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&q=80', destacado: true, etiqueta: 'NUEVO' },
    { id: 6, categoria: 'Pizzas', nombre: 'Hawaiana Special', precio: 23800, descripcion: 'Jamón, piña caramelizada y extra queso.', imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80', precio_original: 28000, oferta_porcentaje: 15, etiqueta: 'OFERTA' },
    { id: 7, categoria: 'Pizzas', nombre: 'Carnes Frías', precio: 35000, descripcion: 'Salami, jamón, tocino y salchicha italiana.', imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80' },
    { id: 8, categoria: 'Pizzas', nombre: 'Margarita Italiana', precio: 26000, descripcion: 'Tomates frescos, albahaca y aceite de oliva.', imagen: 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad38?w=500&q=80' },
    { id: 38, categoria: 'Pizzas', nombre: 'Vegetales Grill', precio: 29000, descripcion: 'Pimentón, cebolla, champiñones y aceitunas negras.', imagen: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=500&q=80', etiqueta: 'OFERTA', precio_original: 34000, oferta_porcentaje: 15 },

    // Perros calientes
    { id: 9, categoria: 'Perros calientes', nombre: 'American Classic', precio: 12000, descripcion: 'Salchicha jumbo, ripio, cebolla y salsas.', imagen: 'https://images.unsplash.com/photo-1541288097918-786375a3144e?w=500&q=80', etiqueta: 'OFERTA', precio_original: 14000, oferta_porcentaje: 14 },
    { id: 10, categoria: 'Perros calientes', nombre: 'Mexican Dog', precio: 15000, descripcion: 'Guacamole, jalapeños y totopos triturados.', imagen: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=500&q=80', etiqueta: 'CALIENTE' },
    { id: 11, categoria: 'Perros calientes', nombre: 'Cheese Lover Dog', precio: 16000, descripcion: 'Triple queso fundido y tocineta picada.', imagen: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&q=80', destacado: true },
    { id: 12, categoria: 'Perros calientes', nombre: 'Crispy Onion Dog', precio: 14000, descripcion: 'Cebolla crispy y mostaza dulce.', imagen: 'https://images.unsplash.com/photo-1612392062631-94dd858cba88?w=500&q=80' },

    // Salchipapas
    { id: 13, categoria: 'Salchipapas', nombre: 'Sencilla Junior', precio: 15000, descripcion: 'Papas fritas, salchicha y salsas tradicionales.', imagen: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=500&q=80' },
    { id: 14, categoria: 'Salchipapas', nombre: 'Especial Mixta', precio: 22000, descripcion: 'Carne, pollo, salchicha y huevo de codorniz.', imagen: 'https://images.unsplash.com/photo-1576101166820-213c32e924ba?w=500&q=80', destacado: true },
    { id: 15, categoria: 'Salchipapas', nombre: 'Super Ranchera', precio: 25000, descripcion: 'Maíz tierno, tocineta, queso y chorizo.', imagen: 'https://images.unsplash.com/photo-1623231262842-db66ec80d13d?w=500&q=80', etiqueta: 'OFERTA', precio_original: 30000, oferta_porcentaje: 16 },
    { id: 16, categoria: 'Salchipapas', nombre: 'Familiar King', precio: 45000, descripcion: 'Para compartir: todas las carnes y extra salsas.', imagen: 'https://images.unsplash.com/photo-1594179047519-13ad283196a5?w=500&q=80' },

    // Sandwich
    { id: 17, categoria: 'Sandwich', nombre: 'Cubano Tradicional', precio: 18000, descripcion: 'Cerdo asado, jamón, queso y pepinillos.', imagen: 'https://images.unsplash.com/photo-1521390188846-e4a30974e3a0?w=500&q=80' },
    { id: 18, categoria: 'Sandwich', nombre: 'Club House', precio: 22000, descripcion: 'Triple piso con pollo, huevo, tocino y vegetales.', imagen: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=500&q=80', destacado: true, etiqueta: 'RECOMENDADO' },
    { id: 19, categoria: 'Sandwich', nombre: 'Philly Steak', precio: 24000, descripcion: 'Tiras de lomo, pimentón asado y queso fundido.', imagen: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500&q=80' },
    { id: 20, categoria: 'Sandwich', nombre: 'Pollo Grill', precio: 19000, descripcion: 'Pechuga a la plancha con salsa pesto y tomate.', imagen: 'https://images.unsplash.com/photo-1539252554452-da6aec4061bd?w=500&q=80' },

    // Mazorcadas
    { id: 21, categoria: 'Mazorcadas', nombre: 'Mazorcada Pollo', precio: 21000, descripcion: 'Maíz tierno, pechuga desmechada y papa cabello de ángel.', imagen: 'https://images.unsplash.com/photo-1514516345957-556ca7d90a29?w=500&q=80' },
    { id: 22, categoria: 'Mazorcadas', nombre: 'Mixta Poderosa', precio: 26000, descripcion: 'Carne, pollo y costilla desmechada.', imagen: 'https://images.unsplash.com/photo-1551782450-40537687737d?w=500&q=80' },
    { id: 23, categoria: 'Mazorcadas', nombre: 'Mazorcada Ranchera', precio: 24000, descripcion: 'Chorizo santandereano y mucho maíz dulce.', imagen: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=500&q=80' },
    { id: 24, categoria: 'Mazorcadas', nombre: 'Especial Veggie', precio: 19000, descripcion: 'Maíz, champiñones, pimentón y extra queso.', imagen: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&q=80' },

    // Asados
    { id: 25, categoria: 'Asados', nombre: 'Churrasco 300g', precio: 38000, descripcion: 'Corte de res a la parrilla con chimichurri y papas.', imagen: 'https://images.unsplash.com/photo-1558030006-450675393462?w=500&q=80', destacado: true },
    { id: 26, categoria: 'Asados', nombre: 'Baby Beef', precio: 42000, descripcion: 'Lomo tierno a la plancha con puré de papa.', imagen: 'https://images.unsplash.com/photo-1546241072-48010ad2862c?w=500&q=80' },
    { id: 27, categoria: 'Asados', nombre: 'Pechuga Plancha', precio: 28000, descripcion: 'Pechuga jugosa con ensalada de la casa.', imagen: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500&q=80' },
    { id: 28, categoria: 'Asados', nombre: 'Lomo de Cerdo', precio: 32000, descripcion: 'Lomo asado en salsa BBQ de café.', imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&q=80' },

    // Bebidas
    { id: 29, categoria: 'Bebidas', nombre: 'Coca-Cola 400ml', precio: 4500, descripcion: 'Refrescante sabor original.', imagen: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80', etiqueta: 'OFERTA', precio_original: 5000, oferta_porcentaje: 10 },
    { id: 30, categoria: 'Bebidas', nombre: 'Limonada Cereza', precio: 7500, descripcion: 'Natural y refrescante con toque de cereza.', imagen: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80' },
    { id: 31, categoria: 'Bebidas', nombre: 'Jugos Naturales', precio: 6500, descripcion: 'Mango, Fresa o Maracuyá en agua o leche.', imagen: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&q=80' },
    { id: 32, categoria: 'Bebidas', nombre: 'Cerveza Artesanal', precio: 12000, descripcion: 'Rubia o Roja producida localmente.', imagen: 'https://images.unsplash.com/photo-1535958636474-b021ee880596?w=500&q=80' },

    // Postres
    { id: 33, categoria: 'Postres', nombre: 'Brownie con Helado', precio: 12000, descripcion: 'Tibio con helado de vainilla y salsa fudge.', imagen: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500&q=80', etiqueta: 'NUEVO' },
    { id: 34, categoria: 'Postres', nombre: 'Cheesecake Fresa', precio: 14000, descripcion: 'Cremoso estilo New York con coulis de fresa.', imagen: 'https://images.unsplash.com/photo-1533134242443-d4fd215282ad?w=500&q=80', destacado: true },
    { id: 35, categoria: 'Postres', nombre: 'Tiramisú Café', precio: 15000, descripcion: 'Postre italiano con café colombiano premium.', imagen: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&q=80' },
    { id: 36, categoria: 'Postres', nombre: 'Malteada Oreo', precio: 13000, descripcion: 'Vainilla cremosa con trozos de galleta Oreo.', imagen: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80' },
    { id: 39, categoria: 'Postres', nombre: 'Waffle de Nutella', precio: 16000, descripcion: 'Base crujiente con mucha nutella y fresas.', imagen: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&q=80', etiqueta: 'NUEVO' },
];

export default function DemoRestaurante() {
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState('Todas');
    const [specialFilter, setSpecialFilter] = useState(null); // 'destacados', 'ofertas', or null
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Checkout States
    const [step, setStep] = useState('cart'); // 'cart', 'checkout', 'success'
    const [checkoutData, setCheckoutData] = useState({
        nombre: '',
        direccion: '',
        telefono: '',
        metodo: 'WhatsApp'
    });

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    const handleAddToCart = (product) => {
        setCart(prev => {
            const exists = prev.find(item => item.id === product.id);
            if (exists) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
        toast.success(`${product.nombre} agregado al carrito`);
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

    const cartTotal = cart.reduce((acc, item) => acc + (item.precio * item.quantity), 0);
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    const filteredProducts = DEMO_PRODUCTS.filter(p => {
        const matchesCategory = activeCategory === 'Todas' || p.categoria === activeCategory;
        const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.descripcion.toLowerCase().includes(searchQuery.toLowerCase());

        if (specialFilter === 'destacados') return p.destacado && matchesSearch;
        if (specialFilter === 'ofertas') return p.oferta_porcentaje > 0 && matchesSearch;

        return matchesCategory && matchesSearch;
    });

    const destacados = DEMO_PRODUCTS.filter(p => p.destacado);
    const ofertas = DEMO_PRODUCTS.filter(p => p.oferta_porcentaje > 0);

    const handleConfirmOrder = () => {
        if (step === 'cart') {
            setStep('checkout');
        } else if (step === 'checkout') {
            if (!checkoutData.nombre || !checkoutData.direccion || !checkoutData.telefono) {
                toast.error('Por favor completa todos los campos');
                return;
            }
            setStep('success');
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#22C55E', '#111814', '#ffffff']
            });
        }
    };

    const resetAll = () => {
        setCart([]);
        setStep('cart');
        setIsCartOpen(false);
        setCheckoutData({ nombre: '', direccion: '', telefono: '', metodo: 'WhatsApp' });
    };

    const ProductCard = ({ product }) => (
        <motion.div
            layout
            key={product.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group bg-white rounded-[2rem] overflow-hidden border border-[#f0f4f2] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer"
            onClick={() => handleAddToCart(product)}
        >
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                <img
                    src={product.imagen}
                    alt={product.nombre}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80";
                    }}
                />
                {product.etiqueta && (
                    <div className="absolute top-4 left-4 z-20">
                        <div className="bg-[#22C55E] text-[#111814] text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-xl border border-white/10 flex items-center gap-1.5 ring-1 ring-white/20">
                            <div className="size-1 rounded-full bg-white animate-pulse" />
                            {product.etiqueta}
                        </div>
                    </div>
                )}
                {product.oferta_porcentaje && (
                    <div className="absolute top-4 right-4 z-20">
                        <div className="bg-[#ff4b4b] text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl shadow-lg border border-white/20 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 fill-white" />
                            -{product.oferta_porcentaje}%
                        </div>
                    </div>
                )}
            </div>
            <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3">
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#22C55E]/10 text-[9px] font-black text-[#22C55E] uppercase tracking-wider">
                        {product.categoria}
                    </div>
                    <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full text-[#111814] text-[10px] font-black">
                        <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                        4.8
                    </div>
                </div>
                <h3 className="text-lg font-black text-[#111814] group-hover:text-[#22C55E] transition-colors mb-2 leading-tight">
                    {product.nombre}
                </h3>
                <p className="text-[#618972] text-xs font-medium leading-relaxed mb-4 line-clamp-2">
                    {product.descripcion}
                </p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#f0f4f2]">
                    <div className="flex flex-col">
                        <span className="text-xl font-black text-[#111814]">{formatCurrency(product.precio)}</span>
                        {product.precio_original && (
                            <span className="text-[10px] font-bold text-gray-400 line-through decoration-1">
                                {formatCurrency(product.precio_original)}
                            </span>
                        )}
                    </div>
                    <div className="size-10 bg-[#22C55E] rounded-full flex items-center justify-center shadow-lg shadow-[#22C55E]/20 text-[#111814] group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5 stroke-[3]" />
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const ProductSection = ({ title, items, icon, rows = 1, onVerTodo }) => (
        <div className="mb-16">
            <div className="flex justify-between items-center mb-6 px-2">
                <h2 className="text-2xl font-black text-[#111814] tracking-tighter flex items-center gap-2">
                    {icon}
                    {title}
                </h2>
                {onVerTodo && (
                    <button
                        onClick={onVerTodo}
                        className="flex h-8 items-center justify-center rounded-full px-4 bg-white border border-[#f0f4f2] text-[#618972] hover:border-[#22C55E] hover:text-[#22C55E] transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest shadow-sm"
                    >
                        Ver todo
                    </button>
                )}
            </div>
            <div className="px-2">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                    {items.slice(0, rows * 4).map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f6f8f7] pb-24 font-sans text-[#111814] antialiased">
            {/* Top Header */}
            <header className="sticky top-0 z-50 bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-800 shadow-sm">
                <div className="px-4 md:px-10 py-3 max-w-[1200px] mx-auto w-full flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-white">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-3 group">
                            <div className="size-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                                <img src={DEMO_BUSINESS.logo_url} alt="Logo" className="w-full h-full object-cover" />
                            </div>
                            <h2 className="hidden md:block text-xl font-black tracking-tighter text-white truncate max-w-[200px]">
                                {DEMO_BUSINESS.nombre}
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="relative size-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-[#22C55E]/10 hover:border-[#22C55E] transition-all hover:scale-105 active:scale-95 group shadow-sm">
                            <User className="w-5 h-5 text-white group-hover:text-[#22C55E]" />
                        </button>
                        <button
                            onClick={() => {
                                setIsCartOpen(true);
                                setStep('cart');
                            }}
                            className="relative size-11 rounded-full bg-white border-2 border-[#22C55E] flex items-center justify-center hover:bg-[#22C55E] transition-all hover:scale-105 active:scale-95 group shadow-lg shadow-[#22C55E]/10"
                        >
                            <ShoppingCart className="w-5 h-5 text-[#22C55E] group-hover:text-white" />
                            {cartCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#22C55E] text-[10px] font-black text-white ring-2 ring-white">{cartCount}</span>}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">
                {/* Banner Section */}
                <div className="mb-10">
                    <div className="relative w-full h-48 md:h-[430px] rounded-[2.5rem] overflow-hidden group shadow-2xl border border-white">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#102218]/80 via-[#102218]/20 to-transparent z-10" />
                        <img src={DEMO_BUSINESS.banner_url} alt="Banner" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute bottom-0 left-0 p-8 md:p-12 z-20 w-full pb-16 md:pb-24">
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 text-[10px] font-black text-[#111814] bg-[#22C55E] rounded-full uppercase tracking-[0.2em] shadow-lg shadow-[#22C55E]/20">
                                <Star className="w-3 h-3 fill-[#111814]" />
                                {DEMO_BUSINESS.banner_tag}
                            </span>
                            <h1 className="text-4xl md:text-6xl font-black text-white mb-3 tracking-tighter">{DEMO_BUSINESS.banner_title}</h1>
                            <p className="text-gray-300 text-sm md:text-lg max-w-xl font-medium leading-relaxed">{DEMO_BUSINESS.banner_description}</p>
                        </div>
                    </div>
                    <div className="relative z-30 -mt-10 max-w-3xl mx-auto px-4">
                        <div className="relative group">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#618972] group-focus-within:text-[#22C55E] transition-colors"><Search className="w-full h-full" /></div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Busquemos la comida que te gusta..."
                                className="w-full h-14 bg-white border border-transparent rounded-full pl-14 pr-16 text-base font-medium shadow-xl hover:border-[#22C55E] focus:outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/50 transition-all placeholder:text-[#a0b5ab] text-[#111814]"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2"><button className="p-2.5 rounded-full border bg-gray-50 border-gray-100 text-[#618972] hover:text-[#22C55E] transition-colors shadow-sm"><Filter className="w-4 h-4" /></button></div>
                        </div>
                    </div>
                </div>

                {/* Categories Section */}
                <div className="mb-12 px-2">
                    <div className="flex flex-wrap gap-2 md:gap-3 py-4">
                        {DEMO_CATEGORIES.map((cat, idx) => (
                            <button
                                key={idx}
                                onClick={() => { setActiveCategory(cat.nombre); setSpecialFilter(null); }}
                                className={`flex h-9 md:h-10 items-center justify-center gap-x-2 rounded-full px-4 md:px-5 transition-all active:scale-95 font-bold text-[12px] md:text-sm
                  ${activeCategory === cat.nombre && specialFilter === null ? 'bg-[#22C55E] text-[#111814] shadow-lg shadow-[#22C55E]/20 scale-105' : 'bg-white border border-[#f0f4f2] text-[#618972] hover:border-[#22C55E] hover:text-[#111814]'}`}
                            >
                                <span className="text-base leading-none">{cat.icono}</span>
                                <span>{cat.nombre}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sections */}
                {activeCategory === 'Todas' && specialFilter === null && searchQuery === '' ? (
                    <>
                        <ProductSection title="Recomendados" items={destacados} icon={<Sparkles className="w-6 h-6 text-orange-400 fill-orange-400" />} onVerTodo={() => setSpecialFilter('destacados')} />
                        <ProductSection title="Ofertas Especiales" items={ofertas} icon={<Sparkles className="w-6 h-6 text-red-500" />} onVerTodo={() => setSpecialFilter('ofertas')} />
                        <ProductSection title="Nuestros Productos" items={DEMO_PRODUCTS} icon={<CheckCircle2 className="w-6 h-6 text-[#22C55E]" />} rows={3} />
                    </>
                ) : (
                    <ProductSection title={specialFilter === 'destacados' ? 'Recomendados' : (specialFilter === 'ofertas' ? 'Ofertas Especiales' : activeCategory)} items={filteredProducts} icon={<UtensilsCrossed className="w-6 h-6 text-[#22C55E]" />} rows={Math.ceil(filteredProducts.length / 4)} />
                )}
            </main>

            {/* Cart/Checkout Drawer */}
            <AnimatePresence>
                {isCartOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetAll} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" />
                        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col">

                            <div className="p-6 border-b flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">{step === 'cart' ? 'Tu Pedido' : (step === 'checkout' ? 'Finalizar Pedido' : '¡Pedido Éxito!')}</h2>
                                    {step !== 'success' && <p className="text-xs font-bold text-[#618972] uppercase tracking-wider">{cartCount} productos seleccionados</p>}
                                </div>
                                <button onClick={resetAll} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {step === 'cart' && (
                                    <div className="space-y-4">
                                        {cart.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                                <ShoppingCart className="w-16 h-16 text-gray-100 mb-4" />
                                                <p className="font-black text-gray-300">Aún no has añadido nada delicioso</p>
                                            </div>
                                        ) : cart.map((item) => (
                                            <div key={item.id} className="flex gap-4 p-3 rounded-2xl bg-gray-50 border border-gray-100 group">
                                                <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0"><img src={item.imagen} alt="" className="w-full h-full object-cover" /></div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-gray-900 text-sm truncate">{item.nombre}</h4>
                                                    <p className="text-[#22C55E] font-black text-sm">{formatCurrency(item.precio)}</p>
                                                    <div className="mt-2 flex items-center justify-between">
                                                        <div className="flex items-center gap-3 bg-white rounded-full p-1 border shadow-sm">
                                                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-[#22C55E]"><Minus className="w-4 h-4" /></button>
                                                            <span className="font-black text-xs w-4 text-center">{item.quantity}</span>
                                                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-[#22C55E]"><Plus className="w-4 h-4" /></button>
                                                        </div>
                                                        <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 text-[10px] font-black uppercase tracking-wider">Eliminar</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {step === 'checkout' && (
                                    <div className="space-y-6">
                                        <div className="p-4 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-2xl">
                                            <p className="text-[10px] font-black text-[#22C55E] uppercase tracking-widest mb-1">Información de Entrega</p>
                                            <p className="text-xs font-medium text-[#111814]/70">Completa tus datos para simular el envío del pedido.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2"><User className="w-3 h-3" /> Tu Nombre</label>
                                                <input type="text" value={checkoutData.nombre} onChange={(e) => setCheckoutData({ ...checkoutData, nombre: e.target.value })} placeholder="Ej: Luis Sarabia" className="w-full h-12 bg-gray-50 border-gray-100 rounded-xl px-4 text-sm font-bold focus:border-[#22C55E] focus:ring-0 outline-none transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2"><MapPin className="w-3 h-3" /> Dirección</label>
                                                <input type="text" value={checkoutData.direccion} onChange={(e) => setCheckoutData({ ...checkoutData, direccion: e.target.value })} placeholder="Ej: Calle 10 # 5-20" className="w-full h-12 bg-gray-50 border-gray-100 rounded-xl px-4 text-sm font-bold focus:border-[#22C55E] focus:ring-0 outline-none transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2"><Phone className="w-3 h-3" /> WhatsApp / Teléfono</label>
                                                <input type="tel" value={checkoutData.telefono} onChange={(e) => setCheckoutData({ ...checkoutData, telefono: e.target.value })} placeholder="Ej: 3001234567" className="w-full h-12 bg-gray-50 border-gray-100 rounded-xl px-4 text-sm font-bold focus:border-[#22C55E] focus:ring-0 outline-none transition-all" />
                                            </div>
                                        </div>

                                        <div className="pt-4">
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Resumen de Pago</p>
                                            <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
                                                <div className="flex justify-between text-sm font-medium"><span>Subtotal</span><span>{formatCurrency(cartTotal)}</span></div>
                                                <div className="flex justify-between text-sm font-medium"><span>Envío</span><span className="text-[#22C55E]">GRATIS</span></div>
                                                <div className="pt-2 border-t border-gray-200 flex justify-between text-lg font-black text-gray-900"><span>Total</span><span>{formatCurrency(cartTotal)}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {step === 'success' && (
                                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                                        <div className="size-24 bg-[#22C55E] rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-[#22C55E]/40 scale-110">
                                            <ChefHat className="w-12 h-12 text-[#111814]" />
                                        </div>
                                        <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tighter">¡Pedido Recibido!</h3>
                                        <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                                            Este es un <span className="text-[#22C55E] font-bold">simulacro funcional</span>. En la vida real, el restaurante recibiría este pedido al instante por WhatsApp y su panel de control.
                                        </p>
                                        <div className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-8 space-y-2 text-left">
                                            <div className="flex justify-between text-xs font-bold"><span>Cliente</span><span className="text-gray-900">{checkoutData.nombre}</span></div>
                                            <div className="flex justify-between text-xs font-bold"><span>Orden #</span><span className="text-gray-900">DEMO-001</span></div>
                                            <div className="flex justify-between text-xs font-bold"><span>Total</span><span className="text-[#22C55E] font-black">{formatCurrency(cartTotal)}</span></div>
                                        </div>
                                        <Button onClick={resetAll} className="w-full h-14 bg-white hover:bg-[#22C55E] text-[#22C55E] hover:text-white border-2 border-[#22C55E] font-black rounded-2xl transition-all">Seguir Explorando</Button>
                                    </div>
                                )}
                            </div>

                            {step !== 'success' && (
                                <div className="p-6 border-t bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="text-gray-400 font-black uppercase tracking-wider text-xs">Total a pagar</span>
                                        <span className="text-3xl font-black text-[#111814] tracking-tighter">{formatCurrency(cartTotal)}</span>
                                    </div>
                                    <Button
                                        disabled={cart.length === 0}
                                        onClick={handleConfirmOrder}
                                        className="w-full h-16 bg-white hover:bg-[#22C55E] text-[#22C55E] hover:text-[#111814] border-2 border-[#22C55E] font-black rounded-2xl text-lg flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-[#22C55E]/20 active:scale-95"
                                    >
                                        {step === 'cart' ? (
                                            <>Siguiente <ArrowRight className="w-6 h-6" /></>
                                        ) : (
                                            <>Confirmar Pedido <Send className="w-6 h-6" /></>
                                        )}
                                    </Button>
                                    {step === 'checkout' && (
                                        <button onClick={() => setStep('cart')} className="w-full mt-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors">Volver al carrito</button>
                                    )}
                                </div>
                            )}

                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
