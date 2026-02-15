import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  TableProperties,
  AlertCircle,
  ChefHat,
  MessageSquare,
  CheckCircle,
  ExternalLink,
  Users,
  MessageCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4 }}
    className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  </motion.div>
);

const OrderStatusBadge = ({ status }) => {
  const statusConfig = {
    pendiente: { label: 'Pendiente', class: 'status-pendiente' },
    aceptado: { label: 'Aceptado', class: 'status-aceptado' },
    preparando: { label: 'Preparando', class: 'status-preparando' },
    listo: { label: 'Listo', class: 'status-listo' },
    enviado: { label: 'Enviado', class: 'status-enviado' },
    entregado: { label: 'Entregado', class: 'status-entregado' },
    cancelado: { label: 'Cancelado', class: 'status-cancelado' },
  };

  const config = statusConfig[status] || statusConfig.pendiente;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.class}`}>
      {config.label}
    </span>
  );
};

export default function DashboardPage() {
  const { slug } = useParams();
  const { api } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [analyticsRes, ordersRes] = await Promise.all([
          api().get(`/business/${slug}/analytics`),
          api().get(`/orders/${slug}?limit=5`)
        ]);
        if (isMounted) {
          setAnalytics(analyticsRes.data);
          setRecentOrders(ordersRes.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        if (isMounted) toast.error('Error al cargar datos del dashboard');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [slug, api]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const chartData = analytics?.ultimos_7_dias?.slice().reverse().map(day => ({
    fecha: new Date(day.fecha).toLocaleDateString('es-CO', { weekday: 'short' }),
    ventas: day.total_ventas,
    pedidos: day.total_pedidos
  })) || [];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#22C55E]" />
        </div>
      </DashboardLayout>
    );
  }

  const segmentationData = [
    { name: 'ALTA PARTICIPACIÓN', value: 45, color: '#22C55E' },
    { name: 'PARTICIPACIÓN MEDIA', value: 25, color: '#3B82F6' },
    { name: 'CLIENTES NUEVOS', value: 20, color: '#EAB308' },
    { name: 'SIN ACTIVIDAD', value: 10, color: '#EF4444' },
  ];

  const vipClientes = [
    { nombre: 'Carlos Rodríguez', nivel: 'Oro', puntos: '1.450 pts', img: 'https://ui-avatars.com/api/?name=Carlos+Rodriguez&background=22C55E&color=fff' },
    { nombre: 'María García', nivel: 'Plata', puntos: '450 pts', img: 'https://ui-avatars.com/api/?name=Maria+Garcia&background=22C55E&color=fff' },
    { nombre: 'Juan Pérez', nivel: 'Oro', puntos: '1.250 pts', img: 'https://ui-avatars.com/api/?name=Juan+Perez&background=22C55E&color=fff' },
    { nombre: 'Ana López', nivel: 'Plata', puntos: '320 pts', img: 'https://ui-avatars.com/api/?name=Ana+Lopez&background=22C55E&color=fff' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="dashboard-container">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Resumen de tu negocio hoy</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Ventas Hoy"
            value={formatCurrency(analytics?.ventas_hoy || 0)}
            icon={DollarSign}
            color="bg-[#25D366]"
          />
          <StatCard
            title="Pedidos Hoy"
            value={analytics?.pedidos_hoy || 0}
            icon={ShoppingBag}
            color="bg-blue-500"
          />
          <StatCard
            title="Ticket Promedio"
            value={formatCurrency(analytics?.pedidos_hoy > 0 ? (analytics?.ventas_hoy / analytics?.pedidos_hoy) : 0)}
            icon={TrendingUp}
            color="bg-amber-500"
            subtitle="Promedio por venta"
          />
          <StatCard
            title="Mesas"
            value={`${analytics?.mesas_ocupadas || 0}/${analytics?.mesas_totales || 0}`}
            icon={TableProperties}
            color="bg-purple-500"
            subtitle="Ocupadas"
          />
        </div>

        {/* SECTION: TOP CLIENTES VIP */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Top Clientes VIP</h2>
            <Link to={`/dashboard/${slug}/clientes`} className="text-[10px] font-black text-[#22C55E] uppercase tracking-widest hover:underline whitespace-nowrap">
              Ver Todos
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {vipClientes.map((cliente, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-50 overflow-hidden border border-gray-100 shrink-0">
                    <img src={cliente.img} alt={cliente.nombre} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900 truncate">{cliente.nombre}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                      <span className={cliente.nivel === 'Oro' ? 'text-amber-500' : 'text-blue-400'}>{cliente.nivel}</span> • {cliente.puntos}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toast.success(`Abriendo chat con ${cliente.nombre}`)}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-[#22C55E]/10 hover:text-[#22C55E] transition-all shrink-0"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Charts and Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#25D366]" />
                Ventas últimos 7 días
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="99%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#25D366" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#25D366" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), 'Ventas']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ventas"
                      stroke="#25D366"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorVentas)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100">
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-[#22C55E]" />
                <span className="text-sm font-black uppercase tracking-widest text-gray-900">Últimos pedidos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay pedidos aún</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-bold text-xs text-gray-900">
                          {order.mesa_numero ? `Mesa ${order.mesa_numero}` : order.cliente_nombre || 'Para llevar'}
                        </p>
                        <p className="text-[10px] text-gray-500 font-medium">
                          {order.items?.length} items · {formatCurrency(order.total)}
                        </p>
                      </div>
                      <OrderStatusBadge status={order.estado} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SECTION: SEGMENTACIÓN Y WHATSAPP HUB */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">

          {/* Análisis de Participación */}
          <Card className="rounded-[2rem] border-none shadow-2xl bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-gray-900">Análisis de Participación</CardTitle>
              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest leading-relaxed">
                Distribución de clientes según su actividad y acumulación de puntos.
              </p>
            </CardHeader>
            <CardContent className="p-8 pt-0 flex flex-col sm:flex-row items-center gap-10">
              <div className="relative w-48 h-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segmentationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                    >
                      {segmentationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Retención</p>
                  <p className="text-sm font-black text-[#22C55E] uppercase tracking-tighter">Óptima</p>
                </div>
              </div>
              <div className="w-full space-y-3">
                {segmentationData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.name}</span>
                    </div>
                    <span className="text-xs font-black text-gray-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Hub */}
          <Card className="rounded-[2rem] border-none shadow-2xl bg-[#22C55E] overflow-hidden text-white group">
            <CardContent className="p-8 flex flex-col h-full space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">WhatsApp Hub</CardTitle>
                    <div className="flex items-center gap-1.5 text-[8px] font-bold text-white/60">
                      <div className="w-1 h-1 rounded-full bg-white opacity-40" />
                      SINCRONIZACIÓN ACTIVA
                    </div>
                  </div>
                </div>
                <AlertCircle className="w-4 h-4 text-white/40" />
              </div>

              <div className="space-y-4 py-2">
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-4xl font-black leading-none">850/1000</h3>
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-2 px-1">Mensajes consumidos</p>
                  </div>
                  <Badge className="bg-white/20 text-white text-[9px] font-black tracking-widest border-none px-2 py-0.5 mb-1">MES ACTUAL</Badge>
                </div>
                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full w-[85%] shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
                </div>
                <p className="text-[9px] font-bold text-white/80 italic text-center">
                  ✨ Has usado el 85.0% de tu cupo disponible.
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

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => toast.success('Módulo de compra cargando...')}
                  className="bg-white text-[#22C55E] hover:bg-white/90 font-black text-[10px] uppercase h-12 rounded-xl tracking-widest shadow-xl shadow-green-900/10"
                >
                  Comprar Mensajes
                </Button>
                <Button
                  onClick={() => toast.info('Generando reporte...')}
                  variant="outline"
                  className="bg-transparent border-2 border-white text-white hover:bg-white/10 font-black text-[10px] uppercase h-12 rounded-xl tracking-widest"
                >
                  Reporte Diario
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Alerts */}
        {analytics?.productos_agotados > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Productos agotados</p>
              <p className="text-sm text-amber-600">
                Tienes {analytics.productos_agotados} producto(s) marcados como no disponibles.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
