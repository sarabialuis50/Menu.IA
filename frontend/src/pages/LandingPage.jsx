import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UtensilsCrossed,
  QrCode,
  Clock,
  ChefHat,
  Smartphone,
  ArrowRight,
  Check,
  MessageCircle,
  BarChart3
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
              <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center p-2">
                <img src="/favicon.svg" alt="MenuPro" className="w-full h-full" />
              </div>
              <span className="font-heading font-black text-xl tracking-tighter">MenuPro</span>
            </Link>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/login')}
                data-testid="login-nav-btn"
              >
                Iniciar sesión
              </Button>
              <Button
                onClick={() => navigate('/register')}
                className="bg-[#25D366] hover:bg-[#128C7E] text-white"
                data-testid="register-nav-btn"
              >
                Comenzar gratis
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Split Layout */}
      <section className="pt-24 lg:pt-32 pb-16 lg:pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-left"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] text-sm font-black uppercase tracking-wider mb-6">
                Gestión Inteligente para tu Negocio
              </span>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
                Potencia tu restaurante con{' '}
                <span className="text-[#22C55E]">MenuPro</span> y{' '}
                <span className="text-[#22C55E]">WhatsApp Bot</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-xl font-medium">
                Optimiza tus pedidos, fideliza clientes con IA y automatiza tu comunicación por WhatsApp en un solo lugar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate('/register')}
                  className="bg-[#25D366] hover:bg-[#128C7E] text-white text-lg px-8 h-14 rounded-xl shadow-lg shadow-green-500/20"
                  data-testid="hero-cta-btn"
                >
                  Comenzar gratis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/demo-restaurante')}
                  className="text-lg px-8 h-14 rounded-xl border-2"
                  data-testid="demo-btn"
                >
                  Ver demo
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="mt-10 flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#25D366]" />
                  <span>Sin tarjeta requerida</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-[#25D366]" />
                  <span>Setup en 5 minutos</span>
                </div>
              </div>
            </motion.div>

            {/* Right - Device Mockups */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative w-full h-[500px] lg:h-[600px]">
                {/* Background blur decorations */}
                <div className="absolute top-10 right-10 w-64 h-64 bg-[#25D366]/20 rounded-full blur-3xl" />
                <div className="absolute bottom-10 left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

                {/* WhatsApp Chat Mockup - Back right */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="absolute top-0 right-0 w-56 lg:w-64 z-10"
                >
                  <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border">
                    <div className="bg-[#25D366] px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <UtensilsCrossed className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-white">
                        <p className="font-semibold text-sm">MenuPro Bot</p>
                        <p className="text-xs text-white/70">en línea</p>
                      </div>
                    </div>
                    <div className="p-3 bg-[#ECE5DD] min-h-[200px] space-y-2">
                      <div className="bg-white rounded-lg px-3 py-2 max-w-[80%] shadow-sm">
                        <p className="text-xs text-gray-800">¡Hola! ¿Listo para pedir? 🍔</p>
                        <p className="text-[10px] text-gray-400 text-right mt-1">10:30</p>
                      </div>
                      <div className="bg-[#DCF8C6] rounded-lg px-3 py-2 max-w-[80%] ml-auto shadow-sm">
                        <p className="text-xs text-gray-800">Sí, quiero ver el menú</p>
                        <p className="text-[10px] text-gray-500 text-right mt-1">10:31 ✓✓</p>
                      </div>
                      <div className="bg-white rounded-lg px-3 py-2 max-w-[80%] shadow-sm">
                        <p className="text-xs text-gray-800">Aquí tienes nuestro menú digital 📱</p>
                        <p className="text-[10px] text-gray-400 text-right mt-1">10:31</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Menu Phone Mockup - Center front */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="absolute top-16 left-4 lg:left-8 w-48 lg:w-56 z-20"
                >
                  <div className="bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
                    <div className="bg-white rounded-[2rem] overflow-hidden">
                      <div className="bg-[#25D366] px-4 py-2">
                        <p className="text-white font-semibold text-sm text-center">MENÚ</p>
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex gap-2 items-center bg-gray-50 rounded-lg p-2">
                          <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                            <span className="text-xl">🍔</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-xs">Hamburguesa Clásica</p>
                            <p className="text-[10px] text-gray-500">Carne, queso, lechuga</p>
                            <p className="text-xs font-bold text-[#25D366]">$18.000</p>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center bg-gray-50 rounded-lg p-2">
                          <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                            <span className="text-xl">🍕</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-xs">Pizza Suprema</p>
                            <p className="text-[10px] text-gray-500">Pepperoni, jamón</p>
                            <p className="text-xs font-bold text-[#25D366]">$32.000</p>
                          </div>
                        </div>
                        <div className="flex gap-2 items-center bg-gray-50 rounded-lg p-2">
                          <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                            <span className="text-xl">🥗</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-xs">Ensalada César</p>
                            <p className="text-[10px] text-gray-500">Pollo, crutones</p>
                            <p className="text-xs font-bold text-[#25D366]">$15.000</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Dashboard Mockup - Bottom right */}
                <motion.div
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="absolute bottom-0 right-0 w-72 lg:w-80 z-30"
                >
                  <div className="bg-white rounded-xl shadow-2xl overflow-hidden border">
                    <div className="bg-gray-50 px-4 py-2 border-b flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      </div>
                      <p className="text-xs text-gray-500 ml-2">Dashboard</p>
                    </div>
                    <div className="p-4">
                      <div className="flex gap-3 mb-4">
                        <div className="flex-1 bg-green-50 rounded-lg p-3">
                          <p className="text-[10px] text-gray-500">Ventas Hoy</p>
                          <p className="font-bold text-lg text-gray-900">$458.000</p>
                          <p className="text-[10px] text-green-600">↑ 12%</p>
                        </div>
                        <div className="flex-1 bg-blue-50 rounded-lg p-3">
                          <p className="text-[10px] text-gray-500">Pedidos</p>
                          <p className="font-bold text-lg text-gray-900">24</p>
                          <p className="text-[10px] text-blue-600">↑ 8%</p>
                        </div>
                      </div>
                      {/* Mini chart */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-[10px] text-gray-500 mb-2">Ventas Semana</p>
                        <div className="flex items-end gap-1 h-12">
                          <div className="flex-1 bg-[#25D366]/30 rounded-t" style={{ height: '40%' }} />
                          <div className="flex-1 bg-[#25D366]/30 rounded-t" style={{ height: '60%' }} />
                          <div className="flex-1 bg-[#25D366]/30 rounded-t" style={{ height: '45%' }} />
                          <div className="flex-1 bg-[#25D366]/30 rounded-t" style={{ height: '80%' }} />
                          <div className="flex-1 bg-[#25D366]/30 rounded-t" style={{ height: '70%' }} />
                          <div className="flex-1 bg-[#25D366]/30 rounded-t" style={{ height: '90%' }} />
                          <div className="flex-1 bg-[#25D366] rounded-t" style={{ height: '100%' }} />
                        </div>
                        <div className="flex justify-between text-[8px] text-gray-400 mt-1">
                          <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
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
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas para modernizar tu negocio
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Herramientas potentes diseñadas específicamente para restaurantes colombianos.
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
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Planes para cada tamaño de negocio
            </h2>
            <p className="text-lg text-gray-600">
              Comienza gratis y escala cuando lo necesites.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard name="Starter" price="Gratis" features={['Hasta 50 pedidos/mes', '1 usuario', 'Menú QR básico', 'Soporte por email']} onSelect={() => navigate('/register')} />
            <PricingCard name="Pro" price="$99.000/mes" popular features={['Pedidos ilimitados', '5 usuarios', 'Pantalla de cocina', 'WhatsApp básico', 'Analytics completo']} onSelect={() => navigate('/register')} />
            <PricingCard name="Business" price="$249.000/mes" features={['Todo de Pro', 'Usuarios ilimitados', 'WhatsApp avanzado', 'API access', 'Soporte prioritario']} onSelect={() => navigate('/register')} />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#25D366] to-[#128C7E]">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            ¿Listo para transformar tu restaurante?
          </h2>
          <p className="text-lg text-white/90 mb-8">
            Únete a cientos de restaurantes colombianos que ya usan MenuPro.
          </p>
          <Button
            size="lg"
            onClick={() => navigate('/register')}
            className="bg-white text-[#25D366] hover:bg-gray-100 text-lg px-8 h-14"
          >
            Comenzar gratis ahora
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#22C55E] flex items-center justify-center p-1.5">
                <img src="/favicon.svg" alt="MenuPro" className="w-full h-full brightness-0 invert" />
              </div>
              <span className="font-heading font-bold text-white uppercase tracking-tighter">MenuPro</span>
            </div>
            <p className="text-sm">
              © 2024 MenuPro. Hecho con amor para negocios apasionados.
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
      <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center mb-4 group-hover:bg-[#25D366] transition-colors">
        <Icon className="w-6 h-6 text-[#25D366] group-hover:text-white transition-colors" />
      </div>
      <h3 className="font-heading font-bold text-xl mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
}

function PricingCard({ name, price, features, popular, onSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`relative p-6 rounded-2xl bg-white border-2 ${popular ? 'border-[#25D366] shadow-lg' : 'border-gray-100'}`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#25D366] text-white text-sm font-medium">
          Popular
        </span>
      )}
      <h3 className="font-heading font-bold text-xl mb-2">{name}</h3>
      <p className="text-3xl font-bold text-gray-900 mb-6">{price}</p>
      <ul className="space-y-3 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-gray-600">
            <Check className="w-5 h-5 text-[#25D366]" />
            {feature}
          </li>
        ))}
      </ul>
      <Button
        className={`w-full ${popular ? 'bg-[#25D366] hover:bg-[#128C7E] text-white' : ''}`}
        variant={popular ? 'default' : 'outline'}
        onClick={onSelect}
      >
        Comenzar
      </Button>
    </motion.div>
  );
}
