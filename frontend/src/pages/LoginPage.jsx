import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const business = await login(formData.email, formData.password);
      toast.success('¡Bienvenido de vuelta!');
      navigate(`/dashboard/${business.slug}`);
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al iniciar sesión';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
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
            Iniciar sesión
          </h1>
          <p className="text-gray-600 mb-8">
            Ingresa a tu cuenta para gestionar tu negocio
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  data-testid="login-email-input"
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
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10 h-12"
                  required
                  data-testid="login-password-input"
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
              className="w-full h-12 bg-[#25D366] hover:bg-[#128C7E] text-white text-base"
              data-testid="login-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-[#25D366] hover:text-[#128C7E] font-medium">
              Regístrate gratis
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#25D366] to-[#128C7E]" />
        <img
          src="https://images.unsplash.com/photo-1654018334224-4887d9e85ffe?w=800&q=80"
          alt="Restaurant"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-white text-center">
            <h2 className="font-heading text-4xl font-bold mb-4">
              Gestiona tu restaurante con inteligencia
            </h2>
            <p className="text-lg text-white/90">
              Pedidos, fidelización y automatización en una sola plataforma. Bienvenido a Menu.IA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
