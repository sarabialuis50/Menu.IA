import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Users, User, Award, Settings, Loader2, Check, TrendingUp, ArrowRight, Save, Calculator, Landmark, Search, Camera, Minus, Plus, Filter, Clock, Trophy, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function FidelidadPage() {
  const { slug } = useParams();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [config, setConfig] = useState({
    activo: false,
    pesos_por_punto: 0,
    puntos_minimo_canje: 0,
    valor_punto_descuento: 0
  });
  const [originalConfig, setOriginalConfig] = useState(null);

  // Search & Award State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [creditMode, setCreditMode] = useState('compra'); // 'compra' | 'manual'
  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [manualPoints, setManualPoints] = useState(0);
  const [awarding, setAwarding] = useState(false);
  const [recentCredits, setRecentCredits] = useState([
    { id: '1', nombre: 'Cliente Ejemplo', puntos: 20, fecha: 'Hace 5 minutos', estado: 'Completado' }
  ]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = recentCredits.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(recentCredits.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  // Simulator State
  const [simVenta, setSimVenta] = useState(0);
  const [simCashback, setSimCashback] = useState(0);
  const [simPuntos, setSimPuntos] = useState(0);
  const [tempConfigValue, setTempConfigValue] = useState('');

  // Sync points with cashback for a "live" simulator experience (1pt = $1 default)
  useEffect(() => {
    const calculatedPuntos = Math.round((simVenta * simCashback) / 100);
    setSimPuntos(calculatedPuntos);
  }, [simVenta, simCashback]);

  // Sync Amount -> Points in Award Section
  useEffect(() => {
    if (creditMode === 'compra') {
      if (config.pesos_por_punto > 0) {
        const calculated = Math.floor(purchaseAmount / (config.pesos_por_punto));
        setManualPoints(calculated);
      } else {
        setManualPoints(0);
      }
    }
  }, [purchaseAmount, config.pesos_por_punto, creditMode]);

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = async () => {
    try {
      const [configRes, customersRes, transactionsRes] = await Promise.all([
        api().get(`/loyalty/${slug}/config`),
        api().get(`/loyalty/${slug}/customers`).catch(() => ({ data: [] })),
        api().get(`/loyalty/${slug}/recent-transactions?limit=50`).catch(() => ({ data: [] }))
      ]);
      if (configRes.data) {
        setConfig(configRes.data);
        setOriginalConfig(configRes.data);
        setTempConfigValue('');
      }
      setCustomers(customersRes.data || []);

      if (transactionsRes.data) {
        const formatted = transactionsRes.data.map(t => ({
          ...t,
          fecha: new Date(t.fecha).toLocaleString()
        }));
        setRecentCredits(formatted);
      }
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api().post(`/loyalty/${slug}/config`, config);
      setOriginalConfig(res.data || config);
      toast.success('¡Configuración guardada exitosamente!');
    } catch (error) {
      toast.error('Hubo un error al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    if (!originalConfig) return false;
    return JSON.stringify(config) !== JSON.stringify(originalConfig);
  };

  const getButtonStyle = (hasPendingChanges) => {
    if (hasPendingChanges) {
      return "h-14 rounded-full border-2 border-transparent bg-[#13ec6d] hover:bg-[#0fd660] text-[#111814] font-black uppercase text-[10px] tracking-widest px-10 transition-all flex items-center gap-2 group shadow-lg shadow-[#13ec6d]/20 active:scale-95";
    }
    return "h-14 rounded-full border-2 border-[#13ec6d] bg-transparent text-[#13ec6d] font-black uppercase text-[10px] tracking-widest px-10 transition-all flex items-center gap-2 group active:scale-95 hover:bg-[#13ec6d]/5";
  };

  const applySimulator = () => {
    if (simPuntos <= 0) return;

    // Logic from image:
    // 1. Calculate suggested Pesos Per Point
    let pesosPunto = simVenta / simPuntos;

    // 2. Calculate the corresponding Value per point to satisfy the cashback %
    const targetBenficio = simVenta * (simCashback / 100);
    let valorPunto = targetBenficio / simPuntos;

    // Scale optimization: find integer values that preserve the cashback %
    if (valorPunto > 0 && valorPunto < 1) {
      const factor = Math.ceil(1 / valorPunto);
      pesosPunto = Math.round(pesosPunto * factor);
      valorPunto = Math.round(valorPunto * factor);
    } else {
      pesosPunto = Math.round(pesosPunto);
      valorPunto = Math.round(valorPunto);
    }

    setConfig({
      ...config,
      pesos_por_punto: pesosPunto,
      valor_punto_descuento: valorPunto
    });
    setTempConfigValue(pesosPunto);

    toast.success('Estrategia aplicada a la configuración real');
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const res = await api().get(`/loyalty/${slug}/customers?q=${searchQuery}`);
      setSearchResults(res.data);
      if (res.data.length === 0) {
        toast.info('No se encontraron clientes');
      }
    } catch (error) {
      toast.error('Error al buscar clientes');
    } finally {
      setSearching(false);
    }
  };

  const handleAwardPoints = async () => {
    if (!selectedCustomer) {
      toast.error('Selecciona un cliente primero');
      return;
    }

    let points = 0;
    let description = '';
    let amount = 0;

    if (!config || !config.pesos_por_punto) {
      toast.error('Configuración de fidelidad no detectada');
      return;
    }

    if (creditMode === 'compra') {
      if (purchaseAmount <= 0) {
        toast.error('Ingresa un monto de compra válido');
        return;
      }
      points = Math.floor(purchaseAmount / config.pesos_por_punto);
      amount = purchaseAmount;
      description = `Acreditación por compra de $${purchaseAmount.toLocaleString()}`;
    } else {
      if (manualPoints <= 0) {
        toast.error('Ingresa una cantidad de puntos válida');
        return;
      }
      points = manualPoints;
      amount = manualPoints * config.pesos_por_punto;
      description = `Acreditación manual de ${points} puntos`;
    }

    if (points <= 0) {
      toast.error('La cantidad de puntos debe ser mayor a 0');
      return;
    }

    setAwarding(true);
    try {
      await api().post(`/loyalty/${slug}/award`, {
        telefono: selectedCustomer.telefono,
        puntos: points,
        descripcion: description,
        monto: amount
      });

      // Update recent credits locally
      setRecentCredits([
        {
          id: Date.now().toString(),
          nombre: selectedCustomer.nombre || selectedCustomer.telefono,
          puntos: points,
          monto: amount,
          fecha: 'Ahora mismo',
          estado: 'Completado'
        },
        ...recentCredits
      ]);

      toast.success(`¡${points} puntos acreditados correctamente!`);
      // Reset
      setPurchaseAmount(0);
      setManualPoints(0);
      setSelectedCustomer(null);
      setSearchQuery('');
      setSearchResults([]);
      fetchData();
    } catch (error) {
      toast.error('Error al acreditar puntos');
    } finally {
      setAwarding(false);
    }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

  const totalPuntos = customers.reduce((sum, c) => sum + (c.puntos_disponibles || 0), 0);
  const totalClientes = customers.length;

  // Final effective cashback % calculated from real config
  const cashbackPorcentaje = config.pesos_por_punto > 0
    ? ((config.valor_punto_descuento / config.pesos_por_punto) * 100).toFixed(1)
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-[#22C55E] animate-spin" />
            <p className="text-sm font-medium text-gray-400">Cargando ecosistema de fidelidad...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate suggested values reactively for the UI
  const getOptimizedSuggestions = () => {
    if (simPuntos <= 0) return { spend: 0, value: 0 };

    let spend = simVenta / simPuntos;
    const targetProfit = simVenta * (simCashback / 100);
    let value = targetProfit / simPuntos;

    // Scale optimization: find integer values that preserve the cashback %
    if (value > 0 && value < 1) {
      const factor = Math.ceil(1 / value);
      spend = Math.round(spend * factor);
      value = Math.round(value * factor);
    } else {
      spend = Math.round(spend);
      value = Math.round(value);
    }
    return { spend, value };
  };

  const { spend: suggestedSpend, value: suggestedValue } = getOptimizedSuggestions();

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-20">

        {/* Superior Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">CONFIGURACIÓN DE PUNTOS</h1>
            <p className="text-gray-500 font-medium text-sm">Diseña la estrategia de rentabilidad y fidelización de tu negocio</p>
          </div>
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-4 py-2 border-r border-gray-100 italic text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</div>
            <div className="flex items-center gap-3 px-2">
              <Switch
                id="activo-header"
                checked={config.activo}
                onCheckedChange={(checked) => setConfig({ ...config, activo: checked })}
                className="data-[state=checked]:bg-[#22C55E]"
              />
              <Label htmlFor="activo-header" className="font-black text-[10px] uppercase cursor-pointer">
                {config.activo ? 'Programa Activo' : 'Programa Pausado'}
              </Label>
            </div>
          </div>
        </div>

        {/* SECTION: SIMULADOR DE PUNTOS (IMAGE DESIGN) */}
        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="bg-[#f8faf9] border-b border-gray-100 px-10 py-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#22C55E] flex items-center justify-center shadow-lg shadow-[#22C55E]/20">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-[#22C55E]">Simulador de Puntos</CardTitle>
                <CardDescription className="text-[10px] font-bold text-gray-400 mt-0.5">Define tu inversión por compra antes de configurar</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-10 py-12 space-y-12">

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">

              {/* Step 1: VENTA */}
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">1. VENTA DE</Label>
                <div className="h-16 rounded-3xl border-2 border-[#22C55E]/30 bg-white px-6 flex items-center group focus-within:border-[#22C55E] transition-all shadow-sm">
                  <span className="font-black text-gray-900 text-xl mr-2 h-full flex items-center">$</span>
                  <Input
                    type="number"
                    value={simVenta === 0 ? '' : simVenta}
                    onChange={(e) => setSimVenta(parseInt(e.target.value) || 0)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0"
                    className="border-none bg-transparent p-0 text-xl font-black focus-visible:ring-0 w-full h-full flex items-center"
                  />
                </div>
              </div>

              {/* Step 2: EQUIVALENCIA (CASHBACK) */}
              <div className="space-y-4 relative group">
                <div className="hidden md:flex absolute -left-6 top-2/3 -translate-y-1/2 z-10 items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-[#22C55E]/40" />
                </div>
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">2. EQUIVALENCIA</Label>
                <div className="h-16 rounded-3xl border-2 border-[#22C55E]/30 bg-white px-6 flex items-center group focus-within:border-[#22C55E] transition-all shadow-sm">
                  <Input
                    type="number"
                    value={simCashback === 0 ? '' : simCashback}
                    onChange={(e) => setSimCashback(parseInt(e.target.value) || 0)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0"
                    className="border-none bg-transparent p-0 text-2xl font-black text-[#22C55E] focus-visible:ring-0 w-full text-center h-full"
                  />
                  <div className="flex flex-col items-end leading-none ml-2">
                    <span className="text-[10px] font-black text-[#22C55E] uppercase tracking-tighter">%</span>
                    <span className="text-[7px] font-black text-[#22C55E]/60 uppercase tracking-tighter whitespace-nowrap">CASHBACK</span>
                  </div>
                </div>
              </div>

              {/* Step 3: PUNTOS (Reactive) */}
              <div className="space-y-4 relative">
                <div className="hidden md:flex absolute -left-6 top-2/3 -translate-y-1/2 z-10 items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-[#22C55E]/40" />
                </div>
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">3. CLIENTE RECIBE</Label>
                <div className="h-16 rounded-3xl border-2 border-[#22C55E]/30 bg-white px-6 flex items-center group focus-within:border-[#22C55E] transition-all shadow-md shadow-[#22C55E]/5">
                  <Input
                    type="number"
                    value={simPuntos === 0 ? '' : simPuntos}
                    onChange={(e) => setSimPuntos(parseInt(e.target.value) || 0)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0"
                    className="border-none bg-transparent p-0 text-2xl font-black text-[#22C55E] focus-visible:ring-0 w-full text-center h-full flex items-center"
                  />
                  <span className="text-[8px] font-black text-[#22C55E] uppercase tracking-widest ml-2">PUNTOS</span>
                </div>
              </div>

              {/* Step 4: RESULTADO (CONFIGURACIÓN SUGERIDA) */}
              <div className="space-y-4 relative">
                <div className="hidden md:flex absolute -left-6 top-2/3 -translate-y-1/2 z-10 items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-[#22C55E]/40" />
                </div>
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-1">4. RESULTADO (SUGERIDO)</Label>
                <div className="h-16 rounded-3xl border-2 border-[#22C55E]/40 bg-white px-6 flex items-center justify-between group shadow-xl shadow-[#22C55E]/5">
                  <div className="flex flex-col justify-center">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-[#22C55E] leading-none">{suggestedSpend}</span>
                    </div>
                  </div>
                  <Button
                    onClick={applySimulator}
                    className="bg-[#22C55E] hover:bg-[#1da850] text-white font-black text-[10px] uppercase h-10 rounded-2xl px-5 transition-transform active:scale-95 shadow-lg shadow-[#22C55E]/20 flex items-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    USAR
                  </Button>
                </div>
              </div>
            </div>

            {/* SECTION: CONFIGURACIÓN TÉCNICA DEFINITIVA */}
            <div className="pt-12 border-t border-gray-100">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">CONFIGURACIÓN TÉCNICA DEFINITIVA</h3>
                  </div>
                  <p className="text-[10px] font-medium text-gray-400 ml-3.5">Usa el "Resultado Sugerido" de arriba como guía, pero escribe aquí el valor final.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-end gap-6">
                  <div className="space-y-3">
                    <Label className="text-[9px] font-black text-[#22C55E] uppercase tracking-widest px-1">5. COLOCA AQUÍ TU VALOR ($)</Label>
                    <div className="h-14 bg-gray-50 border-2 border-[#22C55E]/40 rounded-full flex items-center p-1.5 pr-6 group focus-within:border-[#22C55E] focus-within:bg-white transition-all">
                      <div className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-[#22C55E] text-lg">$</div>
                      <Input
                        type="number"
                        value={tempConfigValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTempConfigValue(val);
                          setConfig({ ...config, pesos_por_punto: parseInt(val) || 0 });
                        }}
                        className="border-none bg-transparent text-xl font-black text-gray-900 focus-visible:ring-0 w-32 px-4"
                        placeholder="..."
                        id="loyalty-config-input"
                        onWheel={(e) => e.target.blur()}
                      />
                      <span className="text-[10px] font-black text-[#22C55E] uppercase tracking-tighter">/ 1 PUNTO</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className={getButtonStyle(hasChanges())}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                    GUARDAR
                  </Button>
                </div>

              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION: BUSCADOR Y ACREDITACIÓN (REPLACING OLD RULE CARDS) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2">

          {/* Card Buscar Cliente */}
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden group">
            <CardHeader className="px-8 pt-8 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                    <Search className="w-6 h-6 text-[#22C55E]" />
                  </div>
                  <CardTitle className="text-sm font-black text-gray-900 uppercase tracking-widest">Buscar Cliente</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-10 space-y-6">
              <div className="space-y-4">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre, Email o WhatsApp</Label>
                <div className="flex gap-3">
                  <div className="h-16 flex-1 rounded-3xl border-2 border-gray-200 bg-white px-6 flex items-center group focus-within:border-[#22C55E] focus-within:shadow-[0_0_20px_rgba(34,197,94,0.1)] transition-all overflow-hidden shadow-inner">
                    <User className="w-5 h-5 text-[#22C55E]/40 group-focus-within:text-[#22C55E] mr-3 transition-colors" />
                    <Input
                      placeholder="Nombre, Email o WhatsApp"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="border-none bg-transparent p-0 text-sm font-black text-gray-900 placeholder:text-gray-300 focus-visible:ring-0 w-full h-full"
                    />
                  </div>

                </div>
                <Button
                  onClick={handleSearch}
                  disabled={searching}
                  className="w-full h-16 rounded-3xl bg-[#22C55E] hover:bg-[#1da850] text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-[#22C55E]/20 flex items-center justify-center gap-2"
                >
                  {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  BUSCAR CLIENTE
                </Button>
              </div>

              {/* Search Results */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 pt-4"
                  >
                    <p className="text-[10px] font-black text-[#22C55E] uppercase tracking-widest ml-1">Selecciona al cliente correcto ({searchResults.length})</p>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                      {searchResults.map((customer, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedCustomer(customer)}
                          className={`flex items-center justify-between p-4 rounded-3xl border-2 transition-all cursor-pointer shadow-sm ${selectedCustomer?.telefono === customer.telefono
                            ? 'border-[#22C55E] bg-green-50 shadow-[#22C55E]/10'
                            : 'border-transparent bg-gray-50/80 hover:border-green-200 hover:bg-white hover:shadow-md'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden">
                              <img src={`https://ui-avatars.com/api/?name=${customer.nombre || customer.telefono}&background=22C55E&color=fff`} className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900 leading-none mb-1">{customer.nombre || 'Comensal Anónimo'}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{customer.telefono}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <Badge className="bg-[#22C55E] text-white text-[10px] font-black rounded-lg px-2 py-0.5">
                              {customer.puntos_disponibles.toLocaleString()} PTS
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
                {/* Selected Customer Card (Inside Column) */}
                {selectedCustomer && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-5 rounded-[2rem] border-2 border-[#22C55E]/30 bg-green-50 flex items-center gap-4 relative"
                  >
                    <button
                      onClick={() => setSelectedCustomer(null)}
                      className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden shadow-sm">
                      <img src={`https://ui-avatars.com/api/?name=${selectedCustomer.nombre || selectedCustomer.telefono}&background=22C55E&color=fff`} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 uppercase leading-none mb-1">{selectedCustomer.nombre || 'Cliente'}</h4>
                      <p className="text-[10px] font-bold text-[#22C55E] animate-pulse">CLIENTE SELECCIONADO</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Card Acreditar Puntos */}
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden group">
            <CardHeader className="px-8 pt-8 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-[#22C55E]" />
                  </div>
                  <CardTitle className="text-sm font-black text-gray-900 uppercase tracking-widest">
                    {creditMode === 'compra' ? 'Calculadora' : 'Manual'}
                  </CardTitle>
                </div>
                <div className="flex p-1.5 bg-gray-100 rounded-[1.25rem] shadow-inner">
                  <button
                    onClick={() => setCreditMode('compra')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${creditMode === 'compra'
                      ? 'bg-white text-[#22C55E] shadow-sm ring-1 ring-black/5'
                      : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                    $ COMPRA
                  </button>
                  <button
                    onClick={() => setCreditMode('manual')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${creditMode === 'manual'
                      ? 'bg-white text-[#22C55E] shadow-sm ring-1 ring-black/5'
                      : 'text-gray-400 hover:text-gray-600'
                      }`}
                  >
                    PTS MANUAL
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-10 flex flex-col items-center justify-center min-h-[420px]">


              <div className="w-full space-y-12 animate-in fade-in zoom-in duration-500">
                {(!config.pesos_por_punto || config.pesos_por_punto <= 0) ? (
                  <div className="flex flex-col items-center justify-center space-y-6 text-center h-full min-h-[300px]">
                    <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-2 shadow-sm border border-green-100">
                      <Trophy className="w-8 h-8 text-[#22C55E]" />
                    </div>
                    <div className="space-y-2 max-w-xs">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Configuración Requerida</h3>
                      <p className="text-gray-400 text-[10px] font-medium leading-relaxed">
                        Aún no has definido cuánto dinero equivale a 1 punto. Configura esto para usar la calculadora.
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        const el = document.getElementById('loyalty-config-input');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setTimeout(() => el.focus(), 500);
                        }
                      }}
                      className="bg-[#22C55E] text-white font-black text-[10px] tracking-widest px-8 py-6 rounded-full hover:bg-[#1da850] shadow-xl shadow-green-200 transition-all hover:scale-105 active:scale-95"
                    >
                      IR A CONFIGURACIÓN
                    </Button>
                  </div>
                ) : (
                  <>
                    {creditMode === 'compra' ? (
                      <div className="flex flex-col items-center w-full max-w-sm space-y-10 mx-auto">
                        <div className="space-y-4 text-center w-full">
                          <label className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Monto de la Compra</label>
                          <div className="relative group flex justify-center">
                            <div className="absolute left-8 h-full flex items-center z-10">
                              <span className="text-3xl font-black text-[#22C55E] leading-none">$</span>
                            </div>
                            <Input
                              type="number"
                              value={purchaseAmount || ''}
                              onChange={(e) => setPurchaseAmount(parseInt(e.target.value) || 0)}
                              onWheel={(e) => e.target.blur()}
                              placeholder="0"
                              className="w-full h-24 bg-white border-2 border-gray-200 rounded-[2.5rem] py-6 pl-16 pr-16 text-5xl font-black text-gray-900 text-center focus-visible:ring-0 focus:border-[#22C55E] focus:shadow-[0_0_30px_rgba(34,197,94,0.1)] outline-none transition-all placeholder:text-gray-100 shadow-inner"
                            />
                            <div className="absolute right-8 h-full flex flex-col justify-center gap-1.5 z-10">
                              <button onClick={() => setPurchaseAmount(prev => prev + 1000)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-green-50 hover:text-[#22C55E] text-gray-300 transition-all border border-gray-300">
                                <Plus className="w-4 h-4" />
                              </button>
                              <button onClick={() => setPurchaseAmount(prev => Math.max(0, prev - 1000))} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-green-50 hover:text-[#22C55E] text-gray-300 transition-all border border-gray-300">
                                <Minus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center text-center">
                          <div className="text-7xl font-black text-[#22C55E] leading-none">
                            {Math.floor(purchaseAmount / (config.pesos_por_punto || 1))}
                          </div>
                          <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] mt-4 mb-2">Puntos Calculados</span>
                          <div className="bg-green-50 px-4 py-1.5 rounded-full text-[9px] font-bold text-[#22C55E] tracking-tight border border-green-100">
                            Rate: ${config.pesos_por_punto} = 1 Pt
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-12">
                        <div className="flex items-center gap-12">
                          <button
                            onClick={() => setManualPoints(Math.max(0, manualPoints - 1))}
                            className="w-20 h-20 rounded-full bg-white border-2 border-gray-200 shadow-sm flex items-center justify-center text-gray-300 hover:bg-green-50 hover:border-[#22C55E] hover:text-[#22C55E] transition-all active:scale-90 hover:shadow-md"
                          >
                            <Minus className="w-10 h-10" />
                          </button>

                          <div className="text-center group relative">
                            <div className="absolute inset-0 bg-[#22C55E]/5 blur-3xl rounded-full transition-all group-hover:bg-[#22C55E]/10" />
                            <span className="text-9xl font-black text-[#22C55E] leading-none relative z-10 drop-shadow-sm">
                              {manualPoints}
                            </span>
                            <p className="text-gray-400 font-black uppercase tracking-[0.4em] text-[10px] mt-6 relative z-10">Puntos a otorgar</p>
                          </div>

                          <button
                            onClick={() => setManualPoints(manualPoints + 1)}
                            className="w-20 h-20 rounded-full bg-white border-2 border-gray-200 shadow-sm flex items-center justify-center text-gray-300 hover:bg-green-50 hover:border-[#22C55E] hover:text-[#22C55E] transition-all active:scale-90 hover:shadow-md"
                          >
                            <Plus className="w-10 h-10" />
                          </button>
                        </div>

                        <div className="flex flex-wrap justify-center gap-4 pt-6">
                          {[5, 10, 20, 50, 100].map(val => (
                            <button
                              key={val}
                              onClick={() => setManualPoints(prev => prev + val)}
                              className="px-10 py-4 rounded-2xl border-2 border-gray-200 bg-white text-sm font-black text-gray-400 hover:bg-[#22C55E] hover:text-white hover:border-[#22C55E] transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow-lg hover:shadow-[#22C55E]/20"
                            >
                              +{val}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleAwardPoints}
                      disabled={awarding || !selectedCustomer || (creditMode === 'compra' ? purchaseAmount <= 0 : manualPoints <= 0)}
                      className={`w-full h-24 rounded-[3rem] font-black uppercase text-sm tracking-[0.4em] transition-all duration-500 flex items-center justify-center gap-6 group overflow-hidden ${selectedCustomer && (creditMode === 'compra' ? purchaseAmount > 0 : manualPoints > 0)
                        ? 'bg-[#13ec6d] text-[#111814] hover:bg-[#0fd660] shadow-[0_20px_50px_rgba(19,236,109,0.3)] hover:scale-[1.02] active:scale-95 border-none'
                        : 'bg-transparent text-[#13ec6d] border-4 border-[#13ec6d]/20 cursor-not-allowed opacity-40'
                        }`}
                    >
                      {awarding ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                      ) : (
                        <div className={`p-3 rounded-full transition-colors duration-500 ${selectedCustomer && (creditMode === 'compra' ? purchaseAmount > 0 : manualPoints > 0) ? 'bg-[#111814]/10' : 'bg-[#13ec6d]/10'}`}>
                          <Check className="w-8 h-8" />
                        </div>
                      )}
                      <span className="flex flex-col items-start leading-none text-left">
                        <span className="text-[10px] opacity-60 mb-1">Confirmar Operación</span>
                        <span className="tracking-tight">
                          ACREDITAR {creditMode === 'compra' ? Math.floor(purchaseAmount / (config.pesos_por_punto || 1)) : manualPoints} PUNTOS
                        </span>
                      </span>
                    </Button>
                  </>
                )}

                {!selectedCustomer && (
                  <p className="text-center text-[9px] font-black text-gray-600 uppercase tracking-widest animate-pulse">
                    ⚠️ Selecciona un cliente para habilitar la acreditación
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION: ACREDITACIONES RECIENTES */}
        <div className="space-y-6 px-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#22C55E]" />
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Acreditaciones recientes</h2>
            </div>
            <Link to={`/dashboard/${slug}/fidelidad/historial`}>
              <Button
                variant="outline"
                className="h-9 bg-white border-2 border-green-100 text-[#22C55E] hover:bg-green-50 hover:border-green-200 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all"
              >
                VER HISTORIAL COMPLETO <ArrowRight className="w-3 h-3 ml-2" />
              </Button>
            </Link>
          </div>

          <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/30">
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Puntos</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {currentItems.length > 0 ? (
                    currentItems.map((credit, idx) => (
                      <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-[#22C55E] font-black text-[10px] uppercase">
                              {(credit.nombre || 'C').split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-sm font-bold text-gray-900">{credit.nombre}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-gray-900 font-bold text-sm">
                            {credit.monto ? formatCurrency(credit.monto) : '-'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-[#22C55E] font-black text-sm">+{credit.puntos} pts</span>
                        </td>
                        <td className="px-8 py-5 text-gray-400 font-bold text-xs italic">
                          {credit.fecha}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-green-100 text-[#22C55E]">
                            {credit.estado}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <p className="text-gray-400 text-xs font-black uppercase tracking-[0.2em]">No hay acreditaciones recientes</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Footer */}
            {recentCredits.length > 0 && (
              <div className="px-8 py-6 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  MOSTRANDO {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, recentCredits.length)} DE {recentCredits.length} CLIENTES
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-gray-200 text-gray-400 hover:text-[#22C55E] hover:border-[#22C55E] hover:bg-white transition-all disabled:opacity-50"
                  >
                    ANTERIOR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-[#22C55E] text-[#22C55E] hover:bg-[#22C55E] hover:text-white transition-all shadow-sm shadow-green-100 disabled:opacity-50 disabled:border-gray-200 disabled:text-gray-400 disabled:shadow-none"
                  >
                    SIGUIENTE
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout >
  );
}