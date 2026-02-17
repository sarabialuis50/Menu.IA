import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  UtensilsCrossed,
  TableProperties,
  ChefHat,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Gift,
  Sparkles,
  MessageSquareMore,
  ChevronRight,
  ClipboardList,
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { path: '', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/pedidos', icon: ClipboardList, label: 'Pedidos' },
  { path: '/mesas', icon: TableProperties, label: 'Mesas' },
  { path: '/cocina', icon: ChefHat, label: 'Cocina' },
  { path: '/clientes', icon: Users, label: 'Base de Clientes' },
  { path: '/fidelidad', icon: Gift, label: 'Fidelidad' },
  { path: '/empleados', icon: Users, label: 'Empleados' },
  { path: '/marketing', icon: MessageSquareMore, label: 'WhatsApp Hub' },
  { path: '/consultor', icon: Sparkles, label: 'Consultor Gemini' },
  { path: '/perfil', icon: Users, label: 'Mi Perfil' },
  { path: '/configuracion', icon: Settings, label: 'Configuración' },
];

const mobileBottomNavItems = [
  { path: '/cocina', icon: ChefHat, label: 'Cocina' },
  { path: '/fidelidad', icon: Gift, label: 'Fidelidad' },
  { path: '/pedidos', icon: ClipboardList, label: 'Pedidos' },
  { path: '/empleados', icon: Users, label: 'Empleados' },
  { path: '/mesas', icon: TableProperties, label: 'Mesas' },
];

export const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const basePath = `/dashboard/${user?.slug}`;

  return (
    <div className="min-h-screen bg-[#f6f8f7] font-sans">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#0F172A] border-b border-slate-800 z-50 flex items-center px-6">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2.5 hover:bg-slate-800 rounded-xl transition-colors"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          <img src="/logos/logo-icon-transparent.png" alt="Menu.IA" className="size-8 object-contain" />
          <span className="font-heading font-black text-xl tracking-tighter">
            <span className="text-[#22C55E]">Menu</span>
            <span className="text-[#22B8CF]">.IA</span>
          </span>
        </div>
        <div className="size-10 rounded-xl bg-slate-800" />
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-[#0F172A] border-r border-slate-800 z-50 shadow-2xl lg:shadow-none
        transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
            <Link to={basePath} className="flex items-center gap-0.5">
              <div className="size-10 rounded-xl bg-transparent flex items-center justify-center overflow-hidden">
                <img src="/logos/logo-icon-transparent.png" alt="Menu.IA" className="w-full h-full object-contain" />
              </div>
              <span className="font-heading font-black text-xl tracking-tighter">
                <span className="text-[#22C55E]">Menu</span>
                <span className="text-[#22B8CF]">.IA</span>
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Business Info */}
          <div className="px-4 mb-2 mt-4">
            <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center gap-3">
              <div className="size-8 rounded-xl bg-slate-800 shadow-sm flex items-center justify-center font-bold text-[#22C55E] overflow-hidden">
                {user?.logo_url ? (
                  <img src={user.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  user?.nombre?.[0] || 'M'
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">Restaurante</p>
                <p className="font-bold text-slate-100 truncate text-xs">{user?.nombre || 'Mi Negocio'}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto no-scrollbar">
            {navItems.map((item) => {
              const fullPath = `${basePath}${item.path}`;
              const isActive = location.pathname === fullPath ||
                (item.path === '' && location.pathname === basePath);

              return (
                <Link
                  key={item.path}
                  to={fullPath}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-xs transition-all duration-300 group
                    ${isActive
                      ? 'bg-[#22C55E] text-white shadow-lg shadow-green-500/20 scale-[1.01]'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  <item.icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
                </Link>
              );
            })}

            <div className="pt-4 mt-4 border-t border-slate-800">
              <p className="px-3 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Acceso Público</p>
              <a
                href={`/${user?.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-all group"
              >
                <Smartphone className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="flex-1 truncate">Vista del Cliente</span>
                <ExternalLink className="w-3 h-3 opacity-30" />
              </a>
            </div>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-xs text-red-400 hover:bg-red-500/10 transition-all hover:scale-[1.02]"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen pb-20 lg:pb-0">
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0F172A] border-t border-slate-800 z-50 flex items-center justify-around px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        {mobileBottomNavItems.map((item) => {
          const fullPath = `${basePath}${item.path}`;
          const isActive = location.pathname === fullPath;

          return (
            <Link
              key={item.path}
              to={fullPath}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 w-full h-full ${isActive ? 'text-[#22C55E]' : 'text-slate-400'
                }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-[#22C55E]/10 scale-110 shadow-sm shadow-[#22C55E]/10' : ''}`}>
                <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
