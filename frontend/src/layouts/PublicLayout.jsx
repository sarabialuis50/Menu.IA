import { Link, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, ArrowLeft } from 'lucide-react';
import { FloatingWA } from '@/components/FloatingWA';

export const PublicLayout = ({
  children,
  businessName,
  businessLogo,
  slug,
  whatsapp,
  aiEnabled,
  aiSaludo,
  aiUseModal,
  isClosed = false,
  backPath,
  hidden = false
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    // Si hay un path específico para volver, lo usamos
    if (backPath) {
      navigate(backPath);
      return;
    }
    // Si hay historial de navegación en esta pestaña, retrocedemos
    if (window.history.length > 1) {
      navigate(-1);
    }
    // Si no hay historial pero tenemos el slug (somos dueños), volvemos al dashboard
    else if (slug) {
      navigate(`/dashboard/${slug}/perfil`);
    }
    // Si no, a la página principal
    else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full bg-[#0F172A] border-b border-slate-800 shadow-sm">
        <div className="px-4 md:px-10 py-3 flex items-center justify-between max-w-[1200px] mx-auto w-full">
          <div className="flex items-center gap-4">
            {/* Back Arrow Button */}
            <button
              onClick={handleBack}
              className="p-2 hover:bg-slate-800 rounded-full transition-colors text-white active:scale-90"
              aria-label="Volver"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <Link to={`/${slug}`} className="flex items-center gap-3 text-white group">
              <div className="size-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700">
                {/* Logo Logic: User provided > Generated Avatar > Default Icon */}
                <img
                  src={businessLogo || `https://ui-avatars.com/api/?name=${businessName || 'Menu.IA'}&background=22C55E&color=fff&bold=true`}
                  alt={businessName || 'Logo'}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${businessName || 'Menu.IA'}&background=22C55E&color=fff&bold=true`;
                  }}
                />
              </div>
              <h2 className="text-xl font-black leading-tight tracking-tighter truncate max-w-[200px] md:max-w-xs">{businessName || 'Menu.IA'}</h2>
            </Link>
          </div>

          <div className="flex items-center">
            {/* Optional: User Profile or Cart could go here, but for now we keep it empty and clean as requested */}
            <div className="size-10 rounded-full bg-slate-800 border border-slate-700 hidden sm:block" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Floating WA AI Agent */}
      <FloatingWA
        businessName={businessName}
        whatsapp={whatsapp}
        aiEnabled={aiEnabled}
        aiSaludo={aiSaludo}
        slug={slug}
        aiUseModal={aiUseModal}
        isClosed={isClosed}
        hidden={hidden}
      />

      {/* Shared Footer or Spacing */}
      <div className="h-24 md:h-28" />
    </div>
  );
};
