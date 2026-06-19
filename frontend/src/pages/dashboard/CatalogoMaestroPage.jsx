import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search, Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Package, Tag, DollarSign,
  Eye, EyeOff, Store, BookOpen, AlertCircle, X, Check,
  ImageIcon, Layers, RefreshCw, ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Sede Context Banner ─────────────────────────────────────────────────────
const SEDES_CONFIG = {
  'sede-norte':  { label: 'Sede Norte',  color: '#3B82F6', emoji: '🔵' },
  'sede-centro': { label: 'Sede Centro', color: '#DAA520', emoji: '🟡' },
  'sede-sur':    { label: 'Sede Sur',    color: '#22C55E', emoji: '🟢' },
};

function SedeContextBanner({ slug }) {
  const navigate = useNavigate();
  const sedeInfo = SEDES_CONFIG[slug];
  if (!sedeInfo) return null;

  return (
    <div className="flex items-center gap-3 mb-6 p-3 rounded-xl border"
      style={{ borderColor: sedeInfo.color + '40', backgroundColor: sedeInfo.color + '10' }}>
      <span className="text-xl">{sedeInfo.emoji}</span>
      <div className="flex-1">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: sedeInfo.color }}>
          Contexto activo
        </p>
        <p className="text-sm font-bold text-slate-800">{sedeInfo.label}</p>
      </div>
      <div className="flex gap-2">
        {Object.entries(SEDES_CONFIG)
          .filter(([k]) => k !== slug)
          .map(([k, v]) => (
            <button
              key={k}
              onClick={() => navigate(`/dashboard/${k}/catalogo-maestro`)}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border transition-all hover:scale-105"
              style={{ borderColor: v.color + '50', color: v.color, backgroundColor: v.color + '15' }}
            >
              {v.label.split(' ')[1]}
            </button>
          ))
        }
      </div>
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function ProductModal({ open, onClose, product, categories, brandId, onSave, mode = 'create' }) {
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio_base: '',
    imagen: '',
    category_id: '',
    brand_id: brandId || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product && mode === 'edit') {
      setForm({
        nombre: product.nombre || '',
        descripcion: product.descripcion || '',
        precio_base: product.precio_base || '',
        imagen: product.imagen || '',
        category_id: product.category_id || '',
        brand_id: product.brand_id || brandId || '',
      });
    } else {
      setForm({ nombre: '', descripcion: '', precio_base: '', imagen: '', category_id: '', brand_id: brandId || '' });
    }
  }, [product, mode, open, brandId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, precio_base: parseFloat(form.precio_base) || 0 });
      onClose();
    } catch (err) {
      toast.error('Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-bold text-slate-800">
              {mode === 'edit' ? '✏️ Editar Producto' : '➕ Nuevo Producto Global'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nombre *</label>
              <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#DAA520]/40 focus:border-[#DAA520]"
                placeholder="Ej: Hamburguesa Golden Doble" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Descripción</label>
              <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#DAA520]/40 focus:border-[#DAA520] resize-none"
                placeholder="Descripción del producto..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Precio Base (COP) *</label>
                <input required type="number" min="0" step="100" value={form.precio_base}
                  onChange={e => setForm({ ...form, precio_base: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#DAA520]/40 focus:border-[#DAA520]"
                  placeholder="18000" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Categoría</label>
                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#DAA520]/40 focus:border-[#DAA520] bg-white">
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">URL de Imagen</label>
              <input value={form.imagen} onChange={e => setForm({ ...form, imagen: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#DAA520]/40 focus:border-[#DAA520]"
                placeholder="https://..." />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}
                className="flex-1 bg-[#DAA520] hover:bg-[#C4941A] text-white">
                {saving ? '...' : mode === 'edit' ? 'Guardar Cambios' : 'Crear Producto'}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SedeOverrideModal({ open, onClose, product, sede, onSave }) {
  const sedeInfo = SEDES_CONFIG[sede] || {};
  const [form, setForm] = useState({ precio_local: '', activo: true, disponible: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      precio_local: product?.precio_local ?? '',
      activo: product?.activo ?? true,
      disponible: product?.disponible ?? true,
    });
  }, [product, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        precio_local: form.precio_local !== '' ? parseFloat(form.precio_local) : null,
        activo: form.activo,
        disponible: form.disponible,
      });
      onClose();
    } catch {
      toast.error('Error al guardar override');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !product) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Configurar en {sedeInfo.label}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{product.nombre}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Precio Local (COP)
                <span className="ml-2 font-normal text-slate-400 normal-case">Deja en blanco para usar precio base (${Number(product.precio_base).toLocaleString()})</span>
              </label>
              <input type="number" min="0" step="100" value={form.precio_local}
                onChange={e => setForm({ ...form, precio_local: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#DAA520]/40 focus:border-[#DAA520]"
                placeholder={`Precio base: ${Number(product.precio_base).toLocaleString()}`} />
            </div>
            <div className="space-y-3">
              <button type="button" onClick={() => setForm({ ...form, activo: !form.activo })}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${form.activo ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                <span className="text-sm font-bold text-slate-700">Activo en esta sede</span>
                {form.activo
                  ? <ToggleRight className="w-6 h-6 text-green-500" />
                  : <ToggleLeft className="w-6 h-6 text-slate-400" />
                }
              </button>
              <button type="button" onClick={() => setForm({ ...form, disponible: !form.disponible })}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${form.disponible ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
                <span className="text-sm font-bold text-slate-700">Disponible ahora</span>
                {form.disponible
                  ? <ToggleRight className="w-6 h-6 text-blue-500" />
                  : <ToggleLeft className="w-6 h-6 text-slate-400" />
                }
              </button>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 bg-[#DAA520] hover:bg-[#C4941A] text-white">
                {saving ? '...' : 'Guardar Override'}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CatalogoMaestroPage() {
  const { slug } = useParams();
  const { api } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sedeProducts, setSedeProducts] = useState({});  // { globalProductId: sedeProductData }
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [tab, setTab] = useState('catalogo'); // 'catalogo' | 'sede'

  // Modals
  const [productModal, setProductModal] = useState({ open: false, mode: 'create', product: null });
  const [overrideModal, setOverrideModal] = useState({ open: false, product: null });

  const BRAND_SLUG = 'golden-burger'; // Fixed brand slug

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, sedeRes] = await Promise.all([
        api().get(`/catalog/products/${BRAND_SLUG}`),
        api().get(`/catalog/categories/${BRAND_SLUG}`),
        api().get(`/catalog/sedes/${slug}/products`),
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);

      // Index sede products by global_product_id for quick lookup
      const indexed = {};
      (sedeRes.data || []).forEach(sp => { indexed[sp.id] = sp; });
      setSedeProducts(indexed);
    } catch (err) {
      console.error('Error loading catalog:', err);
      toast.error('Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  }, [slug, api]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateProduct = async (data) => {
    await api().post('/catalog/products', { ...data, brand_id: data.brand_id || BRAND_SLUG });
    toast.success('Producto creado en catálogo maestro');
    loadData();
  };

  const handleUpdateProduct = async (data) => {
    await api().patch(`/catalog/products/${productModal.product.id}`, data);
    toast.success('Producto actualizado');
    loadData();
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('¿Eliminar este producto del catálogo maestro? Se eliminará de todas las sedes.')) return;
    try {
      await api().delete(`/catalog/products/${productId}`);
      toast.success('Producto eliminado del catálogo');
      loadData();
    } catch {
      toast.error('Error al eliminar producto');
    }
  };

  const handleSaveOverride = async (data) => {
    if (!overrideModal.product) return;
    await api().put(`/catalog/sedes/${slug}/products/${overrideModal.product.id}`, {
      global_product_id: overrideModal.product.id,
      ...data,
    });
    toast.success('Configuración de sede guardada');
    loadData();
  };

  const handleToggleSedeProduct = async (product) => {
    const current = sedeProducts[product.id];
    const newActivo = !current?.activo ?? true;
    try {
      await api().put(`/catalog/sedes/${slug}/products/${product.id}`, {
        global_product_id: product.id,
        activo: newActivo,
        disponible: current?.disponible ?? true,
        precio_local: current?.precio_local ?? null,
      });
      toast.success(newActivo ? 'Producto activado en sede' : 'Producto desactivado en sede');
      loadData();
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat ? p.category_id === filterCat : true;
    return matchSearch && matchCat;
  });

  const sedeInfo = SEDES_CONFIG[slug] || {};
  const sedeProductsList = products.filter(p => sedeProducts[p.id]?.activo);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Catálogo Maestro</h1>
            <p className="text-sm text-slate-500 mt-1">
              Gestiona el catálogo global y los overrides de precio y disponibilidad por sede.
            </p>
          </div>
          <Button onClick={() => setProductModal({ open: true, mode: 'create', product: null })}
            className="bg-[#DAA520] hover:bg-[#C4941A] text-white font-bold gap-2">
            <Plus className="w-4 h-4" /> Nuevo Producto Global
          </Button>
        </div>

        {/* Sede Context Banner */}
        <SedeContextBanner slug={slug} />

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Productos Globales', value: products.length, icon: BookOpen, color: '#6366F1' },
            { label: 'Activos en Sede', value: sedeProductsList.length, icon: Store, color: sedeInfo.color || '#DAA520' },
            { label: 'Categorías', value: categories.length, icon: Tag, color: '#F59E0B' },
            { label: 'Sin configurar', value: products.length - sedeProductsList.length, icon: AlertCircle, color: '#EF4444' },
          ].map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm bg-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl" style={{ backgroundColor: stat.color + '20' }}>
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-800">{stat.value}</p>
                    <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-0">
          {[
            { id: 'catalogo', label: '📖 Catálogo Global', count: products.length },
            { id: 'sede', label: `${sedeInfo.emoji || '🏪'} Configuración ${sedeInfo.label || 'Sede'}`, count: sedeProductsList.length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-all ${
                tab === t.id
                  ? 'border-[#DAA520] text-[#DAA520]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DAA520]/40 focus:border-[#DAA520]" />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#DAA520]/40 focus:border-[#DAA520] bg-white">
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <button onClick={loadData} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DAA520]" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No hay productos</p>
                <p className="text-slate-400 text-sm mt-1">Crea el primer producto del catálogo maestro</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Producto</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Categoría</th>
                    <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Precio Base</th>
                    {tab === 'sede' && (
                      <>
                        <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest hidden lg:table-cell">Precio Sede</th>
                        <th className="text-center px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Estado</th>
                      </>
                    )}
                    <th className="text-center px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, idx) => {
                    const sp = sedeProducts[product.id];
                    const isActive = sp?.activo;
                    const cat = categories.find(c => c.id === product.category_id);

                    return (
                      <motion.tr key={product.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`border-b border-slate-50 hover:bg-amber-50/30 transition-colors ${
                          tab === 'sede' && !isActive ? 'opacity-50' : ''
                        }`}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {product.imagen ? (
                              <img src={product.imagen} alt={product.nombre}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-sm flex-shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-[#DAA520]/10 flex items-center justify-center flex-shrink-0">
                                <Package className="w-5 h-5 text-[#DAA520]" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-slate-800">{product.nombre}</p>
                              {product.descripcion && (
                                <p className="text-xs text-slate-400 truncate max-w-[200px]">{product.descripcion}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          {cat ? (
                            <Badge variant="outline" className="text-xs">{cat.nombre}</Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-bold text-slate-700">
                            ${Number(product.precio_base).toLocaleString('es-CO')}
                          </span>
                        </td>
                        {tab === 'sede' && (
                          <>
                            <td className="px-5 py-4 text-right hidden lg:table-cell">
                              {sp?.precio_local ? (
                                <span className="text-sm font-bold" style={{ color: sedeInfo.color }}>
                                  ${Number(sp.precio_local).toLocaleString('es-CO')}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">Base</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <button onClick={() => handleToggleSedeProduct(product)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                                  isActive
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}>
                                {isActive
                                  ? <><Check className="w-3 h-3" /> Activo</>
                                  : <><X className="w-3 h-3" /> Inactivo</>
                                }
                              </button>
                            </td>
                          </>
                        )}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {tab === 'sede' && (
                              <button onClick={() => setOverrideModal({ open: true, product: { ...product, ...sp } })}
                                title="Configurar en sede"
                                className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors">
                                <Store className="w-4 h-4" />
                              </button>
                            )}
                            {tab === 'catalogo' && (
                              <>
                                <button onClick={() => setProductModal({ open: true, mode: 'edit', product })}
                                  title="Editar"
                                  className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteProduct(product.id)}
                                  title="Eliminar"
                                  className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <ProductModal
        open={productModal.open}
        onClose={() => setProductModal({ open: false, mode: 'create', product: null })}
        product={productModal.product}
        categories={categories}
        brandId={BRAND_SLUG}
        onSave={productModal.mode === 'edit' ? handleUpdateProduct : handleCreateProduct}
        mode={productModal.mode}
      />
      <SedeOverrideModal
        open={overrideModal.open}
        onClose={() => setOverrideModal({ open: false, product: null })}
        product={overrideModal.product}
        sede={slug}
        onSave={handleSaveOverride}
      />
    </DashboardLayout>
  );
}
