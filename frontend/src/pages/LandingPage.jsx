import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, User, ArrowRight, Clock, Star, Flame, MapPin, Phone } from 'lucide-react';
import { FaInstagram, FaFacebook, FaTiktok, FaWhatsapp } from 'react-icons/fa';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const navigate = useNavigate();

  const sedes = [
    {
      id: 'norte',
      slug: 'sede-norte',
      name: 'Sede Norte',
      address: 'Calle 100 # 15-20',
      schedule: '11:00 AM - 10:00 PM',
      price: 'Abierto',
      image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      desc: 'Nuestra sede principal en el norte de la ciudad. Amplios espacios y terraza.'
    },
    {
      id: 'centro',
      slug: 'sede-centro',
      name: 'Sede Centro',
      address: 'Carrera 7 # 22-10',
      schedule: '10:00 AM - 9:00 PM',
      price: 'Abierto',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      desc: 'El corazón de la ciudad. Ideal para un almuerzo rápido y delicioso.'
    },
    {
      id: 'sur',
      slug: 'sede-sur',
      name: 'Sede Sur',
      address: 'Avenida 68 # 3-50',
      schedule: '12:00 PM - 11:00 PM',
      price: 'Abierto',
      image: 'https://images.unsplash.com/photo-1586816001966-79b736744398?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      desc: 'Ambiente familiar y la misma calidad dorada de siempre.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white selection:bg-[#D4AF37] selection:text-black font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <Flame className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl leading-tight text-white tracking-wide">GOLDEN</span>
                <span className="font-black text-xl leading-tight text-[#D4AF37] tracking-wide">BURGER</span>
              </div>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-6">
              <button onClick={() => navigate('/login')} className="text-gray-300 hover:text-white transition-colors">
                <User className="w-6 h-6" />
              </button>
              <button className="text-gray-300 hover:text-white transition-colors">
                <ShoppingCart className="w-6 h-6" />
              </button>
              <Button
                onClick={() => document.getElementById('sedes').scrollIntoView({ behavior: 'smooth' })}
                className="bg-[#D4AF37] hover:bg-[#B5952F] text-black font-bold px-6 py-2 rounded-xl transition-colors hidden sm:flex"
              >
                Pedir Ahora
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1551782450-a2132b4ba21d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
            alt="Fuego y Hamburguesas" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d] via-[#0d0d0d]/80 to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <div className="inline-flex items-center gap-2 border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-2 rounded-full mb-8">
              <Flame className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[#D4AF37] text-sm font-semibold tracking-wide">El Auténtico Sabor a la Parrilla</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tighter leading-[1.1]">
              Sabe a <span className="text-[#D4AF37]">Oro</span>.<br/>
              <span className="whitespace-nowrap">Sabe a <span className="text-[#D4AF37]">Burger</span>.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-xl font-medium leading-relaxed">
              Llevamos la magia de la parrilla directamente a tu puerta. Tradición, paciencia y las mejores hamburguesas de la ciudad.
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <Button 
                onClick={() => document.getElementById('sedes').scrollIntoView({ behavior: 'smooth' })}
                className="bg-[#D4AF37] hover:bg-[#B5952F] text-black font-bold text-lg px-8 py-6 rounded-2xl transition-all hover:scale-105"
              >
                Ver Sedes <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/register')}
                className="border-white/20 text-white hover:bg-white/10 font-bold text-lg px-8 py-6 rounded-2xl bg-transparent transition-all"
              >
                Registrarse
              </Button>
            </div>
          </div>

          {/* Right Floating Card */}
          <div className="hidden lg:flex justify-end items-center mt-32">
            <div 
              className="bg-[#1a1a1a]/80 backdrop-blur-lg border border-white/10 p-6 rounded-3xl max-w-sm shadow-2xl relative transition-transform duration-1000 ease-in-out"
              style={{ animation: 'float 6s ease-in-out infinite' }}
            >
              <style>
                {`
                  @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                    100% { transform: translateY(0px); }
                  }
                `}
              </style>
              <div className="absolute -top-6 -left-6 w-12 h-12 bg-[#D4AF37] rounded-full flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-white font-bold text-xl mb-1 mt-2">Domicilios Fast</h3>
              <p className="text-gray-400 text-sm mb-4">Menos de 45 min</p>
              <p className="text-gray-300 italic text-sm">
                "La hamburguesa llegó calientita y el sabor a parrilla es increíble. La mejor del sector." <br/>
                <span className="text-[#D4AF37] font-semibold block mt-2">- Juan P.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sedes Section */}
      <section id="sedes" className="py-24 px-4 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-white">Nuestras <span className="text-[#D4AF37]">Sedes</span></h2>
              <p className="text-gray-400 mt-2 text-lg">Elige tu ubicación más cercana para hacer tu pedido</p>
            </div>
            <button className="text-[#D4AF37] font-bold flex items-center hover:underline whitespace-nowrap">
              Ver en el mapa <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {sedes.map((sede) => (
              <div 
                key={sede.id}
                className="bg-[#161616] rounded-[2rem] overflow-hidden border border-white/5 hover:border-[#D4AF37]/50 transition-all duration-300 group flex flex-col"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img 
                    src={sede.image} 
                    alt={sede.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#161616] to-transparent opacity-80" />
                </div>
                
                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-black text-white group-hover:text-[#D4AF37] transition-colors">
                      {sede.name}
                    </h3>
                    <span className="text-[#D4AF37] font-bold">{sede.price}</span>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-6 flex-1">
                    {sede.desc}
                  </p>

                  <Button 
                    onClick={() => navigate(`/${sede.slug}`)} 
                    variant="outline"
                    className="w-full border-white/10 text-white hover:bg-[#D4AF37] hover:text-black hover:border-[#D4AF37] font-bold text-base h-12 rounded-xl transition-all"
                  >
                    Ingresar a la Sede
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Secret Section */}
      <section className="py-24 px-4 bg-[#111111] overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Image with Tag */}
            <div className="relative order-2 lg:order-1">
              <div className="aspect-square rounded-[3rem] overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                  alt="Proceso de asado" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 bg-[#D4AF37] text-black font-black text-center p-6 rounded-3xl shadow-xl transform rotate-3">
                <span className="block text-4xl leading-none">100%</span>
                <span className="block text-sm tracking-widest mt-1">CARNE ANGUS</span>
              </div>
            </div>

            {/* Right Content */}
            <div className="order-1 lg:order-2">
              <span className="text-[#D4AF37] font-bold tracking-widest text-sm uppercase mb-4 block">NUESTRO SECRETO</span>
              <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                El Sabor es el Ingrediente <span className="text-[#D4AF37]">Principal</span>
              </h2>
              <p className="text-gray-400 text-lg mb-12 leading-relaxed">
                No usamos ingredientes artificiales ni procesos industriales. Cada hamburguesa que sale de nuestra cocina ha sido preparada al momento, con pan artesanal y vegetales frescos. Es una técnica clásica que requiere atención, pero los resultados hablan por sí solos.
              </p>

              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-white/5 flex items-center justify-center shrink-0">
                    <Flame className="w-7 h-7 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Parrilla Perfecta</h4>
                    <p className="text-gray-400">Respetamos los tiempos de la carne para un término ideal.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-white/5 flex items-center justify-center shrink-0">
                    <Star className="w-7 h-7 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Calidad Premium</h4>
                    <p className="text-gray-400">Solo cortes certificados y pan de masa madre horneado hoy.</p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Loyalty Banner */}
      <section className="py-24 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto bg-[#D4AF37] rounded-[3rem] p-10 md:p-16 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-black text-black mb-6 leading-tight">
              ¡Afíliate a nuestro programa de fidelización y obtén beneficios!
            </h2>
            <p className="text-black/80 text-lg md:text-xl font-medium mb-10">
              Accede a descuentos, promociones, ofertas y una variedad de beneficios exclusivos para nuestros clientes dorados.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button className="bg-[#0d0d0d] hover:bg-black text-[#D4AF37] font-black text-lg px-10 py-6 rounded-2xl shadow-xl hover:scale-105 transition-all">
                Afíliate ahora
              </Button>
              
              <div className="flex items-center gap-4 text-black font-bold">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-300 border-2 border-[#D4AF37] overflow-hidden"><img src="https://i.pravatar.cc/100?img=1" alt="User" /></div>
                  <div className="w-10 h-10 rounded-full bg-gray-300 border-2 border-[#D4AF37] overflow-hidden"><img src="https://i.pravatar.cc/100?img=2" alt="User" /></div>
                  <div className="w-10 h-10 rounded-full bg-gray-300 border-2 border-[#D4AF37] overflow-hidden"><img src="https://i.pravatar.cc/100?img=3" alt="User" /></div>
                  <div className="w-10 h-10 rounded-full bg-gray-300 border-2 border-[#D4AF37] overflow-hidden"><img src="https://i.pravatar.cc/100?img=4" alt="User" /></div>
                </div>
                <span>+2k usuarios felices</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0d0d0d] pt-20 pb-10 border-t border-white/5 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          
          {/* Column 1: Logo & Social */}
          <div className="col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <Flame className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl leading-tight text-white tracking-wide">GOLDEN</span>
                <span className="font-black text-xl leading-tight text-[#D4AF37] tracking-wide">BURGER</span>
              </div>
            </Link>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed max-w-xs">
              Artesanos de la hamburguesa. Domicilios rápidos y la mejor calidad.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:bg-white/5 transition-colors">
                <FaInstagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:bg-white/5 transition-colors">
                <FaFacebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:bg-white/5 transition-colors">
                <FaTiktok className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-[#D4AF37] hover:bg-white/5 transition-colors">
                <FaWhatsapp className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-4 h-[2px] bg-[#D4AF37]" />
              <h4 className="text-white font-bold text-lg">Navegación</h4>
            </div>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-400 hover:text-[#D4AF37] transition-colors">Menú</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#D4AF37] transition-colors">Mi Carrito</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[#D4AF37] transition-colors">Mi Cuenta</a></li>
            </ul>
          </div>

          {/* Column 3: Horarios */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-4 h-[2px] bg-[#D4AF37]" />
              <h4 className="text-white font-bold text-lg">Horarios</h4>
            </div>
            <ul className="space-y-4">
              <li className="flex justify-between text-gray-400">
                <span>Lunes - Viernes:</span>
                <span className="text-white font-medium">11:00 - 22:00</span>
              </li>
              <li className="flex justify-between text-gray-400">
                <span>Sábado:</span>
                <span className="text-white font-medium">12:00 - 23:00</span>
              </li>
              <li className="flex justify-between text-gray-400">
                <span>Domingos:</span>
                <span className="text-white font-medium">12:00 - 21:00</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Ubicaciones */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-4 h-[2px] bg-[#D4AF37]" />
              <h4 className="text-white font-bold text-lg">Ubícanos</h4>
            </div>
            <ul className="space-y-5">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                <span className="text-gray-400 text-sm">Contamos con sedes en el Norte, Centro y Sur de la ciudad.</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#D4AF37] shrink-0" />
                <span className="text-gray-400">+57 300 123 4567</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-5 h-5 text-[#D4AF37] shrink-0 flex items-center justify-center">@</div>
                <span className="text-gray-400">info@goldenburger.com</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © 2026 <span className="text-white font-medium">The Golden Burger</span>. Todos los derechos reservados.
          </p>
          
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[#D4AF37] font-medium text-sm">¡Estamos Cocinando!</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Privacidad</a>
            <a href="#" className="hover:text-white transition-colors">Términos</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
