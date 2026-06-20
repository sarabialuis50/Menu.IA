import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
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
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 md:top-8 md:left-8 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Button>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37] flex items-center justify-center overflow-hidden shadow-lg">
              <span className="text-black font-black text-xl">🍔</span>
            </div>
            <span className="font-heading font-black text-xl tracking-tighter">
              <span className="text-[#D4AF37]">Burger</span>
              <span className="text-gray-800"> Full</span>
            </span>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-[#D4AF37] hover:text-[#B8962E]"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
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
              className="w-full h-12 bg-[#D4AF37] hover:bg-[#B8962E] text-black text-base font-bold rounded-xl"
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
            <Link to="/register" className="text-[#D4AF37] hover:text-[#B8962E] font-bold">
              Regístrate gratis
            </Link>
          </p>
        </motion.div>
      </div>

        <div className="hidden lg:block lg:w-1/2 relative bg-[#1a0a00] overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a00] via-[#2d1500] to-[#1a0a00]" />

          {/* Decorative glows */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#D4AF37]/15 rounded-full blur-[100px] transform -translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-700/15 rounded-full blur-[100px] transform translate-x-1/3 translate-y-1/3" />

          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 z-10">
            <div className="text-white text-center max-w-2xl mx-auto space-y-8">
              {/* Logo emoji */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-40 h-40 mx-auto -mb-4 relative flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-[#D4AF37]/20 rounded-full blur-2xl animate-pulse" />
                <span className="text-[120px] drop-shadow-2xl relative z-10">🍔</span>
              </motion.div>

              <div className="space-y-4">
                <h2 className="font-heading text-4xl lg:text-5xl font-bold tracking-tight text-white drop-shadow-lg text-balance">
                  Bienvenido a{' '}
                  <span className="text-[#D4AF37]">Burger</span>
                  <span className="text-white"> Full</span>
                </h2>
                <p className="text-lg lg:text-xl text-gray-300 font-medium leading-relaxed drop-shadow-md text-balance max-w-lg mx-auto">
                  El sabor a parrilla que enamora. Gestiona tus sedes, pedidos y cocina en un solo lugar.
                </p>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
