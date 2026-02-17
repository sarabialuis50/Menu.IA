import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  UtensilsCrossed,
  QrCode,
  Clock,
  ChefHat,
  Smartphone,
  ArrowRight,
  Check,
  MessageCircle,
  BarChart3,
  Star,
  Zap,
  Menu,
  X,
  Plus,
  ArrowUpRight,
  ExternalLink,
  Monitor,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-transparent flex items-center justify-center overflow-hidden">
                <img src="/logos/logo-icon-white.png" alt="Menu.IA" className="w-full h-full object-cover" />
              </div>
              <span className="font-heading font-black text-xl tracking-tighter">
                <span className="text-[#22C55E]">Menu</span>
                <span className="text-[#22B8CF]">.IA</span>
              </span>
            </Link>

            <div className="flex items-center gap-1 sm:gap-3">
              <Link to="/precios" className="text-sm font-bold text-gray-600 hover:bg-[#22C55E] hover:text-white px-4 py-2 rounded-xl transition-colors">Precios</Link>
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                className="border-[#22C55E] border-2 sm:border-0 hover:bg-[#22C55E] hover:text-white px-4 py-2 rounded-xl text-sm font-bold text-[#22C55E] sm:text-gray-600 transition-colors"
                data-testid="login-nav-btn"
              >
                Iniciar sesión
              </Button>
              <Button
                onClick={() => navigate('/register')}
                className="bg-[#22C55E] hover:bg-transparent text-white hover:text-[#22C55E] border-2 border-[#22C55E] hidden sm:flex transition-colors"
                data-testid="register-nav-btn"
              >
                Comenzar gratis
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Split Layout */}
      <section className="pt-24 lg:pt-20 pb-14 lg:pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-left flex flex-col lg:block lg:justify-start"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] text-xs font-black uppercase tracking-wider mt-6 sm:mt-0 mb-6 transition-all">
                Gestión Inteligente para tu Negocio
              </span>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-[#0F172A] tracking-tight mb-6 lg:mb-8 leading-[1.05]">
                La forma más inteligente de <span className="bg-gradient-to-r from-[#22C55E] to-[#06B6D4] bg-clip-text text-transparent">gestionar tu negocio</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 mb-8 lg:mb-10 max-w-lg font-medium leading-snug">
                Optimiza tus pedidos, fideliza clientes con IA y automatiza tu comunicación por WhatsApp en un solo lugar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 lg:gap-4 w-full sm:w-auto">
                <Button
                  size="lg"
                  onClick={() => navigate('/register')}
                  className="bg-[#22C55E] hover:bg-transparent text-white hover:text-[#22C55E] border-2 border-[#22C55E] text-lg px-8 h-14 rounded-xl shadow-lg shadow-green-500/20 transition-all w-full sm:w-auto"
                  data-testid="hero-cta-btn"
                >
                  Comenzar gratis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/demo-negocio')}
                  className="text-lg px-8 h-14 rounded-xl border-2 text-[#0F172A] border-[#22C55E] w-full sm:w-auto"
                  data-testid="demo-btn"
                >
                  Ver demo
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="mt-auto pb-10 lg:pb-0 lg:mt-10 flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2 font-medium">
                  <Check className="w-5 h-5 text-[#22C55E] stroke-[3px]" />
                  <span>Sin tarjeta requerida</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <Check className="w-5 h-5 text-[#22C55E] stroke-[3px]" />
                  <span>Setup en 5 minutos</span>
                </div>
              </div>
            </motion.div>

            {/* Right - Device Mockups: Stacked on Mobile, Overlapping on Desktop */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-32 lg:mt-0"
            >
              <div className="flex flex-col items-center gap-16 lg:block lg:relative lg:w-full lg:h-[520px] lg:scale-95 lg:origin-right">
                {/* Background blur decorations - Hidden on small mobile to avoid clutter */}
                <div className="hidden lg:block absolute top-10 right-10 w-64 h-64 bg-[#22C55E]/20 rounded-full blur-3xl animate-pulse" />
                <div className="hidden lg:block absolute bottom-10 left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

                {/* The mockups are now relative on mobile (stacking) and absolute on desktop (overlapping) */}

                {/* 1. Nuestra Carta Mockup (Shows first on mobile) */}
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  whileHover={{ y: -10 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="relative lg:absolute lg:top-6 lg:-left-4 w-64 z-40 mx-auto lg:mx-0"
                >
                  <div className="bg-[#1A1A1A] rounded-[3.2rem] p-1.5 shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-white/10">
                    <div className="bg-white rounded-[2.5rem] overflow-hidden h-[380px] flex flex-col">
                      <div className="bg-white p-5 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
                            <UtensilsCrossed className="w-4 h-4 text-[#22C55E]" />
                          </div>
                          <span className="text-[12px] font-bold text-gray-800 tracking-tight">El buen sabor</span>
                        </div>
                        <Search className="w-4 h-4 text-gray-300" />
                      </div>
                      <div className="px-5 pt-2">
                        <h4 className="font-black text-lg text-gray-900 tracking-tight">Nuestra Carta</h4>
                        <div className="flex gap-2 mt-3 overflow-x-hidden">
                          <span className="px-3 py-1 bg-[#22C55E] text-white rounded-full text-[10px] font-black uppercase">Populares</span>
                          <span className="px-3 py-1 bg-gray-100 text-gray-400 rounded-full text-[10px] font-black uppercase">Drinks</span>
                        </div>
                        <div className="mt-5 space-y-3 pb-8">
                          {[
                            { name: 'Double Burger', price: '$24.900', icon: '🍔', bg: 'bg-orange-50' },
                            { name: 'Pepperoni Pizza', price: '$32.500', icon: '🍕', bg: 'bg-red-50' },
                            { name: 'Tropical Bowl', price: '$18.000', icon: '🥗', bg: 'bg-green-50' }
                          ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                              <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center text-xl shadow-sm`}>{item.icon}</div>
                              <div className="flex-1">
                                <p className="font-black text-xs text-gray-900 tracking-tight">{item.name}</p>
                                <p className="font-black text-[10px] text-[#22C55E] mt-0.5">{item.price}</p>
                              </div>
                              <div className="w-6 h-6 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-[#22C55E] font-black">+</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* 2. WhatsApp Mockup */}
                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  whileHover={{ y: -10 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="relative lg:absolute lg:top-0 lg:right-0 w-64 z-30 mx-auto lg:mx-0"
                >
                  <div className="bg-[#1A1A1A] rounded-[3.2rem] p-1.5 shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-white/10">
                    <div className="bg-[#f0f2f5] rounded-[2.5rem] overflow-hidden h-[380px] flex flex-col relative">
                      <div className="bg-[#075e54] p-4 pt-6 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-xs">Menu.IA Assistant</p>
                          <p className="text-white/60 text-[8px]">en línea</p>
                        </div>
                      </div>
                      <div className="flex-1 p-3 space-y-4 overflow-y-auto">
                        <div className="bg-white p-2.5 rounded-2xl rounded-tl-none shadow-sm max-w-[85%]">
                          <p className="text-[10px] text-gray-800">¡Hola! 👋 ¿Qué te gustaría ordenar hoy?</p>
                          <p className="text-[8px] text-gray-400 mt-1 text-right">10:45 AM</p>
                        </div>
                        <div className="bg-[#dcf8c6] p-2.5 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] ml-auto">
                          <p className="text-[10px] text-gray-800">Quiero ver el menú de hoy</p>
                          <p className="text-[8px] text-[#4fc3f7] mt-1 text-right items-center flex justify-end gap-0.5">10:46 AM <Check className="w-2 h-2" /><Check className="w-2 h-2 -ml-1" /></p>
                        </div>
                        <div className="bg-white p-2.5 rounded-2xl rounded-tl-none shadow-sm max-w-[85%]">
                          <p className="text-[10px] text-gray-800">Te recomiendo la Double Burger. Aquí tienes la carta: u.ia/negocio</p>
                          <p className="text-[8px] text-gray-400 mt-1 text-right">10:46 AM</p>
                        </div>
                        <div className="bg-[#dcf8c6] p-2.5 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] ml-auto">
                          <p className="text-[10px] text-gray-800">¡Perfecto, quiero una!</p>
                          <p className="text-[8px] text-[#4fc3f7] mt-1 text-right items-center flex justify-end gap-0.5">10:47 AM <Check className="w-2 h-2" /><Check className="w-2 h-2 -ml-1" /></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* 3. Dashboard Mockup (Last on mobile) */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="relative lg:absolute lg:bottom-2 lg:left-40 w-[280px] z-50 mx-auto lg:mx-0"
                >
                  <div className="bg-white rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden h-[265px] flex flex-col">
                    <div className="bg-gray-50/50 px-5 py-2.5 border-b border-gray-100 flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                      </div>
                      <p className="text-[11px] font-bold text-gray-400">Dashboard</p>
                    </div>
                    <div className="pt-2 px-2 pb-0 space-y-1.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-green-50/50 p-2 rounded-xl border border-green-100/50">
                          <p className="text-[8px] font-bold text-gray-500 mb-0.5">Ventas Hoy</p>
                          <p className="text-[11px] font-black text-gray-900">$458.000</p>
                          <p className="text-[8px] font-bold text-[#22C55E] mt-0.5">↑ 12%</p>
                        </div>
                        <div className="bg-blue-50/50 p-2 rounded-xl border border-blue-100/50">
                          <p className="text-[8px] font-bold text-gray-500 mb-0.5">Pedidos</p>
                          <p className="text-[11px] font-black text-gray-900">24</p>
                          <p className="text-[8px] font-bold text-blue-500 mt-0.5">↑ 8%</p>
                        </div>
                      </div>
                      <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 mb-3">Ventas Semana</p>
                        <div className="h-24 flex items-end justify-between gap-1 px-1">
                          {[35, 55, 40, 75, 65, 85, 100].map((h, i) => (
                            <div key={i} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${h}%` }}
                                transition={{ duration: 1, delay: 1 + (i * 0.1) }}
                                className={`w-full rounded-t-lg ${i === 6 ? 'bg-[#22C55E]' : 'bg-[#A7F3D0]'}`}
                              />
                              <span className="text-[8px] font-bold text-gray-400">
                                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#0F172A] mb-4">
              Todo lo que necesitas para <span className="bg-gradient-to-r from-[#22C55E] to-[#06B6D4] bg-clip-text text-transparent">modernizar tu negocio</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Herramientas potentes diseñadas específicamente para negocios colombianos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard icon={QrCode} title="Menú QR Inteligente" description="Tus clientes escanean y piden desde su celular. Sin descargas, sin fricciones." />
            <FeatureCard icon={Clock} title="Pedidos en Tiempo Real" description="La cocina recibe los pedidos al instante. Seguimiento visual para tus clientes." />
            <FeatureCard icon={ChefHat} title="Pantalla de Cocina" description="Vista dedicada para tu equipo de cocina. Gestiona pedidos eficientemente." />
            <FeatureCard icon={Smartphone} title="App para Meseros" description="PWA rápida con login por PIN. Toma pedidos en segundos." />
            <FeatureCard icon={MessageCircle} title="WhatsApp Integrado" description="Notificaciones automáticas. Tus clientes siempre informados." />
            <FeatureCard icon={BarChart3} title="Analítica de Datos" description="Dashboard con métricas de ventas, pedidos y rendimiento. Toma decisiones inteligentes." />
          </div>
        </div>
      </section >


      {/* CTA Section */}
      <section className="py-24 px-4 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F172A] mb-6 tracking-tight">
            ¿Listo para <span className="bg-gradient-to-r from-[#22C55E] to-[#06B6D4] bg-clip-text text-transparent">transformar tu negocio?</span>
          </h2>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto font-medium">
            Únete a cientos de negocios colombianos que ya están modernizando su gestión con Menu.IA.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/register')}
            className="bg-[#22C55E] hover:bg-transparent text-white hover:text-[#22C55E] border-2 border-[#22C55E] text-lg px-10 h-16 rounded-2xl shadow-[0_20px_40px_rgba(34,197,94,0.2)] transition-all hover:scale-105 active:scale-95"
          >
            Comenzar gratis ahora
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-[#0F172A] text-slate-400">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-transparent flex items-center justify-center overflow-hidden">
                <img src="/logos/logo-icon-white.png" alt="Menu.IA" className="w-full h-full object-cover" />
              </div>
              <span className="font-heading font-black text-xl tracking-tighter">
                <span className="text-[#22C55E]">Menu</span>
                <span className="text-[#22B8CF]">.IA</span>
              </span>
            </div>
            <p className="text-sm max-w-xs md:max-w-none">
              © 2026 Menu.IA. Hecho con amor para negocios apasionados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group p-6 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-lg border border-transparent hover:border-gray-100 transition-all"
    >
      <div className="w-12 h-12 rounded-xl bg-[#22C55E]/10 flex items-center justify-center mb-4 group-hover:bg-[#22C55E] transition-colors">
        <Icon className="w-6 h-6 text-[#22C55E] group-hover:text-white transition-colors" />
      </div>
      <h3 className="font-heading font-bold text-xl mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
}

