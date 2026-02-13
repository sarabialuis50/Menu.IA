import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { motion } from 'framer-motion';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  TableProperties,
  TrendingUp,
  AlertCircle,
  ChefHat
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
    const fetchData = async () => {
      try {
        const [analyticsRes, ordersRes] = await Promise.all([
          api().get(`/business/${slug}/analytics`),
          api().get(`/orders/${slug}?limit=5`)
        ]);
        setAnalytics(analyticsRes.data);
        setRecentOrders(ordersRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Error al cargar datos del dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#25D366]" />
        </div>
      </DashboardLayout>
    );
  }

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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-[#25D366]" />
                Últimos pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay pedidos aún</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="font-medium text-sm">
                          {order.mesa_numero ? `Mesa ${order.mesa_numero}` : order.cliente_nombre || 'Para llevar'}
                        </p>
                        <p className="text-xs text-gray-500">
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
