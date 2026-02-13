import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Mail, Lock, Eye, EyeOff, Loader2, User, Building, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    email: '',
    password: '',
    telefono: '',
    whatsapp: ''
  });

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (e) => {
    const nombre = e.target.value;
    setFormData({
      ...formData,
      nombre,
      slug: generateSlug(nombre)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const business = await register({
        ...formData,
        whatsapp: formData.whatsapp || formData.telefono
      });
      toast.success('¡Cuenta creada exitosamente!');
      navigate(`/dashboard/${business.slug}`);
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al crear la cuenta';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex">
      {/* Left Panel - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#25D366] to-[#128C7E]" />
        <img
          src="https://images.unsplash.com/photo-1723693407562-bb4fcae76797?w=800&q=80"
          alt="Restaurant"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-white text-center">
            <h2 className="font-heading text-4xl font-bold mb-4">
              Únete a Menu.IA
            </h2>
            <p className="text-lg text-white/90">
              La plataforma líder para la digitalización y fidelización de restaurantes.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center p-2">
              <img src="/favicon.svg" alt="Menu.IA" className="w-full h-full" />
            </div>
            <span className="font-heading font-black text-xl tracking-tighter">Menu.IA</span>
          </Link>

          <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2">
            Crear cuenta
          </h1>
          <p className="text-gray-600 mb-8">
            Comienza a digitalizar tu restaurante hoy
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del negocio</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="nombre"
                  placeholder="Mi Restaurante"
                  value={formData.nombre}
                  onChange={handleNameChange}
                  className="pl-10 h-12"
                  required
                  data-testid="register-nombre-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL del menú</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  menuia.co/
                </span>
                <Input
                  id="slug"
                  placeholder="mi-restaurante"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="pl-24 h-12"
                  required
                  data-testid="register-slug-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 h-12"
                  required
                  data-testid="register-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono / WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="telefono"
                  placeholder="+57 300 123 4567"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value, whatsapp: e.target.value })}
                  className="pl-10 h-12"
                  data-testid="register-telefono-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10 h-12"
                  required
                  data-testid="register-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#25D366] hover:bg-[#128C7E] text-white text-base mt-2"
              data-testid="register-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                'Crear cuenta gratis'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-[#25D366] hover:text-[#128C7E] font-medium">
              Inicia sesión
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
