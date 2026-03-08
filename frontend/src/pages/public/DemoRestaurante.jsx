import { useState, useEffect, useRef } from 'react';
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
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Heart,
    Clock
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
    { id: 1, categoria: 'Hamburguesas', nombre: 'Clásica Grill', precio: 18000, descripcion: 'Carne artesanal, queso cheddar, lechuga y tomate.', imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80', destacado: true, etiqueta: 'NUEVO', nutri_kcal: 750, nutri_proteina: '28g', nutri_carbohidratos: '42g', nutri_grasa: '35g', prep_time_minutes: 15, is_gluten_free: true, modificadores: [{ nombre: "Adicionales", obligatorio: false, seleccion_maxima: 5, opciones: [{ nombre: "Queso Extra", precio: 3500 }, { nombre: "Tocineta", precio: 4500 }, { nombre: "Huevo", precio: 2000 }] }] },
    { id: 2, categoria: 'Hamburguesas', nombre: 'Monster Bacon', precio: 25000, descripcion: 'Doble carne, triple tocino crujiente y mucha salsa.', imagen: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&q=80', destacado: true, etiqueta: 'OFERTA', precio_original: 28000, oferta_porcentaje: 10, nutri_kcal: 1150, nutri_proteina: '45g', nutri_carbohidratos: '38g', nutri_grasa: '65g', prep_time_minutes: 20, is_spicy: true, modificadores: [{ nombre: "Toppings Premium", obligatorio: false, seleccion_maxima: 3, opciones: [{ nombre: "Cebolla Caramelizada", precio: 2500 }, { nombre: "Champiñones", precio: 3000 }, { nombre: "Aros de Cebolla", precio: 4000 }] }] },
    { id: 3, categoria: 'Hamburguesas', nombre: 'Crispy Chicken', precio: 22000, descripcion: 'Pechuga de pollo apanada, cole slaw y pepinillos.', imagen: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500&q=80', etiqueta: 'HOT', nutri_kcal: 680, nutri_proteina: '32g', nutri_carbohidratos: '45g', nutri_grasa: '28g', prep_time_minutes: 18, is_spicy: true },
    { id: 4, categoria: 'Hamburguesas', nombre: 'Veggie Power', precio: 20000, descripcion: 'Hamburguesa de lentejas, champiñones y rúcula.', imagen: 'https://images.unsplash.com/photo-1525059696034-4967a8504e71?w=500&q=80', nutri_kcal: 420, nutri_proteina: '18g', nutri_carbohidratos: '55g', nutri_grasa: '12g', prep_time_minutes: 15, is_vegan: true, is_vegetarian: true },
    { id: 37, categoria: 'Hamburguesas', nombre: 'Doble Queso XL', precio: 24000, descripcion: 'Doble carne y cuatro capas de queso monterey jack.', imagen: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&q=80', destacado: false },

    // Pizzas
    { id: 5, categoria: 'Pizzas', nombre: 'Pepperoni Supreme', precio: 32000, descripcion: 'Mucho pepperoni, mozzarella y salsa de la casa.', imagen: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&q=80', destacado: true, etiqueta: 'NUEVO', tamanos: [{ nombre: "Tamaño", obligatorio: true, seleccion_maxima: 1, opciones: [{ nombre: "Personal", precio: 0 }, { nombre: "Mediana", precio: 8000 }, { nombre: "Familiar", precio: 15000 }] }] },
    { id: 6, categoria: 'Pizzas', nombre: 'Hawaiana Special', precio: 23800, descripcion: 'Jamón, piña caramelizada y extra queso.', imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80', precio_original: 28000, oferta_porcentaje: 15, etiqueta: 'OFERTA', tamanos: [{ nombre: "Tamaño", obligatorio: true, seleccion_maxima: 1, opciones: [{ nombre: "Personal", precio: 0 }, { nombre: "Mediana", precio: 8000 }, { nombre: "Familiar", precio: 15000 }] }] },
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
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedModifiers, setSelectedModifiers] = useState([]);
    const [qty, setQty] = useState(1);
    const [productNotes, setProductNotes] = useState('');
    const categoriesRef = useRef(null);

    const scrollCategories = (direction) => {
        if (categoriesRef.current) {
            const scrollAmount = 300;
            categoriesRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Checkout States
    const [step, setStep] = useState('cart'); // 'cart', 'checkout', 'success'
    const [checkoutData, setCheckoutData] = useState({
        nombre: '',
        direccion: '',
        telefono: '',
        metodo: 'WhatsApp'
    });

    const formatCurrency = (value) => {
        if (value === undefined || value === null || isNaN(value) || Number(value) === 0) return '';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
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

    const addToCartAndConfirm = () => {
        if (!selectedProduct) return;

        // Check if required modifiers are selected
        const allModifierGroups = [
            ...(selectedProduct.tamanos || []),
            ...(selectedProduct.modificadores || []),
            ...(selectedProduct.opciones || [])
        ];

        const missingRequired = allModifierGroups.find(group =>
            group.obligatorio && !selectedModifiers.some(m => group.opciones.some(opt => opt.nombre === m.nombre))
        );

        if (missingRequired) {
            toast.error(`Por favor selecciona: ${missingRequired.nombre}`);
            return;
        }

        const finalUnitPrice = selectedProduct.precio + selectedModifiers.reduce((acc, m) => acc + (m.precio * (m.cantidad || 1)), 0);

        const cartItem = {
            id: selectedProduct.id + Date.now(),
            productId: selectedProduct.id,
            nombre: selectedProduct.nombre,
            precio: finalUnitPrice,
            quantity: qty,
            imagen: selectedProduct.imagen,
            notas: productNotes,
            modificadores_visual: selectedModifiers.map(m => (m.cantidad && m.cantidad > 1) ? `${m.cantidad}x ${m.nombre}` : m.nombre)
        };

        setCart(prev => [...prev, cartItem]);
        setSelectedProduct(null);
        toast.success(`${selectedProduct.nombre} agregado al carrito`);
    };

    const resetAll = () => {
        setCart([]);
        setStep('cart');
        setIsCartOpen(false);
        setCheckoutData({ nombre: '', direccion: '', telefono: '', metodo: 'WhatsApp' });
    };

    const handleProductClick = (product) => {
        setSelectedProduct(product);
        setQty(1);
        setSelectedModifiers([]);
        setProductNotes('');
    };

    const ProductCard = ({ product }) => (
        <motion.div
            layout
            key={product.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group bg-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-[#f0f4f2] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-row h-auto cursor-pointer"
            onClick={() => handleProductClick(product)}
        >
            {/* Left Column (Image + Prep Time) */}
            <div className="flex flex-col shrink-0">
                <div className="relative w-32 h-32 md:w-48 md:h-48 overflow-hidden m-2 md:m-3 rounded-2xl md:rounded-[2rem]">
                    <img
                        src={product.imagen || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"}
                        alt={product.nombre}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Badge Etiqueta - Fixed position (Left) */}
                    <div className="absolute top-2 left-2 md:top-3 md:left-3 z-20">
                        {product.etiqueta && (
                            <div className="bg-[#4ADE80] text-[#111814] text-[7px] md:text-[8px] font-black uppercase tracking-widest px-1.5 md:px-2 py-0.5 md:py-1 rounded-lg shadow-md border border-white/10 flex items-center gap-1 ring-1 ring-white/20">
                                <div className="size-1 rounded-full bg-white animate-pulse" />
                                {product.etiqueta}
                            </div>
                        )}
                    </div>

                    {/* Rating removed as requested */}

                </div>

                {/* Prep Time - Positioned in the white space below image */}
                {product.prep_time_minutes > 0 && (
                    <div className="flex justify-center -mt-1 mb-2 md:mb-4">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 md:px-3 md:py-1 rounded-xl bg-blue-50/50 text-blue-600 text-[8px] md:text-[10px] font-black border border-blue-100 shadow-sm transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white">
                            <Clock className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 stroke-[3]" />
                            {product.prep_time_minutes} MIN
                        </div>
                    </div>
                )}
            </div>
            <div className="p-3 md:p-6 flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 md:mb-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <div className="inline-flex items-center px-1.5 py-0.5 md:px-3 md:py-1.5 rounded-full bg-[#4ADE80]/10 text-[7px] md:text-[10px] font-black text-[#22C55E] uppercase tracking-wider">
                            {product.categoria}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {product.oferta_porcentaje && (
                            <div className="bg-[#ff4b4b] text-white text-[8px] md:text-[11px] font-black px-1 py-0.5 md:px-2 md:py-1 rounded-lg shadow-sm">
                                -{product.oferta_porcentaje}%
                            </div>
                        )}
                    </div>
                </div>

                <h3 className="text-sm md:text-xl font-black text-[#111814] group-hover:text-[#22C55E] transition-colors mb-1 md:mb-1.5 leading-tight line-clamp-2 min-h-[1.2em] md:min-h-[1.5em]">
                    {product.nombre}
                </h3>
                <p className="text-[#618972] text-[10px] md:text-sm font-medium leading-tight md:leading-relaxed mb-2 line-clamp-2 md:line-clamp-3">
                    {product.descripcion}
                </p>

                {/* Nutritional Info (IA) - Compact row below description */}
                {(product.nutri_kcal || product.nutri_proteina || product.nutri_carbohidratos || product.nutri_grasa) && (
                    <div className="flex flex-nowrap items-center gap-1 md:gap-1.5 mb-2 pb-0.5 w-full overflow-x-auto no-scrollbar">
                        {product.nutri_kcal && (
                            <div title="Calorías" className="flex-shrink-0 flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-[#4ADE80]/10 text-[#22C55E] text-[7px] md:text-[8px] font-black border border-[#4ADE80]/20 whitespace-nowrap">
                                🔥 {product.nutri_kcal} <span className="md:inline hidden">kcal</span>
                            </div>
                        )}
                        {product.nutri_proteina && (
                            <div title="Proteína" className="flex-shrink-0 flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-[#4ADE80]/10 text-[#22C55E] text-[7px] md:text-[8px] font-black border border-[#4ADE80]/20 whitespace-nowrap">
                                🥩 {product.nutri_proteina} <span className="md:inline hidden">prot</span>
                            </div>
                        )}
                        {product.nutri_carbohidratos && (
                            <div title="Carbohidratos" className="flex-shrink-0 flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-[#4ADE80]/10 text-[#22C55E] text-[7px] md:text-[8px] font-black border border-[#4ADE80]/20 whitespace-nowrap">
                                🍝 {product.nutri_carbohidratos} <span className="md:inline hidden">carb</span>
                            </div>
                        )}
                        {product.nutri_grasa && (
                            <div title="Grasa" className="flex-shrink-0 flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-[#4ADE80]/10 text-[#22C55E] text-[7px] md:text-[8px] font-black border border-[#4ADE80]/20 whitespace-nowrap">
                                🥑 {product.nutri_grasa} <span className="md:inline hidden">grasa</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between mt-auto pt-2 md:pt-3 border-t border-[#f0f4f2]">
                    <div className="flex items-baseline gap-2 md:gap-3">
                        {product.precio > 0 && (
                            <span className="text-base md:text-2xl font-black text-[#111814]">{formatCurrency(product.precio)}</span>
                        )}
                        {product.precio_original > 0 && product.precio_original > product.precio && (
                            <span className="text-[9px] md:text-[13px] font-bold text-gray-400 line-through decoration-1 opacity-70">
                                {formatCurrency(product.precio_original)}
                            </span>
                        )}
                    </div>
                    <div className="size-9 md:size-12 bg-[#4ADE80] rounded-full flex items-center justify-center shadow-lg shadow-[#4ADE80]/20 text-[#111814] group-hover:scale-110 active:scale-95 transition-all border-2 border-white/20">
                        <Plus className="w-4 h-4 md:w-6 md:h-6 stroke-[3]" />
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const ProductSection = ({ title, items, icon, rows = 1, onVerTodo }) => (
        <div className="mb-16">
            <div className="flex justify-between items-center mb-6 px-2">
                <h2 className="text-xl md:text-3xl font-black text-[#111814] tracking-tighter flex items-center gap-2">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                    {items.slice(0, rows * 2).map((product) => (
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
                        <button className="relative size-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-[#4ADE80]/10 hover:border-[#4ADE80] transition-all hover:scale-105 active:scale-95 group shadow-sm">
                            <User className="w-5 h-5 text-white group-hover:text-[#22C55E]" />
                        </button>
                        <button
                            onClick={() => {
                                setIsCartOpen(true);
                                setStep('cart');
                            }}
                            className="relative size-11 rounded-full bg-white border-2 border-[#4ADE80] flex items-center justify-center hover:bg-[#4ADE80] transition-all hover:scale-105 active:scale-95 group shadow-lg shadow-[#4ADE80]/10"
                        >
                            <ShoppingCart className="w-5 h-5 text-[#22C55E] group-hover:text-white" />
                            {cartCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#4ADE80] text-[10px] font-black text-[#111814] ring-2 ring-white">{cartCount}</span>}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">
                {/* Banner Section */}
                <div className="mb-10">
                    <div className="relative w-full h-80 md:h-[450px] rounded-[2.5rem] overflow-hidden group shadow-2xl border border-white">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#102218]/90 via-[#102218]/40 to-transparent z-10" />
                        <img src={DEMO_BUSINESS.banner_url} alt="Banner" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute bottom-0 left-0 p-6 md:p-12 z-20 w-full pb-20 md:pb-24 flex flex-col items-start gap-3 md:gap-4">
                            <span className="inline-flex items-center gap-2 px-4 py-1.5 md:py-2 text-[10px] font-black text-[#111814] bg-[#4ADE80] rounded-full uppercase tracking-[0.2em] shadow-lg shadow-[#4ADE80]/20">
                                <Star className="w-3 h-3 fill-[#111814]" />
                                {DEMO_BUSINESS.banner_tag}
                            </span>
                            <h1 className="text-3xl md:text-6xl font-black text-white mb-2 md:mb-3 tracking-tighter leading-none">{DEMO_BUSINESS.banner_title}</h1>
                            <p className="text-gray-300 text-sm md:text-lg max-w-xl font-medium leading-relaxed line-clamp-2 md:line-clamp-none">{DEMO_BUSINESS.banner_description}</p>
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
                <div className="flex items-center gap-2 md:gap-4 mb-12 overflow-hidden px-2 md:px-0">
                    {/* Botón de navegación Izquierdo (Flecha) */}
                    <button
                        onClick={() => scrollCategories('left')}
                        className="hidden md:flex shrink-0 w-12 h-12 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-[#22C55E] hover:bg-[#F0FDF4] hover:border-[#22C55E] transition-all active:scale-90"
                        aria-label="Anterior categoría"
                    >
                        <ChevronLeft className="w-7 h-7" />
                    </button>

                    {/* Área de Scrollable de Categorías */}
                    <div
                        ref={categoriesRef}
                        className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-4 px-2"
                    >
                        {DEMO_CATEGORIES.map((cat, idx) => (
                            <button
                                key={idx}
                                onClick={() => { setActiveCategory(cat.nombre); setSpecialFilter(null); }}
                                className={`flex h-10 md:h-12 shrink-0 items-center justify-center gap-x-2.5 rounded-full px-6 md:px-8 transition-all active:scale-95 font-bold text-[10px] md:text-sm uppercase tracking-wider snap-start
                                ${activeCategory === cat.nombre && specialFilter === null
                                        ? 'bg-[#4ADE80] text-[#111814] shadow-xl shadow-[#4ADE80]/30 scale-105 ring-2 ring-white'
                                        : 'bg-white border border-gray-100 text-gray-500 hover:border-[#22C55E] hover:text-[#111814] shadow-sm'}`}
                            >
                                <span className="text-lg md:text-2xl leading-none">{cat.icono}</span>
                                <span>{cat.nombre}</span>
                            </button>
                        ))}
                    </div>

                    {/* Botón de navegación Derecho (Flecha) */}
                    <button
                        onClick={() => scrollCategories('right')}
                        className="hidden md:flex shrink-0 w-12 h-12 items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-[#22C55E] hover:bg-[#F0FDF4] hover:border-[#22C55E] transition-all active:scale-90"
                        aria-label="Siguiente categoría"
                    >
                        <ChevronRight className="w-7 h-7" />
                    </button>
                </div>

                {/* Sections */}
                {activeCategory === 'Todas' && specialFilter === null && searchQuery === '' ? (
                    <>
                        <ProductSection title="Recomendados" items={destacados} icon={<Sparkles className="w-6 h-6 text-orange-400 fill-orange-400" />} onVerTodo={() => setSpecialFilter('destacados')} rows={2} />
                        <ProductSection title="Ofertas Especiales" items={ofertas} icon={<Sparkles className="w-6 h-6 text-red-500" />} onVerTodo={() => setSpecialFilter('ofertas')} rows={2} />
                        <ProductSection title="Nuestros Productos" items={DEMO_PRODUCTS} icon={<CheckCircle2 className="w-6 h-6 text-[#22C55E]" />} rows={4} />
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
                                            <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                                                <div className="size-20 rounded-xl overflow-hidden shrink-0 shadow-sm">
                                                    <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-gray-900 truncate">{item.nombre}</h4>
                                                    {item.modificadores_visual && item.modificadores_visual.length > 0 && (
                                                        <p className="text-[10px] font-bold text-[#618972] mb-1 leading-tight">
                                                            {item.modificadores_visual.join(' · ')}
                                                        </p>
                                                    )}
                                                    {item.notas && (
                                                        <p className="text-[9px] italic text-gray-400 truncate mb-1">"{item.notas}"</p>
                                                    )}
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
                                        <div className="p-4 bg-[#4ADE80]/10 border border-[#4ADE80]/20 rounded-2xl">
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
                                        <div className="size-24 bg-[#4ADE80] rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-[#4ADE80]/40 scale-110">
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
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t mt-auto">
                                {step !== 'success' ? (
                                    <>
                                        <button
                                            onClick={handleConfirmOrder}
                                            className="w-full h-14 bg-[#4ADE80] text-[#111814] rounded-2xl font-black text-lg shadow-xl shadow-[#4ADE80]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                        >
                                            {step === 'cart' ? 'Continuar Compra' : 'Confirmar Pedido'}
                                            <Send className="w-5 h-5" />
                                        </button>
                                        {step === 'checkout' && (
                                            <button onClick={() => setStep('cart')} className="w-full mt-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors">Volver al carrito</button>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        onClick={resetAll}
                                        className="w-full h-14 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        Volver al Menú
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Product Detail Modal */}
            <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
                <DialogContent className="max-w-[95vw] lg:max-w-6xl xl:max-w-[1300px] w-full p-0 overflow-hidden rounded-[2.5rem] md:rounded-[3rem] bg-white border-none shadow-2xl [&>button]:hidden outline-none" aria-describedby="product-description">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Detalles del Producto</DialogTitle>
                        <DialogDescription id="product-description">Vista detallada del producto seleccionado con opciones de personalización.</DialogDescription>
                    </DialogHeader>

                    {selectedProduct && (
                        <div className="flex flex-col md:flex-row h-full max-h-[90vh] md:max-h-[85vh]">
                            {/* Left Side: Product Image */}
                            <div className="relative w-full md:w-[45%] h-64 md:h-auto overflow-hidden bg-gray-50 flex-shrink-0">
                                <img
                                    src={selectedProduct.imagen || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80"}
                                    alt={selectedProduct.nombre}
                                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                                />
                                <button
                                    onClick={() => setSelectedProduct(null)}
                                    className="absolute top-6 left-6 size-10 bg-white/90 backdrop-blur-xl text-[#111814] rounded-full flex items-center justify-center hover:bg-white transition-all shadow-xl md:hidden z-20"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>

                                {selectedProduct.etiqueta && (
                                    <div className="absolute top-6 right-6 z-20">
                                        <span className="bg-[#4ADE80] text-[#111814] text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-lg shadow-[#4ADE80]/30">
                                            {selectedProduct.etiqueta}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Product Details & Modifiers */}
                            <div className="flex-1 flex flex-col min-w-0 bg-white relative overflow-hidden">
                                <div className="hidden md:flex items-center justify-end p-6 pb-0 absolute top-0 right-0 z-40">
                                    <button
                                        onClick={() => setSelectedProduct(null)}
                                        className="size-10 bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-full flex items-center justify-center transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 pb-48 md:pb-56">
                                    <div className="max-w-2xl mx-auto space-y-8">
                                        <div className="space-y-4">
                                            <div>
                                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#4ADE80]/10 text-[10px] font-black text-[#22C55E] uppercase tracking-wider mb-2">
                                                    {selectedProduct.categoria}
                                                </div>
                                                <h2 className="text-3xl md:text-4xl font-black text-[#111814] tracking-tighter leading-tight">
                                                    {selectedProduct.nombre}
                                                </h2>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <span className="text-3xl font-black text-[#22C55E]">
                                                    {formatCurrency(selectedProduct.precio)}
                                                </span>
                                                {selectedProduct.precio_original > 0 && (
                                                    <span className="text-lg font-bold text-gray-300 line-through">
                                                        {formatCurrency(selectedProduct.precio_original)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <h3 className="text-[10px] font-black text-[#111814] uppercase tracking-widest opacity-40 mb-2">Descripción</h3>
                                                <p className="text-[#618972] font-medium leading-relaxed text-sm">
                                                    {selectedProduct.descripcion}
                                                </p>
                                            </div>

                                            {/* Nutritional Info Section (Requested Design) */}
                                            {(selectedProduct.nutri_kcal || selectedProduct.nutri_proteina) && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-[10px] font-black text-[#5C6B89] uppercase tracking-widest">Información Nutricional (Estimada por IA)</h3>
                                                        <div className="size-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                                                    </div>

                                                    <div className="grid grid-cols-4 gap-2 md:gap-3">
                                                        <div className="p-3 md:p-4 bg-[#edfdf2] rounded-3xl border border-[#d3f9d8] flex flex-col items-center justify-center text-center">
                                                            <span className="text-sm md:text-xl font-black text-[#00a854]">{selectedProduct.nutri_kcal || '0'}</span>
                                                            <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Kcal</span>
                                                        </div>
                                                        <div className="p-3 md:p-4 bg-[#edfdf2] rounded-3xl border border-[#d3f9d8] flex flex-col items-center justify-center text-center">
                                                            <span className="text-sm md:text-xl font-black text-[#00a854]">{selectedProduct.nutri_proteina || '0g'}</span>
                                                            <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Prot</span>
                                                        </div>
                                                        <div className="p-3 md:p-4 bg-[#edfdf2] rounded-3xl border border-[#d3f9d8] flex flex-col items-center justify-center text-center">
                                                            <span className="text-sm md:text-xl font-black text-[#00a854]">{selectedProduct.nutri_carbohidratos || '25g'}</span>
                                                            <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Carb</span>
                                                        </div>
                                                        <div className="p-3 md:p-4 bg-[#edfdf2] rounded-3xl border border-[#d3f9d8] flex flex-col items-center justify-center text-center">
                                                            <span className="text-sm md:text-xl font-black text-[#00a854]">{selectedProduct.nutri_grasa || '12g'}</span>
                                                            <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Grasa</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-[9px] font-medium text-gray-400 italic">
                                                        * Valores aproximados calculados por inteligencia artificial basados en la receta estándar.
                                                    </p>
                                                    {/* Dietary Labels - Relocated below grid */}
                                                    {(selectedProduct.is_vegan || selectedProduct.is_vegetarian || selectedProduct.is_gluten_free || selectedProduct.is_spicy) && (
                                                        <div className="flex flex-nowrap gap-2 pt-2 overflow-x-auto no-scrollbar w-full">
                                                            {selectedProduct.is_vegan && (
                                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#edfdf2] border border-[#d3f9d8] text-[#00a854] text-[9px] md:text-[11px] font-black uppercase tracking-wider shadow-sm whitespace-nowrap flex-shrink-0">
                                                                    <span>🌱</span> VEGANO
                                                                </div>
                                                            )}
                                                            {selectedProduct.is_vegetarian && !selectedProduct.is_vegan && (
                                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fffbe6] border border-[#fff1b8] text-[#c49c00] text-[9px] md:text-[11px] font-black uppercase tracking-wider shadow-sm whitespace-nowrap flex-shrink-0">
                                                                    <span>🥗</span> VEGETARIANO
                                                                </div>
                                                            )}
                                                            {selectedProduct.is_gluten_free && (
                                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fff2e8] border border-[#ffd8bf] text-[#d46b08] text-[9px] md:text-[11px] font-black uppercase tracking-wider shadow-sm whitespace-nowrap flex-shrink-0">
                                                                    <span>🌾</span> SIN GLUTEN
                                                                </div>
                                                            )}
                                                            {selectedProduct.is_spicy && (
                                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fff1f0] border border-[#ffa39e] text-[#cf1322] text-[9px] md:text-[11px] font-black uppercase tracking-wider shadow-sm whitespace-nowrap flex-shrink-0">
                                                                    <span>🌶️</span> PICANTE
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                </div>
                                            )}
                                        </div>

                                        {/* Modifiers Simulation */}
                                        <div className="space-y-8">
                                            {['tamanos', 'modificadores', 'opciones'].map((categoryKey) => {
                                                const groups = selectedProduct[categoryKey];
                                                if (!groups || !Array.isArray(groups)) return null;

                                                return groups.map((group, groupIdx) => (
                                                    <div key={`${categoryKey}-${groupIdx}`} className="space-y-4">
                                                        <div className="flex justify-between items-center bg-white sticky top-0 z-10 py-2 border-b border-gray-100">
                                                            <div className="space-y-1">
                                                                <h3 className="text-lg font-black text-[#111814] tracking-tight">{group.nombre}</h3>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${group.obligatorio ? 'bg-orange-50 text-orange-500 border border-orange-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                                                        {group.obligatorio ? 'Obligatorio' : 'Opcional'}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-gray-400">
                                                                        Escoge {group.seleccion_maxima === 1 ? '1 opción' : `hasta ${group.seleccion_maxima} opciones`}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-3">
                                                            {group.opciones.map((option, optIdx) => {
                                                                const isSelected = selectedModifiers.some(m => m.nombre === option.nombre);
                                                                return (
                                                                    <button
                                                                        key={`${categoryKey}-${groupIdx}-${optIdx}`}
                                                                        onClick={() => {
                                                                            if (isSelected) {
                                                                                setSelectedModifiers(prev => prev.filter(m => m.nombre !== option.nombre));
                                                                            } else {
                                                                                if (group.seleccion_maxima === 1) {
                                                                                    setSelectedModifiers(prev => [
                                                                                        ...prev.filter(m => !group.opciones.some(opt => opt.nombre === m.nombre)),
                                                                                        option
                                                                                    ]);
                                                                                } else if (selectedModifiers.filter(m => group.opciones.some(opt => opt.nombre === m.nombre)).length < group.seleccion_maxima) {
                                                                                    setSelectedModifiers(prev => [...prev, option]);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isSelected ? 'bg-[#4ADE80]/5 border-[#4ADE80] shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                                                    >
                                                                        <span className={`text-sm font-black ${isSelected ? 'text-[#111814]' : 'text-gray-600'}`}>
                                                                            {option.nombre}
                                                                        </span>
                                                                        {option.precio > 0 && (
                                                                            <span className={`text-xs font-black ${isSelected ? 'text-[#22C55E]' : 'text-gray-400'}`}>
                                                                                + {formatCurrency(option.precio)}
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ));
                                            })}
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black text-[#111814] uppercase tracking-widest opacity-40">Notas Especiales</h3>
                                            <textarea
                                                value={productNotes}
                                                onChange={(e) => setProductNotes(e.target.value)}
                                                placeholder="Ej: Sin cebolla, salsas aparte..."
                                                className="w-full h-32 p-4 bg-gray-50 border border-gray-100 rounded-[2rem] text-sm font-medium focus:outline-none focus:border-[#4ADE80] transition-all resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Sticky Actions */}
                                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50">
                                    <div className="max-w-2xl mx-auto flex items-center gap-4">
                                        <div className="flex items-center gap-4 bg-gray-100 p-2 rounded-2xl border border-gray-200">
                                            <button onClick={() => setQty(Math.max(1, qty - 1))} className="size-10 rounded-xl bg-white flex items-center justify-center text-gray-600 hover:text-[#22C55E] shadow-sm"><Minus className="w-5 h-5" /></button>
                                            <span className="text-xl font-black text-[#111814] w-6 text-center">{qty}</span>
                                            <button onClick={() => setQty(qty + 1)} className="size-10 rounded-xl bg-white flex items-center justify-center text-gray-600 hover:text-[#22C55E] shadow-sm"><Plus className="w-5 h-5" /></button>
                                        </div>
                                        <Button
                                            onClick={addToCartAndConfirm}
                                            className="flex-1 h-16 bg-[#4ADE80] hover:bg-[#22C55E] text-[#111814] rounded-2xl font-black text-xl shadow-xl shadow-[#4ADE80]/20 flex items-center justify-between px-8 group transition-all"
                                        >
                                            <div className="flex flex-col items-start leading-none">
                                                <span className="text-[10px] uppercase tracking-widest opacity-60">Agregar</span>
                                                <span>{formatCurrency((selectedProduct.precio + selectedModifiers.reduce((acc, m) => acc + (m.precio * (m.cantidad || 1)), 0)) * qty)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">Confirmar</span>
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
