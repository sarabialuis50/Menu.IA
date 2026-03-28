import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import useWebSocket from '@/hooks/useWebSocket';
import { ChefHat, Clock, Volume2, VolumeX, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { playOrderSound, notifyNewOrder, unlockAudioAndNotifications } from '@/utils/sound';

export default function CocinaPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { lastMessage, isConnected } = useWebSocket(user?.id);

  const previousOrdersRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

  const fetchOrders = useCallback(async () => {
    try {
      if (isFirstLoadRef.current) setLoading(true);
      const response = await api().get(`/orders/${slug}/active`);
      const incomingOrders = response.data || [];
      const incomingIds = new Set(incomingOrders.map(o => o.id));

      if (!isFirstLoadRef.current) {
        const newPendingOrders = incomingOrders.filter(o =>
          !previousOrdersRef.current.has(o.id) && o.estado === 'pendiente'
        );

        if (newPendingOrders.length > 0) {
          toast.success(`¡Tienes ${newPendingOrders.length} pedido(s) nuevo(s)!`, {
            duration: 5000,
            position: 'top-center',
          });
          if (soundEnabled) playOrderSound();
          notifyNewOrder(
            '¡Nuevo Pedido!',
            `Tienes ${newPendingOrders.length} pedido(s) nuevo(s) en la cocina por preparar.`
          );
        }
      }

      previousOrdersRef.current = incomingIds;
      isFirstLoadRef.current = false;

      setOrders(incomingOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [slug, api, soundEnabled]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    // The websocket triggers a fetch immediately to handle state sync
    if (lastMessage && (lastMessage.type === 'new_order' || lastMessage.type === 'order_updated')) {
      fetchOrders();
    }
  }, [lastMessage, fetchOrders]);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api().put(`/orders/${slug}/${orderId}`, { estado: newStatus });
      toast.success('Estado actualizado');
      fetchOrders();
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22C55E]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white" data-testid="cocina-container" onClick={unlockAudioAndNotifications}>
      <header className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-transparent flex items-center justify-center overflow-hidden">
              <img src="/logos/logo-icon-transparent.png" alt="Menu.IA" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg">Cocina</h1>
              <p className="text-xs text-gray-400">{orders.length} pedidos activos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionBadge isConnected={isConnected} />
            <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="text-gray-400 hover:text-white" data-testid="toggle-sound-btn">
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={fetchOrders} className="text-gray-400 hover:text-white" data-testid="refresh-orders-btn">
              <RefreshCw className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/dashboard/${slug}`)}
              className="text-gray-400 hover:text-red-500 hover:bg-red-500/10 ml-2"
              data-testid="exit-kitchen-btn"
              title="Salir al Dashboard"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </header>
      <main className="p-4">
        {orders.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {orders
              .filter(order => !(order.tipo === 'delivery' && order.estado === 'listo'))
              .map((order) => (
                <OrderCard key={order.id} order={order} onUpdateStatus={updateOrderStatus} />
              ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ConnectionBadge({ isConnected }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
      {isConnected ? 'Conectado' : 'Desconectado'}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
      <ChefHat className="w-20 h-20 mb-4 opacity-30" />
      <p className="text-xl font-medium">No hay pedidos activos</p>
    </div>
  );
}

function OrderCard({ order, onUpdateStatus }) {
  const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(v));
  const getTimeSince = (d) => { const diff = Math.floor((new Date() - new Date(d)) / 60000); return diff < 1 ? 'Ahora' : diff < 60 ? diff + ' min' : Math.floor(diff / 60) + 'h'; };

  let config;
  if (order.estado === 'pendiente' || order.estado === 'aceptado') {
    config = {
      label: 'Nuevo',
      color: 'border-blue-400 bg-blue-50',
      headerColor: 'bg-blue-500',
      nextAction: 'ACEPTAR',
      nextStatus: 'preparando',
      btnColor: 'bg-blue-500 hover:bg-blue-600 font-black'
    };
  }
  else if (order.estado === 'preparando') {
    config = {
      label: 'Preparando',
      color: 'border-yellow-400 bg-yellow-50',
      headerColor: 'bg-yellow-500',
      nextAction: 'LISTO',
      nextStatus: 'listo',
      btnColor: 'bg-green-500 hover:bg-green-600 font-black'
    };
  }
  else if (order.estado === 'listo') {
    const isDelivery = order.tipo === 'delivery';
    config = {
      label: 'Listo',
      color: 'border-emerald-400 bg-emerald-50',
      headerColor: 'bg-emerald-500',
      nextAction: isDelivery ? 'ENVIADO' : 'ENTREGADO', // Changed from 'EN CAMINO' to 'ENVIADO'
      nextStatus: isDelivery ? 'enviado' : 'entregado',
      btnColor: 'bg-indigo-600 hover:bg-indigo-700 shadow-lg text-white font-black'
    };
  }
  else if (order.estado === 'enviado') { // Added new state for 'enviado'
    config = {
      label: 'Enviado',
      color: 'border-purple-400 bg-purple-50',
      headerColor: 'bg-purple-500',
      nextAction: 'ENTREGADO',
      nextStatus: 'entregado',
      btnColor: 'bg-indigo-600 hover:bg-indigo-700 shadow-lg text-white font-black'
    };
  }
  else config = { label: 'Entregado', color: 'border-gray-400 bg-gray-50', headerColor: 'bg-gray-500', nextAction: null, nextStatus: null, btnColor: '' };

  return (
    <div className={`rounded-xl border-2 overflow-hidden flex flex-col h-full ${config.color}`} data-testid={`order-ticket-${order.id}`}>
      <div className={`${config.headerColor} text-white px-4 py-2 flex items-center justify-center relative`}>
        <span className="font-bold text-center text-lg uppercase tracking-wider">{config.label}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('¿Deseas rechazar/cancelar este pedido?')) {
              onUpdateStatus(order.id, 'cancelado');
            }
          }}
          className="absolute right-4 w-6 h-6 flex items-center justify-center rounded-full border-2 border-white hover:bg-white/20 transition-colors"
          title="Rechazar Pedido"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col gap-1">
            <h3 className="font-heading font-bold text-xl text-gray-900 leading-tight">
              {order.mesa_numero ? `Mesa ${order.mesa_numero}` : (order.tipo === 'delivery' || order.tipo_pedido === 'delivery' ? '🛵 Domicilio' : '🛍️ Para Recoger')}
            </h3>
            <p className="text-xs font-bold text-gray-500 line-clamp-1">Cliente: {order.cliente_nombre || 'N/A'}</p>
          </div>
          <div className="flex flex-col items-end shrink-0 ml-2">
            <span className="text-[11px] font-black text-blue-700 leading-tight">ID: {order.numero_secuencial ? String(order.numero_secuencial).padStart(8, '0') : order.id?.slice(0, 8).toUpperCase()}</span>
            <div className="flex items-center gap-1 mt-1 text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">
              <Clock className="w-3 h-3 shrink-0" />
              <span className="text-[10px] font-bold shrink-0">{getTimeSince(order.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 overflow-visible flex-1">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-1 border-b border-gray-100 last:border-0 pb-2 mb-2">
              <div className="flex gap-2">
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-sm font-bold h-fit shrink-0">{item.cantidad}</span>
                <span className="font-medium text-gray-900 uppercase tracking-tight">{item.nombre}</span>
              </div>

              {item.descripcion && (
                <div className="ml-8 text-[11px] font-bold text-gray-600 leading-tight mt-0.5">
                  {item.descripcion}
                </div>
              )}

              {item.notas && (
                <div className="ml-8 text-sm font-black text-amber-600 leading-tight mt-1 bg-amber-50 px-2 py-1 rounded border-l-2 border-amber-400">
                  Nota: {item.notas}
                </div>
              )}

              {item.modificadores && item.modificadores.length > 0 && (
                <div className="ml-8 mt-1.5 grid grid-cols-3 w-full pr-4 gap-x-1">
                  {(() => {
                    let grouped = {};
                    if (typeof item.modificadores[0] === 'string') {
                      grouped = { 'TAMAÑOS': [], 'ADICIONALES': [], 'OPCIONES': [] };
                      item.modificadores.forEach(mod => {
                        const lower = mod.toLowerCase();
                        let cat = 'ADICIONALES';
                        if (/small|medium|grande|personal|mediana|familiar|mitad|entera|porcion/i.test(lower)) {
                          cat = 'TAMAÑOS';
                        } else if (/sin |con |oregano|orégano|salsa|picante|normal/i.test(lower)) {
                          cat = 'OPCIONES';
                        }
                        const formattedMod = mod.startsWith('(') ? mod : `(1) ${mod}`;
                        grouped[cat].push(formattedMod);
                      });
                    } else {
                      grouped = item.modificadores.reduce((acc, mod) => {
                        const cat = (mod.categoria || 'Adicionales').toUpperCase();
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(`(${mod.cantidad || 1}) ${mod.nombre}`);
                        return acc;
                      }, {});
                    }

                    return Object.entries(grouped)
                      .filter(([_, mods]) => mods.length > 0)
                      .map(([cat, mods], i) => (
                        <div key={i} className={`flex flex-col min-w-0 ${cat === 'ADICIONALES' ? '-ml-[4%]' : ''}`}>
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5 leading-none whitespace-nowrap" title={cat}>
                            {cat === 'OPCIONES' ? 'OPCIONES:' : cat}
                          </span>
                          <div className="flex flex-col gap-[1px]">
                            {mods.map((m, j) => (
                              <span key={j} className="text-[9px] text-blue-600 font-black uppercase leading-tight whitespace-nowrap overflow-visible z-10 relative" title={m}>
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      ));
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-3 mt-3 border-t border-gray-200 shrink-0">
          <span className="text-sm text-gray-500">Total</span>
          <span className="font-bold text-lg text-gray-900">{formatCurrency(order.total)}</span>
        </div>
        {config.nextStatus && (
          <Button onClick={() => onUpdateStatus(order.id, config.nextStatus)} className={`w-full mt-4 h-12 text-base font-bold shrink-0 ${config.btnColor} text-white`} data-testid={`action-btn-${order.id}`}>
            {config.nextAction}
          </Button>
        )}
      </div>
    </div>
  );
}
