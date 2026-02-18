import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import axios from 'axios';
import { Clock, Check, ChefHat, Truck, Package, RefreshCw, Phone, ArrowLeft, Smartphone, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

// Backend API URL
const API = (import.meta.env?.VITE_BACKEND_URL || import.meta.env?.REACT_APP_BACKEND_URL) || '';


export default function MisPedidos() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [business, setBusiness] = useState(null);
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API}/api/business/${slug}`);
        setBusiness(response.data);

        const orderId = searchParams.get('order');
        const token = localStorage.getItem('client_token');

        // If logged in, prioritize fetching via authenticated endpoint
        if (token) {
          try {
            const api = axios.create({
              baseURL: API || '',
              headers: { Authorization: `Bearer ${token}` }
            });
            const clientOrdersRes = await api.get('/api/client/orders');
            if (clientOrdersRes.data && clientOrdersRes.data.length > 0) {
              setOrders(clientOrdersRes.data);

              if (orderId) {
                const found = clientOrdersRes.data.find(o => o.id === orderId);
                if (found) setSelectedOrder(found);
              } else {
                // Optional: Select most recent if no ID? User asked to track A order, so maybe not.
              }
              setLoading(false);
              return; // Skip guest fetch if auth successful
            }
          } catch (e) {
            console.error("Auth fetch failed", e);
            // Fallback to guest logic
          }
        }

        if (orderId) {
          const orderRes = await axios.get(`${API}/api/orders/${slug}/track/${orderId}`);
          setSelectedOrder(orderRes.data);
          setOrders([orderRes.data]);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug, searchParams]);

  // Real-time tracking polling
  useEffect(() => {
    let interval;
    if (selectedOrder && (selectedOrder.estado === 'enviado' || selectedOrder.estado === 'listo')) {
      interval = setInterval(() => {
        refreshOrder();
      }, 5000); // Pool every 5 seconds
    }
    return () => clearInterval(interval);
  }, [selectedOrder?.id, selectedOrder?.estado]);

  const searchOrders = async () => {
    if (!phone) return;
    setSearching(true);
    try {
      const response = await axios.get(`${API}/api/orders/${slug}/my-orders?telefono=${encodeURIComponent(phone)}`);
      setOrders(response.data);
      if (response.data.length > 0) setSelectedOrder(response.data[0]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSearching(false);
    }
  };

  const refreshOrder = async () => {
    if (!selectedOrder) return;
    try {
      const response = await axios.get(`${API}/api/orders/${slug}/track/${selectedOrder.id}`);
      setSelectedOrder(response.data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22C55E]" />
      </div>
    );
  }

  return (
    <PublicLayout businessName={business?.nombre} businessLogo={business?.logo_url} slug={slug}>
      <div className="max-w-lg mx-auto px-6 py-10 min-h-[80vh]">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <Link
              to={`/${slug}`}
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#618972] mb-4 hover:text-[#22C55E] transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Volver al Menú
            </Link>
            <h1 className="text-4xl font-black text-[#111814] tracking-tighter leading-none">Mis Pedidos</h1>
          </div>
          <div className="size-14 rounded-2xl bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]">
            <Smartphone className="w-8 h-8" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {selectedOrder ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              key="timeline"
            >
              <OrderTimeline order={selectedOrder} onRefresh={refreshOrder} onReset={() => { setSelectedOrder(null); setOrders([]); }} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key="search"
            >
              <SearchSection phone={phone} setPhone={setPhone} searchOrders={searchOrders} searching={searching} />
            </motion.div>
          )}
        </AnimatePresence>

        {!selectedOrder && orders.length === 0 && phone && !searching && <EmptyState />}
      </div>
    </PublicLayout>
  );
}

function SearchSection({ phone, setPhone, searchOrders, searching }) {
  return (
    <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-xl shadow-gray-200/50 space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-black text-[#111814] tracking-tight">Rastrear mi pedido</h2>
        <p className="text-sm text-[#618972] font-medium leading-relaxed">
          Ingresa el número de teléfono que usaste al pedir para ver el estado en tiempo real.
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#618972]/40" />
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Tu número de teléfono"
            className="h-16 pl-14 rounded-2xl bg-gray-50/50 border-gray-100 font-bold text-lg focus:ring-[#22C55E] focus:border-[#22C55E] transition-all"
          />
        </div>
        <Button
          onClick={searchOrders}
          disabled={searching}
          className="w-full h-16 bg-[#22C55E] hover:bg-[#16A34A] text-[#111814] rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#22C55E]/20 transition-all active:scale-95"
        >
          {searching ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              <span>Ver mis pedidos</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 px-6">
      <div className="size-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-6 text-gray-300">
        <Smartphone className="w-10 h-10" />
      </div>
      <h3 className="text-lg font-black text-gray-400 uppercase tracking-widest">No hay pedidos</h3>
      <p className="text-sm text-gray-400 mt-2">Verifica tu número e intenta de nuevo.</p>
    </div>
  );
}

function OrderTimeline({ order, onRefresh, onReset }) {
  const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);
  const steps = ['pendiente', 'aceptado', 'preparando', 'listo', 'enviado', 'entregado'];
  const stepData = [
    { label: 'Pendiente', Icon: Clock, desc: 'Ya recibimos tu pedido' },
    { label: 'Aceptado', Icon: Check, desc: 'Pedido confirmado' },
    { label: 'Preparando', Icon: ChefHat, desc: 'Tu comida está al fuego' },
    { label: 'Listo', Icon: Check, desc: '¡Listo para entrega!' },
    { label: 'En camino', Icon: Truck, desc: 'El repartidor va volando' },
    { label: 'Entregado', Icon: Package, desc: '¡Buen provecho!' }
  ];
  const currentIndex = steps.indexOf(order.estado);

  return (
    <div className="space-y-6">
      {/* Real-time Map Section */}
      {order.tipo === 'delivery' && (order.estado === 'enviado' || order.estado === 'entregado') && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-2xl shadow-gray-200/50 mb-1"
        >
          <div className="h-64 relative bg-gray-50">
            <DeliveryMap
              lat={order.repartidor_lat}
              lng={order.repartidor_lng}
              businessLat={order.business_lat}
              businessLng={order.business_lng}
              clienteLat={order.cliente_lat}
              clienteLng={order.cliente_lng}
              isDelivered={order.estado === 'entregado'}
            />
            <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2">
              <div className="px-3 py-1 bg-white/90 backdrop-blur-md border border-gray-200 rounded-full shadow-sm flex items-center gap-2">
                <div className={`size-2 rounded-full ${order.estado === 'entregado' ? 'bg-gray-400' : 'bg-[#22C55E] animate-ping'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#111814]">
                  {order.estado === 'entregado' ? 'Entrega Finalizada' : 'Seguimiento en Vivo'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-2xl shadow-gray-200/50" data-testid="order-timeline">
        <div className="bg-[#22C55E] text-[#111814] p-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block size-2 rounded-full bg-white animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Estado Actual</p>
              </div>
              <p className="font-black text-3xl tracking-tighter">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onRefresh} className="size-12 rounded-2xl bg-[#111814]/10 text-[#111814] hover:bg-[#111814]/20 active:scale-90 transition-all">
              <RefreshCw className="w-6 h-6" />
            </Button>
          </div>
          {order.mesa_numero && <p className="mt-4 px-3 py-1 bg-[#111814] text-white inline-block rounded-lg text-[10px] font-black uppercase tracking-widest">Mesa {order.mesa_numero}</p>}
        </div>

        <div className="p-10 space-y-8 bg-white">
          {stepData.map((step, idx) => {
            const isCompleted = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            const StepIcon = step.Icon;
            return (
              <div key={idx} className="flex gap-6 relative">
                <div className="flex flex-col items-center z-10">
                  <div className={`size-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${isCompleted ? 'bg-[#22C55E] text-[#111814] shadow-lg shadow-[#22C55E]/20' : 'bg-gray-100 text-gray-300'} ${isCurrent ? 'ring-8 ring-[#22C55E]/10 scale-110' : ''}`}>
                    <StepIcon className="w-7 h-7" />
                  </div>
                  {idx < steps.length - 1 && <div className={`w-1 h-12 my-1 transition-all duration-500 ${isCompleted ? 'bg-[#22C55E]' : 'bg-gray-100'}`} />}
                </div>
                <div className="flex-1 pt-2">
                  <p className={`text-lg font-black tracking-tight ${isCompleted ? 'text-[#111814]' : 'text-gray-300'}`}>{step.label}</p>
                  <p className={`text-sm font-medium ${isCompleted ? 'text-[#618972]' : 'text-gray-200'}`}>{step.desc}</p>
                  {isCurrent && <span className="inline-flex mt-2 px-2 py-0.5 bg-[#22C55E]/10 text-[#22C55E] text-[8px] font-black uppercase tracking-widest rounded-md border border-[#22C55E]/20">En Progreso</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-50 bg-gray-50/50 p-10">
          <h3 className="text-sm font-black uppercase tracking-widest text-[#111814] mb-6 flex items-center gap-2">
            <Package className="w-4 h-4 text-[#22C55E]" /> Resumen del pedido
          </h3>
          <div className="space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100">
                <div className="flex flex-col">
                  <span className="font-bold text-[#111814]">{item.nombre}</span>
                  <span className="text-[10px] font-black text-[#618972] uppercase tracking-[0.1em]">{item.cantidad} unidades</span>
                </div>
                <span className="font-black text-[#111814]">{formatCurrency(item.cantidad * (item.precio_unitario || item.precio || 0))}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200 flex justify-between items-center">
            <span className="font-black text-lg text-[#111814] tracking-tighter">Total pagado</span>
            <span className="text-3xl font-black text-[#22C55E] tracking-tighter">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        onClick={onReset}
        className="w-full h-14 rounded-2xl text-[#618972] font-black uppercase text-[10px] tracking-widest hover:bg-[#22C55E] hover:text-white transition-colors"
      >
        Buscar otro pedido
      </Button>
    </div>
  );
}

function DeliveryMap({ lat, lng, businessLat, businessLng, clienteLat, clienteLng, isDelivered }) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [map, setMap] = useState(null);
  const mapRef = useState(null);

  useEffect(() => {
    if (isLoaded && !map && document.getElementById('map-container')) {
      const initialLat = lat || businessLat || 4.6097;
      const initialLng = lng || businessLng || -74.0817;

      const mapInstance = new window.google.maps.Map(document.getElementById('map-container'), {
        center: { lat: initialLat, lng: initialLng },
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: false,
        styles: [
          {
            "featureType": "all",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#111814" }]
          },
          {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{ "color": "#e9e9e9" }]
          },
          {
            "featureType": "landscape",
            "elementType": "geometry",
            "stylers": [{ "color": "#f5f5f5" }]
          }
        ]
      });
      setMap(mapInstance);
    }
  }, [isLoaded, map]);

  useEffect(() => {
    if (!map) return;

    // Clear existing markers if any (using a simple approach for this demo)
    // In a real app we'd keep track of marker objects

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    // Business Marker
    if (businessLat && businessLng) {
      new window.google.maps.Marker({
        position: { lat: businessLat, lng: businessLng },
        map: map,
        title: "Restaurante",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: "#111814",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#FFFFFF",
          scale: 10
        }
      });
      bounds.extend({ lat: businessLat, lng: businessLng });
      hasPoints = true;
    }

    // Customer Marker
    if (clienteLat && clienteLng) {
      new window.google.maps.Marker({
        position: { lat: clienteLat, lng: clienteLng },
        map: map,
        title: "Tú",
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          fillColor: "#22C55E",
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: "#FFFFFF",
          scale: 6
        }
      });
      bounds.extend({ lat: clienteLat, lng: clienteLng });
      hasPoints = true;
    }

    // Courier Marker
    if (lat && lng) {
      new window.google.maps.Marker({
        position: { lat, lng },
        map: map,
        title: "Repartidor",
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/motorcycling.png", // Icono de moto
          scaledSize: new window.google.maps.Size(40, 40)
        }
      });
      bounds.extend({ lat, lng });
      hasPoints = true;
    }

    if (hasPoints && !isDelivered) {
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    }
  }, [map, lat, lng, businessLat, businessLng, clienteLat, clienteLng, isDelivered]);

  if (loadError) return <div className="p-4 text-center text-red-500">Error cargando el mapa</div>;
  if (!isLoaded) return <div className="p-4 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#22C55E]" /></div>;

  return <div id="map-container" className="w-full h-full z-0" />;
}
