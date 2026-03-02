import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, FileText, Shield, Cookie, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LegalPage() {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = React.useState('autorizacion');

    const legalLinks = [
        { id: 'terminos', title: 'Términos y Condiciones de Uso de la Plataforma Menu.IA', icon: FileText },
        { id: 'autorizacion', title: 'Autorización de Tratamiento de datos personales Usuarios – Menu.IA', icon: Shield },
        { id: 'privacidad', title: 'Política de Tratamiento de Datos Personales (Política de Privacidad)', icon: Shield },
        { id: 'cookies', title: 'Política de Cookies – Colombia', icon: Cookie },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'terminos':
                return (
                    <>
                        <p className="text-xs font-black uppercase tracking-widest text-[#22B8CF] mb-4">Legal & Términos</p>
                        <h1 className="text-3xl md:text-4xl font-black text-[#111814] mb-8 leading-tight">
                            Términos y Condiciones de Uso de la Plataforma Menu.IA
                        </h1>
                        <div className="space-y-6 text-gray-600 leading-relaxed font-medium">
                            <p>Bienvenido a Menu.IA. Al acceder o utilizar nuestra plataforma, usted acepta estar sujeto a estos Términos y Condiciones.</p>
                            <h2 className="text-xl font-black text-[#111814] mt-10">1. Descripción del Servicio</h2>
                            <p>Menu.IA proporciona una plataforma SaaS diseñada para optimizar la gestión de establecimientos gastronómicos a través de menús digitales, gestión de pedidos y herramientas de fidelización.</p>
                            <h2 className="text-xl font-black text-[#111814] mt-10">2. Registro de Usuario</h2>
                            <p>Para utilizar nuestros servicios, los comercios deben registrarse y proporcionar información verídica, exacta y completa. El uso de la cuenta es responsabilidad exclusiva del titular.</p>
                            <h2 className="text-xl font-black text-[#111814] mt-10">3. Pagos y Suscripciones</h2>
                            <p>Nuestros servicios se ofrecen bajo modelos de suscripción mensual o anual. El incumplimiento en los pagos puede resultar en la suspensión temporal de los servicios adicionales de IA y gestión.</p>
                        </div>
                    </>
                );
            case 'cookies':
                return (
                    <>
                        <p className="text-xs font-black uppercase tracking-widest text-[#22B8CF] mb-4">Uso de Tecnologías</p>
                        <h1 className="text-3xl md:text-4xl font-black text-[#111814] mb-8 leading-tight">
                            Política de Cookies – Colombia
                        </h1>
                        <div className="space-y-6 text-gray-600 leading-relaxed font-medium">
                            <p>Esta política explica qué son las cookies y cómo las utilizamos en Menu.IA para brindarle una mejor experiencia.</p>
                            <h2 className="text-xl font-black text-[#111814] mt-10">1. ¿Qué son las Cookies?</h2>
                            <p>Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web. Ayudan a que el sitio recuerde sus preferencias y acciones.</p>
                            <h2 className="text-xl font-black text-[#111814] mt-10">2. Tipos de Cookies que Utilizamos</h2>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Necesarias:</strong> Esenciales para el funcionamiento de la plataforma y el inicio de sesión.</li>
                                <li><strong>Analíticas:</strong> Nos ayudan a entender cómo los usuarios interactúan con la plataforma.</li>
                                <li><strong>Seguridad:</strong> Utilizadas para prevenir fraudes y proteger la integridad de los datos.</li>
                            </ul>
                        </div>
                    </>
                );
            case 'autorizacion':
            default:
                return (
                    <>
                        <p className="text-xs font-black uppercase tracking-widest text-[#22B8CF] mb-4">Legal & Privacidad</p>
                        <h1 className="text-3xl md:text-4xl font-black text-[#111814] mb-8 leading-tight">
                            Autorización de Tratamiento de datos personales Usuarios – Menu.IA
                        </h1>
                        <div className="space-y-6 text-gray-600 leading-relaxed font-medium">
                            <p>
                                Para <strong>Menu.IA</strong>, sociedad debidamente constituida bajo las normas de la República de Colombia, identificada con Nit No. 900.000.000-0 (en adelante, “<strong>MENU.IA</strong>”), proteger la privacidad de sus usuarios es muy importante.
                            </p>
                            <p>
                                Por lo tanto, <strong>MENU.IA</strong> da estricto cumplimiento a lo dispuesto en la Ley Estatutaria 1581 de 2012, reglamentada parcialmente por los Decretos 1377 de 2013 y Decreto 886 de 2014, normas compiladas en el Decreto Único Nacional del Sector Comercio, Industria y Turismo 1074 de 2015 y aquellas normas que lo modifiquen.
                            </p>
                            <p>
                                <strong>MENU.IA</strong> le informa que sus datos serán tratados conforme a la <strong>POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES</strong> que se encuentra publicada tanto en la plataforma virtual y en el siguiente link para su consulta <Link to="/legal/politica-privacidad" className="text-[#22B8CF] underline">https://menuia.co/legal/politica-datos</Link>.
                            </p>
                            <h2 className="text-xl font-black text-[#111814] mt-10">1. Finalidad del Tratamiento</h2>
                            <p>Los datos personales recolectados por MENU.IA tienen como finalidad principal:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Permitir la creación de cuentas de usuario y la gestión de pedidos en establecimientos gastronómicos.</li>
                                <li>Facilitar la comunicación entre el comercio y el cliente final mediante canales como WhatsApp y notificaciones push.</li>
                                <li>Implementar programas de fidelización (Duntos) y beneficios personalizados.</li>
                                <li>Realizar análisis estadísticos y de mercado para mejorar la experiencia de usuario.</li>
                                <li>Garantizar la seguridad de las transacciones y la prevención de fraude.</li>
                            </ul>
                            <h2 className="text-xl font-black text-[#111814] mt-10">2. Derechos de los Titulares</h2>
                            <p>Como titular de sus datos personales, usted tiene derecho a conocer, actualizar, rectificar y suprimir su información personal. Puede ejercer estos derechos enviando una solicitud al correo <span className="text-[#22C55E] font-bold">soporte@menuia.co</span>.</p>
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAF9] font-inter">
            {/* Header */}
            <nav className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-50">
                <Link to="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg overflow-hidden">
                        <img src="/logos/logo-icon-white.png" alt="Menu.IA" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-heading font-black text-lg tracking-tighter">
                        <span className="text-[#22C55E]">Menu</span>
                        <span className="text-[#22B8CF]">.IA</span>
                    </span>
                </Link>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/')} className="text-sm font-bold text-gray-600">
                        Ir a Menu.IA
                    </Button>
                    <Button onClick={() => navigate('/register')} className="bg-[#4ADE80] text-[#111814] font-bold rounded-xl hidden sm:block">
                        Quiero ser parte
                    </Button>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-12">
                {/* Sidebar */}
                <aside className="w-full md:w-80 shrink-0">
                    <div className="sticky top-24 space-y-2">
                        {legalLinks.map((link, idx) => (
                            <button
                                key={link.id}
                                onClick={() => setActiveSection(link.id)}
                                className={`w-full text-left p-4 rounded-2xl transition-all flex items-start gap-3 group ${activeSection === link.id
                                    ? 'bg-white shadow-md border border-gray-100 text-[#22C55E]'
                                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <link.icon className={`w-5 h-5 shrink-0 mt-0.5 ${activeSection === link.id ? 'text-[#22C55E]' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                <span className="text-sm font-bold leading-tight">{link.title}</span>
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Content */}
                <main className="flex-1 bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-gray-100 min-h-[600px]">
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="prose prose-slate lg:prose-lg max-w-none"
                    >
                        {renderContent()}

                        <div className="mt-12 p-8 bg-[#FAFAF9] rounded-3xl border border-dashed border-gray-200">
                            <p className="text-sm text-gray-500 italic mb-0">
                                Última actualización: 02 de Marzo de 2026. Al utilizar nuestra plataforma, usted acepta los términos aquí descritos.
                            </p>
                        </div>
                    </motion.div>
                </main>
            </div>

            {/* Footer minimal */}
            <footer className="bg-white border-t mt-20 py-12">
                <div className="max-w-7xl mx-auto px-4">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">
                        © 2026 Menu.IA - Todos los derechos reservados
                    </p>
                </div>
            </footer>
        </div>
    );
}
