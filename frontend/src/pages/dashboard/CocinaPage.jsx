import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import useWebSocket from '@/hooks/useWebSocket';
import { ChefHat, Clock, Volume2, VolumeX, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { playOrderSound } from '@/utils/sound';

export default function CocinaPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { lastMessage, isConnected } = useWebSocket(user?.id);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await api().get(`/orders/${slug}/active`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [slug, api]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    if (lastMessage && (lastMessage.type === 'new_order' || lastMessage.type === 'order_updated')) {
      if (lastMessage.type === 'new_order') {
        toast.success('¡Nuevo pedido!');
        if (soundEnabled) playOrderSound();
      }
      fetchOrders();
    }
  }, [lastMessage, fetchOrders, soundEnabled]);

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
    <div className="min-h-screen bg-gray-900 text-white" data-testid="cocina-container">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => (
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
  const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);
  const getTimeSince = (d) => { const diff = Math.floor((new Date() - new Date(d)) / 60000); return diff < 1 ? 'Ahora' : diff < 60 ? diff + ' min' : Math.floor(diff / 60) + 'h'; };

  let config;
  if (order.estado === 'pendiente') {
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
    <div className={`rounded-xl border-2 overflow-hidden ${config.color}`} data-testid={`order-ticket-${order.id}`}>
      <div className={`${config.headerColor} text-white px-4 py-2 flex items-center justify-between`}>
        <span className="font-bold">{config.label}</span>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4" />
          <span>{getTimeSince(order.created_at)}</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-heading font-bold text-xl text-gray-900 mb-1">{order.mesa_numero ? `Mesa ${order.mesa_numero}` : 'Para llevar'}</h3>
        {order.notas && (
          <div className="mb-4 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
            📌 Notas: {order.notas}
          </div>
        )}
        <div className="space-y-4 overflow-visible">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-1 border-b border-gray-100 last:border-0 pb-2 mb-2 italic">
              <div className="flex gap-2">
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-sm font-bold">{item.cantidad}x</span>
                <span className="font-medium text-gray-900">{item.nombre}</span>
              </div>
              {item.descripcion && (
                <div className="ml-8 text-sm font-black text-gray-800 leading-tight mb-1">
                  {item.descripcion}
                </div>
              )}
              {item.modificadores && item.modificadores.length > 0 && (
                <div className="ml-8 text-[11px] font-black text-blue-600 uppercase tracking-tight mt-0.5">
                  {item.modificadores.map(mod => mod.startsWith('(') ? mod : `(1) ${mod}`).join(' - ')}
                </div>
              )}
              {item.notas && (
                <div className="ml-8 text-[10px] font-bold text-indigo-500">
                  📌 {item.notas}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
          <span className="text-sm text-gray-500">Total</span>
          <span className="font-bold text-lg text-gray-900">{formatCurrency(order.total)}</span>
        </div>
        {config.nextStatus && (
          <Button onClick={() => onUpdateStatus(order.id, config.nextStatus)} className={`w-full mt-4 h-12 text-base font-bold ${config.btnColor} text-white`} data-testid={`action-btn-${order.id}`}>
            {config.nextAction}
          </Button>
        )}
      </div>
    </div>
  );
}
