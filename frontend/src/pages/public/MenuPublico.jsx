import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart, CartProvider } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ShoppingCart,
  Plus,
  Minus,
  ChevronRight,
  Loader2,
  Check,
  Phone,
  User,
  Award,
  Gift,
  Search,
  ArrowLeft,
  Star,
  CheckCircle2,
  Clock,
  UtensilsCrossed,
  ArrowRight,
  Truck,
  MapPin,
  Map,
  Navigation as NavigationIcon,
  Pizza,
  Coffee,
  Beer,
  Wine,
  Cake,
  IceCream,
  Sandwich,
  Salad,
  Soup,
  Fish,
  Drumstick,
  Beef,
  Wheat,
  Apple,
  Carrot,
  Egg,
  Milk,
  Vegan,
  GlassWater,
  Tag,
  Cookie,
  Croissant,
  Grape,
  Banana,
  Cherry,
  Citrus,
  Martini,
  CupSoda,
  Popcorn,
  Sparkles,
  ChefHat,
  CookingPot,
  Filter
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const AvailableIcons = {
  UtensilsCrossed,
  Pizza,
  Coffee,
  Beer,
  Wine,
  Cake,
  IceCream,
  Sandwich,
  Salad,
  Soup,
  Fish,
  Drumstick,
  Beef,
  Wheat,
  Apple,
  Carrot,
  Egg,
  Milk,
  Vegan,
  GlassWater,
  Tag,
  Cookie,
  Croissant,
  Grape,
  Banana,
  Cherry,
  Citrus,
  Martini,
  CupSoda,
  Popcorn
};
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// Backend API URL
const API = (import.meta.env?.VITE_BACKEND_URL || import.meta.env?.REACT_APP_BACKEND_URL) || '';


const MenuContent = () => {
  const { slug, mesa } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, addItem, updateQuantity, clearCart, total, itemCount, customerInfo, setCustomerInfo } = useCart();

  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [loading, setLoading] = useState(true);
  const [tableInfo, setTableInfo] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [shuffledAllProducts, setShuffledAllProducts] = useState([]);

  // New states for Product Detail Modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Loyalty states
  const [loyaltyConfig, setLoyaltyConfig] = useState(null);
  const [customerPoints, setCustomerPoints] = useState(null);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [discount, setDiscount] = useState(0);

  // Delivery states
  const [tipoPedido, setTipoPedido] = useState(mesa ? 'mesa' : 'takeaway');
  const [direccion, setDireccion] = useState('');
  const [distancia, setDistancia] = useState(0);
  const [costoEnvio, setCostoEnvio] = useState(0);
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [metodoEntregaNombre, setMetodoEntregaNombre] = useState('');

  const handleBack = () => {
    // If user is logged in and viewing their own menu, go back to configuration
    if (user && user.slug === slug) {
      navigate(`/dashboard/${slug}/configuracion`);
      return;
    }

    const fromDashboard = document.referrer?.includes('/dashboard/');

    if (fromDashboard && window.history.length > 2) {
      navigate(-1);
    } else if (slug) {
      navigate(`/${slug}`);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug, mesa]);

  // Fetch customer points when phone changes
  useEffect(() => {
    if (customerInfo.telefono && customerInfo.telefono.length >= 10 && loyaltyConfig?.activo) {
      fetchCustomerPoints(customerInfo.telefono);
    } else {
      setCustomerPoints(null);
      setRedeemPoints(0);
      setDiscount(0);
    }
  }, [customerInfo.telefono, loyaltyConfig]);

  const fetchData = async () => {
    try {
      const [businessRes, productsRes, loyaltyRes] = await Promise.all([
        axios.get(`${API}/api/business/${slug}`),
        axios.get(`${API}/api/products/${slug}`),
        axios.get(`${API}/api/loyalty/${slug}/config`).catch(() => ({ data: { activo: false } }))
      ]);

      setBusiness(businessRes.data);

      // Initialize payment method from active ones
      const pMethods = businessRes.data.metodos_pago || {};
      const activePM = Object.entries(pMethods)
        .filter(([_, active]) => active)
        .map(([key]) => key);

      const pLabels = {
        efectivo: 'Efectivo',
        nequi: 'Nequi',
        daviplata: 'Daviplata',
        transferencia: 'Transferencia',
        tarjeta: 'Tarjeta',
        link: 'Link de Pago'
      };

      if (activePM.length > 0) {
        setMetodoPago(pLabels[activePM[0]] || 'Efectivo');
      } else {
        setMetodoPago('Efectivo');
      }

      if (!mesa) {
        const methods = businessRes.data.metodos_entrega || {};
        const activeMethods = Object.entries(methods)
          .filter(([_, active]) => active)
          .map(([key]) => key);

        if (activeMethods.length > 0) {
          const first = activeMethods[0];
          setTipoPedido(first === 'domicilio' ? 'delivery' : first === 'mesa' ? 'mesa' : 'takeaway');
          setMetodoEntregaNombre(first === 'domicilio' ? 'Domicilio' : first === 'mesa' ? 'Mesa' : 'Para recoger');
        }
      }

      // We keep filtering by disponible as it's a public menu
      const productsData = Array.isArray(productsRes.data) ? productsRes.data : [];
      const availableProducts = productsData.filter(p => p.disponible);
      setProducts(availableProducts);
      setShuffledAllProducts([...availableProducts].sort(() => Math.random() - 0.5));
      setLoyaltyConfig(loyaltyRes.data);

      // Handle categories
      let cats = [];
      try {
        const categoriesRes = await axios.get(`${API}/api/categories/${slug}`);
        if (Array.isArray(categoriesRes.data) && categoriesRes.data.length > 0) {
          // Map string categories (legacy) to objects if necessary, though backend should return objects now
          cats = categoriesRes.data.map(c => typeof c === 'string' ? { nombre: c, icono: null } : c);
        }
      } catch (err) {
        console.log("Error fetching categories, falling back to products");
      }

      if (cats.length === 0) {
        // Fallback if API fails or returns empty
        const uniqueCats = [...new Set(productsData.map(p => p.categoria))].filter(Boolean);
        cats = uniqueCats.map(c => ({ nombre: c, icono: null }));
      }

      // Add 'Todas' at the beginning
      setCategories([{ nombre: 'Todas', icono: 'UtensilsCrossed' }, ...cats]);

      if (mesa) {
        try {
          const tableRes = await axios.get(`${API}/api/tables/${slug}/${mesa}/info`);
          setTableInfo(tableRes.data);
        } catch (e) {
          console.log('Table not found');
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar el menú');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerPoints = async (telefono) => {
    try {
      const response = await axios.get(`${API}/api/loyalty/${slug}/points/${encodeURIComponent(telefono)}`);
      setCustomerPoints(response.data);
    } catch (error) {
      setCustomerPoints(null);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleAddToCart = (product, quantity = 1) => {
    addItem(product, quantity);
    toast.success(`${product.nombre} agregado`, { duration: 1500 });
  };

  const handleProductClick = (product) => {
    if (!product.disponible) return;
    setSelectedProduct(product);
    setQty(1);
  };

  const addToCartAndConfirm = () => {
    if (!selectedProduct) return;
    addItem(selectedProduct, qty);
    setSelectedProduct(null);
    setShowSuccessModal(true);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalización no soportada por tu navegador');
      return;
    }

    setCalculatingDistance(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCustomerInfo(prev => ({ ...prev, lat: latitude, lng: longitude }));

        if (business?.lat && business?.lng) {
          const dist = calculateDistance(
            business.lat,
            business.lng,
            latitude,
            longitude
          );
          setDistancia(dist);

          // Calcular costo: (distancia * precio_km) o costo_minimo
          const precioKm = business.precio_km || 0;
          const costoMin = business.costo_minimo_domicilio || 0;
          const calculado = dist * precioKm;
          setCostoEnvio(Math.max(calculado, costoMin));

          // Intentar obtener dirección legible
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            if (data.display_name) {
              setDireccion(data.display_name);
            }
          } catch (e) {
            setDireccion(`Ubicación GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          }
        }
        setCalculatingDistance(false);
      },
      (error) => {
        let msg = 'No se pudo obtener tu ubicación';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Permiso de ubicación denegado. Actívalo en tu navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Información de ubicación no disponible.';
            break;
          case error.TIMEOUT:
            msg = 'Se agotó el tiempo para obtener la ubicación.';
            break;
          default:
            msg = 'Error desconocido al obtener ubicación.';
        }
        console.warn('Geolocation Error:', error);
        toast.error(msg);
        setCalculatingDistance(false);
      }
    );
  };

  const handleRedeemChange = (points) => {
    if (!customerPoints || !loyaltyConfig) return;
    const maxRedeemable = Math.min(customerPoints.puntos_disponibles, Math.floor(total / loyaltyConfig.valor_punto_descuento));
    const validPoints = Math.max(0, Math.min(points, maxRedeemable));
    setRedeemPoints(validPoints);
    setDiscount(validPoints * loyaltyConfig.valor_punto_descuento);
  };

  const handleSubmitOrder = async () => {
    if (!customerInfo.nombre || !customerInfo.telefono) {
      toast.error('Por favor completa tu información');
      return;
    }

    setSubmitting(true);

    try {
      // Redeem points first if applicable
      if (redeemPoints > 0 && loyaltyConfig?.activo) {
        await axios.post(`${API}/api/loyalty/${slug}/redeem`, {
          telefono: customerInfo.telefono,
          puntos_a_canjear: redeemPoints
        });
      }

      const orderData = {
        mesa_id: tableInfo?.id || null,
        mesa_numero: tableInfo?.numero || null,
        items: items.map(item => ({
          producto_id: item.producto_id,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          notas: item.notas
        })),
        cliente_nombre: customerInfo.nombre,
        cliente_telefono: customerInfo.telefono,
        tipo: tipoPedido,
        metodo_entrega: metodoEntregaNombre,
        metodo_pago: metodoPago,
        direccion: tipoPedido === 'delivery' ? direccion : null,
        distancia: tipoPedido === 'delivery' ? distancia : null,
        costo_envio: tipoPedido === 'delivery' ? costoEnvio : 0,
        notas: [
          customerInfo.notas,
          discount > 0 ? `Descuento: ${formatCurrency(discount)} (${redeemPoints} pts)` : null,
          (tipoPedido === 'delivery' && costoEnvio > 0) ? `Envío: ${formatCurrency(costoEnvio)} (${distancia.toFixed(1)} km)` : null
        ].filter(Boolean).join('. ')
      };

      const response = await axios.post(`${API}/api/orders/${slug}`, orderData);
      setOrderSuccess({ ...response.data, discount, redeemPoints });
      clearCart();
      setRedeemPoints(0);
      setDiscount(0);
      setCheckoutStep(2);
      toast.success('¡Pedido enviado!');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Error al enviar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    let matchesCategory = false;
    if (activeCategory === 'Todas') {
      matchesCategory = true;
    } else if (activeCategory === 'Destacados') {
      matchesCategory = p.destacado || p.etiqueta?.toLowerCase().includes('destacado');
    } else if (activeCategory === 'Ofertas') {
      matchesCategory = (p.precio_original && p.precio_original > p.precio) || p.etiqueta?.toLowerCase().includes('oferta');
    } else if (activeCategory === 'Menu') {
      matchesCategory = true; // All products
    } else {
      matchesCategory = p.categoria === activeCategory;
    }

    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Use shuffled list for 'Menu' view
  const displayProducts = activeCategory === 'Menu' && searchQuery === ''
    ? shuffledAllProducts
    : filteredProducts;

  // Pagination logic
  const totalPages = Math.ceil(displayProducts.length / itemsPerPage);
  const currentItems = displayProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
    if (activeCategory === 'Menu') {
      setShuffledAllProducts([...products].sort(() => Math.random() - 0.5));
    }
  }, [activeCategory, searchQuery, products]);

  // Separate sections for 'Todas' view
  const destacados = products.filter(p => p.destacado || p.etiqueta?.toLowerCase().includes('destacado'));
  const ofertas = products.filter(p => (p.precio_original && p.precio_original > p.precio) || p.etiqueta?.toLowerCase().includes('oferta'));
  // "Nuestros Productos" should show EVERYTHING in order of creation
  const principales = [...products];

  const ProductCard = ({ product }) => (
    <motion.div
      layout
      key={product.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => handleProductClick(product)}
      className={`group bg-white rounded-[2rem] overflow-hidden border border-[#f0f4f2] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full cursor-pointer ${!product.disponible ? 'opacity-60 grayscale' : ''}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={product.imagen || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"}
          alt={product.nombre}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Promotional Tag Badge */}
        {product.etiqueta && (
          <div className="absolute top-2 left-2 z-20">
            <div className="bg-[#22C55E] text-[#111814] text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-md border border-white/10 flex items-center gap-1 ring-1 ring-white/20">
              <div className="size-1 rounded-full bg-white animate-pulse" />
              {product.etiqueta}
            </div>
          </div>
        )}

        {/* Offer Percentage Badge */}
        {(product.oferta_porcentaje || (product.precio_original && product.precio_original > product.precio)) && (
          <div className="absolute top-2 right-2 z-20">
            <div className="bg-[#ff4b4b] text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-md border border-white/20 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 fill-white" />
              {product.oferta_porcentaje ? `-${product.oferta_porcentaje}%` : 'OFERTA'}
            </div>
          </div>
        )}

        {!product.disponible && (
          <div className="absolute inset-0 bg-[#618972]/80 backdrop-blur-sm flex items-center justify-center">
            <span className="bg-white/20 backdrop-blur border border-white/50 text-white font-black px-6 py-2 rounded-full text-sm uppercase tracking-widest">
              Agotado
            </span>
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
          {product.descripcion || "Disfruta de nuestra especialidad preparada con los mejores ingredientes."}
        </p>
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#f0f4f2]">
          <div className="flex flex-col">
            <span className="text-xl font-black text-[#111814]">{formatCurrency(product.precio)}</span>
            {product.precio_original && product.precio_original > product.precio && (
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

  const ProductSection = ({ title, items, onSeeAll, rows = 1 }) => (
    <div className="mb-16">
      <div className="flex justify-between items-center mb-6 px-2">
        <h2 className="text-2xl font-black text-[#111814] tracking-tighter flex items-center gap-2">
          {title}
        </h2>
        <button
          onClick={onSeeAll}
          className="flex h-8 items-center justify-center rounded-full px-4 bg-white border border-[#f0f4f2] text-[#618972] hover:border-[#22C55E] hover:text-[#22C55E] transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest shadow-sm"
        >
          Ver todo
        </button>
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

  const finalTotal = total - discount + (tipoPedido === 'delivery' ? costoEnvio : 0);
  const potentialPoints = loyaltyConfig?.activo ? Math.floor(finalTotal / loyaltyConfig.pesos_por_punto) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f8f7]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22C55E]" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f6f8f7] p-4 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <UtensilsCrossed className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-[#111814] mb-2">Página no disponible</h1>
        <p className="text-[#618972] max-w-xs mb-8">El restaurante que buscas no existe o ha cambiado su nombre.</p>
        <Button onClick={() => navigate('/')} className="bg-[#22C55E] hover:bg-[#16A34A] text-[#111814] px-8 h-12 rounded-xl font-bold">
          Ir al inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8f7] font-sans text-[#111814] antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-800 shadow-sm">
        <div className="px-4 md:px-10 py-3 max-w-[1200px] mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <Link to={`/${slug}`} className="flex items-center gap-3 group">
              <div className="size-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                <img
                  src={business.logo_url || `https://ui-avatars.com/api/?name=${business.nombre || 'MenuPro'}&background=22C55E&color=fff&bold=true`}
                  alt={business.nombre || 'Logo'}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${business.nombre || 'MenuPro'}&background=22C55E&color=fff&bold=true`;
                  }}
                />
              </div>
              <h2 className="hidden md:block text-xl font-black tracking-tighter text-[#111814] truncate max-w-[200px]">
                {business.nombre}
              </h2>
            </Link>
          </div>

          <div className="flex-1 max-w-xl mx-8 hidden sm:block lg:hidden">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#618972] group-focus-within:text-[#22C55E] transition-colors">
                <Search className="w-full h-full" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tu antojo..."
                className="w-full h-11 bg-gray-100 border-none rounded-2xl pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#22C55E]/50 transition-all placeholder:text-[#618972]"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/${slug}/mi-cuenta`)}
              className="relative size-11 rounded-full bg-white border border-gray-100 flex items-center justify-center hover:bg-[#22C55E]/10 hover:border-[#22C55E] transition-all hover:scale-105 active:scale-95 group shadow-sm"
            >
              <User className="w-5 h-5 text-[#111814] group-hover:text-[#22C55E]" />
            </button>
            <button
              onClick={() => { setCartOpen(true); setCheckoutStep(1); }}
              className="relative size-11 rounded-full bg-[#111814] flex items-center justify-center hover:bg-[#22C55E] transition-all hover:scale-105 active:scale-95 group shadow-lg shadow-[#111814]/20"
            >
              <ShoppingCart className="w-5 h-5 text-white group-hover:text-[#111814]" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#22C55E] text-[10px] font-black text-[#111814] ring-2 ring-white group-hover:bg-white group-hover:text-[#22C55E]">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">
        {/* Table Info Banner */}
        {tableInfo && (
          <div className="mb-8 p-3 rounded-2xl bg-[#22C55E] text-[#111814] flex items-center justify-center gap-3 font-bold shadow-lg shadow-[#22C55E]/20">
            <div className="bg-white/20 p-1 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span>Mesa {tableInfo.numero} · {tableInfo.capacidad} personas</span>
          </div>
        )}

        <div className="mb-10">
          <div className="relative w-full h-80 md:h-[450px] rounded-[2.5rem] overflow-hidden group shadow-2xl border border-white">
            <div className="absolute inset-0 bg-gradient-to-t from-[#102218] via-[#102218]/50 to-transparent z-10" />
            <img
              src={business.banner_url || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80"}
              alt="Banner"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />

            <div className="absolute top-6 left-6 z-20">
              <span className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-black text-[#111814] bg-[#22C55E] rounded-full uppercase tracking-[0.2em] shadow-lg shadow-[#22C55E]/20">
                <Star className="w-3 h-3 fill-[#111814]" />
                {business.banner_tag || 'Los mejores sabores'}
              </span>
            </div>

            <div className="absolute bottom-0 left-0 p-6 md:p-12 z-20 w-full pb-20 md:pb-24">
              <h1 className="text-3xl md:text-6xl font-black text-white mb-2 tracking-tighter leading-none">{business.banner_title || 'Nuestro Menú'}</h1>
              <p className="text-gray-300 text-sm md:text-lg max-w-xl font-medium leading-relaxed line-clamp-2 md:line-clamp-none">
                {business.banner_description || business.slogan || "Descubre una explosión de sabores preparados con pasión."}
              </p>
            </div>
          </div>

          {/* New Hero Search Bar */}
          <div className="relative z-30 -mt-10 max-w-3xl mx-auto px-4">
            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#618972] group-focus-within:text-[#22C55E] transition-colors">
                <Search className="w-full h-full" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Busquemos la comida que te gusta..."
                className="w-full h-14 bg-white border border-transparent rounded-full pl-14 pr-16 text-base font-medium shadow-xl hover:border-[#22C55E] focus:outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/50 transition-all placeholder:text-[#a0b5ab] text-[#111814]"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={`p-2.5 rounded-full border transition-colors shadow-sm active:scale-95 ${filterOpen ? 'bg-[#22C55E] border-[#22C55E] text-[#111814]' : 'bg-gray-50 border-gray-100 text-[#618972] hover:text-[#22C55E]'}`}
                >
                  <Filter className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {filterOpen && (
                  <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                      Filtrar por
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                      {categories.map((cat, idx) => {
                        const catName = typeof cat === 'string' ? cat : cat.nombre;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setActiveCategory(catName);
                              setFilterOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 ${activeCategory === catName ? 'text-[#22C55E]' : 'text-[#111814]'
                              }`}
                          >
                            {catName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Category Controls - Positioned below search */}
        {/* Category Controls - Sticky on Mobile */}
        {/* Category Controls */}
        <div className="mb-8 md:mb-12 transition-all px-2 md:px-0">
          <div className="flex flex-wrap justify-center md:justify-start gap-2 md:overflow-x-auto md:flex-nowrap md:pb-4 md:no-scrollbar">
            {categories.map((catObj, idx) => {
              const catName = typeof catObj === 'string' ? catObj : catObj.nombre;
              const catIcon = typeof catObj === 'object' ? catObj.icono : null;

              const isUrl = catIcon?.includes('/') || catIcon?.includes('http');
              const isLucide = catIcon && AvailableIcons[catIcon];
              const IconComponent = isLucide ? AvailableIcons[catIcon] : UtensilsCrossed;

              return (
                <button
                  key={idx}
                  onClick={() => setActiveCategory(catName)}
                  className={`
                    flex h-8 md:h-10 shrink-0 items-center justify-center gap-x-1.5 rounded-full px-4 md:px-5 transition-all active:scale-95 font-bold text-[9px] md:text-xs uppercase tracking-wide
                    ${activeCategory === catName
                      ? 'bg-[#22C55E] text-[#111814] shadow-md shadow-[#22C55E]/20 scale-105 ring-2 ring-white'
                      : 'bg-white border border-gray-100 text-gray-400 hover:border-[#22C55E] hover:text-[#111814] shadow-sm'
                    }
                  `}
                >
                  {isUrl ? (
                    <img src={catIcon} alt="" className="w-3 md:w-4 h-3 md:h-4 object-contain" />
                  ) : isLucide ? (
                    <IconComponent className="w-3 md:w-4 h-3 md:h-4" />
                  ) : catIcon ? (
                    <span className="text-sm md:text-lg leading-none">{catIcon}</span>
                  ) : (
                    <IconComponent className="w-3 md:w-4 h-3 md:h-4" />
                  )}
                  <span>{catName}</span>
                </button>
              );
            })}
          </div>
        </div>



        {/* Sections or Grid */}
        {activeCategory === 'Todas' && searchQuery === '' ? (
          <div className="pb-32">
            {tableInfo && (
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-[#f0f4f2] mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-[#22C55E]/10 p-3 rounded-full">
                    <User className="w-6 h-6 text-[#22C55E]" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-[#111814]">Bienvenido a la Mesa {tableInfo.numero}</h3>
                    <p className="text-gray-500 text-sm">Escanea el QR de la mesa para vincular tu pedido</p>
                  </div>
                </div>
              </div>
            )}

            {destacados.length > 0 && (
              <ProductSection
                title="✨ Recomendados"
                items={destacados}
                onSeeAll={() => setActiveCategory('Destacados')}
              />
            )}

            {ofertas.length > 0 && (
              <ProductSection
                title="🔥 Ofertas Especiales"
                items={ofertas}
                onSeeAll={() => setActiveCategory('Ofertas')}
              />
            )}

            {principales.length > 0 && (
              <ProductSection
                title="🥘 Nuestros Productos"
                items={principales}
                onSeeAll={() => setActiveCategory('Menu')}
                rows={3}
              />
            )}
          </div>
        ) : (
          <div className="space-y-12 pb-32">
            <div className="flex justify-between items-center mb-6 px-2">
              <h2 className="text-2xl font-black text-[#111814] tracking-tighter flex items-center gap-2">
                {(() => {
                  if (activeCategory === 'Destacados') {
                    return <><Sparkles className="w-6 h-6 text-[#22C55E]" /> <span>✨ Recomendados</span></>;
                  }
                  if (activeCategory === 'Ofertas') {
                    return <><div className="text-[#22C55E] text-xl">🔥</div> <span>Ofertas Especiales</span></>;
                  }
                  if (activeCategory === 'Menu') {
                    return <><CookingPot className="w-6 h-6 text-[#22C55E]" /> <span>🥘 Nuestros Productos</span></>;
                  }
                  if (activeCategory === 'Todas') {
                    return <><UtensilsCrossed className="w-6 h-6 text-[#22C55E]" /> <span>Todas</span></>;
                  }

                  const currentCat = categories.find(c => (c.nombre || c) === activeCategory);
                  const catIcon = typeof currentCat === 'object' ? currentCat.icono : null;

                  const isUrl = catIcon?.includes('/') || catIcon?.includes('http');
                  const isLucide = catIcon && AvailableIcons[catIcon];
                  const IconComp = isLucide ? AvailableIcons[catIcon] : UtensilsCrossed;

                  return (
                    <>
                      {isUrl ? (
                        <img src={catIcon} alt="" className="w-6 h-6 object-contain" />
                      ) : isLucide ? (
                        <IconComp className="w-6 h-6 text-[#22C55E]" />
                      ) : catIcon ? (
                        <span className="text-xl">{catIcon}</span>
                      ) : (
                        <UtensilsCrossed className="w-6 h-6 text-[#22C55E]" />
                      )}
                      <span>{activeCategory}</span>
                    </>
                  );
                })()}
              </h2>
              {activeCategory !== 'Todas' && (
                <button
                  onClick={() => setActiveCategory('Todas')}
                  className="flex h-8 items-center justify-center rounded-full px-4 bg-white border border-[#f0f4f2] text-[#618972] hover:border-[#22C55E] hover:text-[#22C55E] transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest shadow-sm"
                >
                  Volver al inicio
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {currentItems.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12 py-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border-[#f0f4f2] h-11 px-6 font-bold text-[#618972]"
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`size-10 rounded-xl font-black text-sm transition-all ${currentPage === i + 1 ? 'bg-[#22C55E] text-[#111814] shadow-lg shadow-[#22C55E]/20' : 'bg-white text-[#618972] border border-[#f0f4f2] hover:border-[#22C55E]'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl border-[#f0f4f2] h-11 px-6 font-bold text-[#618972]"
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        )}

        {
          filteredProducts.length === 0 && (
            <div className="text-center py-20">
              <div className="size-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                <Search className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-[#111814] mb-2">No encontramos nada</h3>
              <p className="text-[#618972]">Intenta buscar con otras palabras o cambia la categoría.</p>
            </div>
          )
        }
      </main>

      {/* Floating Action Button (Cart) */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-4"
          >
            <button
              onClick={() => { setCartOpen(true); setCheckoutStep(1); }}
              className="w-full max-w-md bg-[#22C55E] hover:bg-[#16A34A] text-[#111814] rounded-full shadow-[0_20px_50px_rgba(19,236,109,0.3)] flex items-center pl-6 pr-8 py-4 gap-4 transform transition-all hover:scale-[1.02] active:scale-95 group border-2 border-white/20"
            >
              <div className="relative size-12 bg-white rounded-2xl flex items-center justify-center shadow-inner">
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#111814] text-[11px] font-black text-white ring-2 ring-[#22C55E]">
                  {itemCount}
                </span>
              </div>
              <div className="flex flex-col items-start leading-none flex-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Ver pedido</span>
                <span className="text-xl font-black">{formatCurrency(total)}</span>
              </div>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform stroke-[3]" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Sheet */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="h-[90vh] sm:h-[85vh] rounded-t-[3rem] border-none shadow-[0_-20px_50px_rgba(0,0,0,0.1)] p-0" aria-describedby="sheet-description">
          <div className="h-2 bg-gray-100 w-16 rounded-full mx-auto mt-4 mb-2 md:hidden" />
          <div className="px-6 md:px-10 py-6 md:py-8 h-full flex flex-col max-w-5xl mx-auto w-full">
            <SheetHeader className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]">
                    {checkoutStep === 0 && <ShoppingCart className="w-6 h-6" />}
                    {checkoutStep === 1 && <User className="w-6 h-6" />}
                  </div>
                  <div>
                    <SheetTitle className="text-2xl font-black text-[#111814] tracking-tighter">
                      {checkoutStep === 1 ? 'Completa tu pedido' : '¡Recibido!'}
                    </SheetTitle>
                    <SheetDescription id="sheet-description" className="text-xs font-bold text-[#618972] uppercase tracking-[0.1em]">
                      {checkoutStep === 1 ? 'Revisa y confirma tus datos' : 'Pedido enviado con éxito'}
                    </SheetDescription>
                  </div>
                </div>

                {/* Mi Cesta Top Right Indicator */}
                {checkoutStep === 1 && (
                  <div className="flex flex-col items-end">
                    <div className="size-10 bg-[#22C55E] rounded-full flex items-center justify-center text-[#111814] shadow-lg shadow-[#22C55E]/30 mb-1">
                      <ShoppingCart className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#111814]">Mi Cesta</span>
                  </div>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
              {/* Combined Checkout View */}
              {/* Combined Checkout View */}
              {checkoutStep === 1 && (
                <div className="space-y-8">

                  {/* Section 1: Detalle del Pedido (Moved to Top) */}
                  <div className="space-y-4">
                    {/* Title Optional since we have it in header, but keeping for structure */}
                    <h3 className="text-lg font-black text-[#111814] flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" /> Detalle del Pedido
                    </h3>
                    <div className="space-y-4">
                      {items.map((item, index) => (
                        <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white rounded-[1.5rem] border border-gray-100 shadow-xl shadow-gray-100/50 relative overflow-hidden group">
                          {/* Remove Button top right */}
                          <button
                            onClick={() => updateQuantity(index, 0)}
                            className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors z-10 p-1 hover:bg-gray-100 rounded-full"
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          {/* Image - Wider and always visible */}
                          <div className="w-full sm:w-24 h-32 sm:h-24 rounded-2xl overflow-hidden shrink-0 bg-gray-100 self-center sm:self-auto">
                            <img
                              src={item.imagen || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"}
                              alt={item.nombre}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>

                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-[#111814] text-base leading-tight pr-6">{item.nombre}</h4>
                            </div>
                            <p className="text-lg font-black text-[#22C55E] mb-3">{formatCurrency(item.precio_unitario)}</p>

                            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-1.5 w-fit">
                              <button
                                className="size-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-[#111814] hover:bg-gray-100 active:scale-95 disabled:opacity-50"
                                onClick={() => updateQuantity(index, item.cantidad - 1)}
                                disabled={item.cantidad <= 1}
                              >
                                <Minus className="w-4 h-4 stroke-[3]" />
                              </button>
                              <span className="text-base font-black text-[#111814] min-w-[1.5rem] text-center">{item.cantidad}</span>
                              <button
                                className="size-8 bg-[#111814] text-white rounded-lg shadow-sm flex items-center justify-center hover:bg-black active:scale-95"
                                onClick={() => updateQuantity(index, item.cantidad + 1)}
                              >
                                <Plus className="w-4 h-4 stroke-[3]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-4">Tu carrito está vacío.</p>
                      )}
                    </div>
                  </div>

                  {/* Section 2: Customer Data */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-[#111814] flex items-center gap-2">
                      <User className="w-5 h-5" /> Datos del Cliente
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="nombre" className="text-xs font-black uppercase tracking-widest text-[#618972] ml-2">Nombre</Label>
                        <Input
                          id="nombre"
                          value={customerInfo.nombre}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, nombre: e.target.value })}
                          placeholder="Tu nombre"
                          className="h-12 bg-white border-gray-200 rounded-2xl focus:ring-[#22C55E]/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="telefono" className="text-xs font-black uppercase tracking-widest text-[#618972] ml-2">Teléfono</Label>
                        <Input
                          id="telefono"
                          type="tel"
                          value={customerInfo.telefono}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, telefono: e.target.value })}
                          placeholder="300 000 0000"
                          className="h-12 bg-white border-gray-200 rounded-2xl focus:ring-[#22C55E]/20"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="notas" className="text-xs font-black uppercase tracking-widest text-[#618972] ml-2">Observaciones del pedido</Label>
                      <textarea
                        id="notas"
                        value={customerInfo.notas || ''}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, notas: e.target.value })}
                        placeholder="Ej: Sin cebolla, extra salsa..."
                        className="w-full min-h-[80px] p-4 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#22C55E]/20 resize-y"
                      />
                    </div>
                  </div>

                  {/* Section 3: Delivery Address (Only if Delivery, Below Customer Data) */}
                  {tipoPedido === 'delivery' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="relative group">
                        <Label htmlFor="direccion" className="text-xs font-black uppercase tracking-widest text-[#618972] ml-2 mb-2 block">Dirección de Entrega</Label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#618972]" />
                          <Input
                            id="direccion"
                            value={direccion}
                            onChange={(e) => setDireccion(e.target.value)}
                            placeholder="Calle, Carrera, Edificio, Apto..."
                            className="h-14 pl-12 bg-gray-50 border-gray-100 rounded-2xl text-base font-medium focus:ring-2 focus:ring-[#22C55E]/20 transition-all"
                          />
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={handleGetLocation}
                        disabled={calculatingDistance}
                        className="w-full h-12 rounded-2xl border-2 border-dashed border-[#22C55E]/30 text-[#618972] font-black text-xs gap-2 hover:bg-[#22C55E]/5 transition-all"
                      >
                        {calculatingDistance ? <Loader2 className="w-4 h-4 animate-spin" /> : <NavigationIcon className="w-4 h-4" />}
                        CALCULAR DISTANCIA CON MI CERCANÍA
                      </Button>

                      {distancia > 0 && (
                        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#22C55E]/20 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="size-10 bg-[#22C55E]/10 rounded-xl flex items-center justify-center text-[#22C55E]">
                              <Truck className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-[#111814] uppercase tracking-tighter">Costo Envío ({distancia.toFixed(1)} km)</p>
                              <p className="text-lg font-black text-[#22C55E]">{formatCurrency(costoEnvio)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-[#618972] italic">Calculado automáticamente</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Section 4: Order Type (At the end) */}
                  {!tableInfo && business.metodos_entrega && (
                    <div className="space-y-3">
                      <Label className="text-xs font-black uppercase tracking-widest text-[#618972] ml-2 block">Método de Entrega</Label>
                      <div className="bg-gray-50 p-2 rounded-[2rem] flex flex-wrap gap-2">
                        {business.metodos_entrega.domicilio && (
                          <button
                            onClick={() => {
                              setTipoPedido('delivery');
                              setMetodoEntregaNombre('Domicilio');
                            }}
                            className={`flex-1 md:flex-none md:w-48 min-w-[120px] py-3 px-4 rounded-2xl font-black text-[10px] tracking-widest transition-all border-2 ${tipoPedido === 'delivery' ? 'bg-[#22C55E] border-[#22C55E] text-[#111814] shadow-lg' : 'bg-white border-[#22C55E]/30 text-[#111814] hover:border-[#22C55E]'}`}
                          >
                            DOMICILIO
                          </button>
                        )}
                        {business.metodos_entrega.recoger && (
                          <button
                            onClick={() => {
                              setTipoPedido('takeaway');
                              setMetodoEntregaNombre('Para recoger');
                            }}
                            className={`flex-1 md:flex-none md:w-48 min-w-[120px] py-3 px-4 rounded-2xl font-black text-[10px] tracking-widest transition-all border-2 ${tipoPedido === 'takeaway' ? 'bg-[#22C55E] border-[#22C55E] text-[#111814] shadow-lg' : 'bg-white border-[#22C55E]/30 text-[#111814] hover:border-[#22C55E]'}`}
                          >
                            PARA RECOGER
                          </button>
                        )}
                        {business.metodos_entrega.mesa && !mesa && (
                          <button
                            onClick={() => {
                              setTipoPedido('mesa');
                              setMetodoEntregaNombre('Mesa');
                            }}
                            className={`flex-1 md:flex-none md:w-48 min-w-[120px] py-3 px-4 rounded-2xl font-black text-[10px] tracking-widest transition-all border-2 ${tipoPedido === 'mesa' ? 'bg-[#22C55E] border-[#22C55E] text-[#111814] shadow-lg' : 'bg-white border-[#22C55E]/30 text-[#111814] hover:border-[#22C55E]'}`}
                          >
                            MESA
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section 5: Payment Method (At the end) */}
                  {(() => {
                    const pMethods = business.metodos_pago || {};
                    const activePM = Object.entries(pMethods)
                      .filter(([_, active]) => active)
                      .map(([key]) => ({
                        key,
                        label: {
                          efectivo: 'Efectivo',
                          nequi: 'Nequi',
                          daviplata: 'Daviplata',
                          transferencia: 'Transferencia',
                          tarjeta: 'Tarjeta / Datáfono',
                          link: 'Link de Pago'
                        }[key] || key
                      }));

                    if (activePM.length === 0) return null;

                    return (
                      <div className="space-y-3">
                        <Label className="text-xs font-black uppercase tracking-widest text-[#618972] ml-2 block">Método de Pago</Label>
                        <div className="flex flex-wrap gap-2">
                          {activePM.map((m) => (
                            <button
                              key={m.key}
                              onClick={() => setMetodoPago(m.label)}
                              className={`flex-1 md:flex-none md:w-48 min-w-[120px] py-3 px-4 rounded-2xl font-black text-[10px] tracking-widest transition-all border-2 ${metodoPago === m.label ? 'bg-[#22C55E] text-[#111814] border-[#22C55E] shadow-lg' : 'bg-white text-[#111814] border-[#22C55E]/30 hover:border-[#22C55E]'}`}
                            >
                              {m.label.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Section 6: Loyalty Points */}
                  {loyaltyConfig?.activo && customerPoints && customerPoints.puntos_disponibles > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#22C55E]/5 rounded-[2rem] p-6 border border-[#22C55E]/20"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 bg-[#22C55E] rounded-2xl flex items-center justify-center text-[#111814] shadow-lg shadow-[#22C55E]/20">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="font-black text-sm text-[#111814] block">Tus Puntos MenuPro</span>
                          <span className="text-xs font-bold text-[#22C55E]">{customerPoints.puntos_disponibles.toLocaleString()} disponibles</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            value={redeemPoints}
                            onChange={(e) => handleRedeemChange(parseInt(e.target.value) || 0)}
                            max={customerPoints.puntos_disponibles}
                            className="h-12 w-28 text-center font-black rounded-xl border-[#22C55E]/30"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-[#111814]">Canjear puntos</p>
                            <p className="text-xs font-medium text-green-600">Equivale a {formatCurrency(discount)} de descuento</p>
                          </div>
                        </div>
                        <p className="text-[10px] font-black text-[#618972] uppercase tracking-wider">
                          Mínimo {loyaltyConfig.puntos_minimo_canje} pts · 1 punto = {formatCurrency(loyaltyConfig.valor_punto_descuento)}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Section 7: Order Summary */}
                  <div className="bg-gray-50 rounded-[2rem] p-6 space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#618972]">Resumen del Pedido</h3>
                    <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                      <span>Subtotal</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                    {tipoPedido === 'delivery' && (
                      <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                        <span>Envío ({distancia.toFixed(1)} km)</span>
                        <span>{formatCurrency(costoEnvio)}</span>
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="flex justify-between items-center text-sm font-medium text-[#22C55E]">
                        <span>Descuento Puntos</span>
                        <span>- {formatCurrency(discount)}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                      <span className="font-black text-xl text-[#111814]">Total</span>
                      <span className="font-black text-2xl text-[#111814]">{formatCurrency(finalTotal)}</span>
                    </div>
                  </div>
                  {/* Earn points tip */}
                  {loyaltyConfig?.activo && potentialPoints > 0 && (
                    <div className="bg-gray-100 rounded-3xl p-4 flex items-center gap-4">
                      <div className="size-10 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-gray-200">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111814]">¡Gana con esta compra!</p>
                        <p className="text-xs font-medium text-[#618972]">Acumularás <strong>{potentialPoints} puntos</strong></p>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitOrder}
                    disabled={submitting || !customerInfo.nombre || !customerInfo.telefono || (tipoPedido === 'delivery' && !direccion) || items.length === 0}
                    className="w-full h-16 rounded-2xl bg-[#22C55E] text-[#111814] font-black text-xl shadow-xl hover:bg-[#16A34A] disabled:opacity-50 disabled:bg-gray-200 transition-all mt-4 border-2 border-[#22C55E]"
                  >
                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Pedir Ahora'}
                  </Button>
                </div>
              )}

              {/* Step 2: Success */}
              {checkoutStep === 2 && orderSuccess && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
                  <div className="size-24 bg-[#22C55E] rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-[#22C55E]/40 relative">
                    <Check className="w-12 h-12 text-[#111814] stroke-[4]" />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -inset-2 border-2 border-[#22C55E] rounded-[2.5rem] opacity-30"
                    />
                  </div>
                  <h3 className="text-3xl font-black text-[#111814] mb-2 tracking-tighter">¡Pedido Exitoso!</h3>
                  <p className="text-[#618972] font-medium mb-8">Nuestra cocina ya recibió tu orden #{orderSuccess.id.slice(0, 8).toUpperCase()}</p>

                  <div className="bg-gray-50 rounded-[2rem] p-6 mb-8 border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-black text-[#618972] uppercase tracking-widest">Resumen Total</span>
                      <span className="text-2xl font-black text-[#22C55E]">{formatCurrency(orderSuccess.total - (orderSuccess.discount || 0))}</span>
                    </div>
                    {orderSuccess.discount > 0 && (
                      <p className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full inline-block">
                        Descuento aplicado: {formatCurrency(orderSuccess.discount)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => navigate(`/${slug}/mis-pedidos?order=${orderSuccess.id}`)}
                      className="w-full h-14 bg-[#22C55E] hover:bg-[#16A34A] text-[#111814] rounded-2xl font-black text-lg gap-3 shadow-lg shadow-[#22C55E]/20"
                    >
                      Rastrear mi pedido
                      <ArrowRight className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" onClick={() => { setCartOpen(false); setCheckoutStep(0); }} className="w-full text-[#618972] font-bold">
                      Seguir navegando
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer Actions for Cart/Checkout */}
            {checkoutStep < 2 && (
              <div className="pt-8 mt-auto border-t border-gray-100 space-y-4 pb-12">
                <div className="flex flex-col gap-2">
                  {discount > 0 && (
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-[#618972]">Descuento canjeado</span>
                      <span className="text-red-500">-{formatCurrency(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-[#618972] uppercase tracking-[0.2em] mb-1">Total a pagar</p>
                      <p className="text-4xl font-black text-[#111814] tracking-tighter">{formatCurrency(finalTotal)}</p>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-md w-full p-0 overflow-hidden rounded-[2.5rem] bg-white border-none shadow-2xl" aria-describedby="product-description">
          <DialogHeader className="sr-only">
            <DialogTitle>Detalles del Producto</DialogTitle>
            <DialogDescription id="product-description">Vista detallada del producto seleccionado con opciones de personalización.</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="flex flex-col max-h-[90vh]">
              <div className="relative h-64 shrink-0 bg-gray-100">
                <img
                  src={selectedProduct.imagen || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"}
                  alt={selectedProduct.nombre}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 bg-[#22C55E]/80 backdrop-blur-md text-[#111814] p-2 rounded-full hover:bg-[#22C55E] transition-colors shadow-lg"
                >
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-2xl font-black text-[#111814] leading-tight">{selectedProduct.nombre}</h2>
                  {selectedProduct.etiqueta && (
                    <span className="bg-[#22C55E] text-[#111814] text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ml-2 whitespace-nowrap">
                      {selectedProduct.etiqueta}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <span className="text-2xl font-black text-[#22C55E]">{formatCurrency(selectedProduct.precio)}</span>
                  {selectedProduct.precio_original && (
                    <span className="text-sm font-bold text-gray-400 line-through decoration-2">
                      {formatCurrency(selectedProduct.precio_original)}
                    </span>
                  )}
                </div>

                <div className="space-y-4 mb-8">
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-[#111814] uppercase tracking-widest">Descripción</h3>
                    <p className="text-[#618972] font-medium leading-relaxed text-sm">
                      {selectedProduct.descripcion || "Plato preparado con ingredientes frescos y seleccionados."}
                    </p>
                  </div>
                  {/* Placeholder for ingredients or other details if available */}
                </div>

                {/* Quantity & Add Action */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-1.5 border border-gray-100">
                      <button
                        onClick={() => setQty(Math.max(1, qty - 1))}
                        className="size-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#111814] hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50"
                        disabled={qty <= 1}
                      >
                        <Minus className="w-4 h-4 stroke-[3]" />
                      </button>
                      <span className="text-lg font-black text-[#111814] w-4 text-center">{qty}</span>
                      <button
                        onClick={() => setQty(qty + 1)}
                        className="size-10 rounded-xl bg-[#22C55E] text-[#111814] shadow-md flex items-center justify-center hover:bg-[#16A34A] active:scale-95 transition-all"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                    <Button
                      onClick={addToCartAndConfirm}
                      className="flex-1 h-14 bg-[#22C55E] hover:bg-[#16A34A] text-[#111814] rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-[#22C55E]/20 active:scale-95 transition-all"
                    >
                      Añadir {formatCurrency(selectedProduct.precio * qty)}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success / Added to Cart Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-sm w-full rounded-[2.5rem] border-none shadow-2xl p-8 bg-white text-center" aria-describedby="success-description">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-[#111814] mb-2">¡Producto añadido!</DialogTitle>
            <DialogDescription id="success-description" className="text-[#618972] font-medium mb-8">
              El producto se ha añadido correctamente a tu carrito de compras.
            </DialogDescription>
          </DialogHeader>

          <div className="mx-auto size-16 bg-[#22C55E]/20 rounded-full flex items-center justify-center mb-4 text-[#22C55E]">
            <CheckCircle2 className="w-8 h-8 stroke-[3]" />
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setCartOpen(true);
                setCheckoutStep(1); // CORRECT: Direct to combined checkout view
              }}
              className="w-full h-12 bg-[#22C55E] hover:bg-[#16A34A] text-[#111814] font-black rounded-xl shadow-lg shadow-[#22C55E]/20"
            >
              Ver Cesta
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowSuccessModal(false)}
              className="w-full h-12 text-[#618972] font-bold hover:bg-gray-50 rounded-xl"
            >
              Seguir comprando
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function MenuPublico() {
  return (
    <CartProvider>
      <MenuContent />
    </CartProvider>
  );
}
