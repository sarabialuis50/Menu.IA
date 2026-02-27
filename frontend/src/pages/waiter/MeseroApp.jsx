import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart, CartProvider } from '@/context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  QrCode,
  LogOut,
  ShoppingCart,
  Plus,
  Minus,
  Send,
  X,
  Check,
  Loader2,
  ChevronRight,
  User,
  ScanLine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from 'sonner';

// Proxy /api


// PIN Login Component
const PinLogin = ({ slug, onLogin }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      toast.error('El PIN debe tener 4 dígitos');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`/api/employee/login/${slug}`, { pin });
      localStorage.setItem('menu.ia_employee_token', response.data.access_token);
      localStorage.setItem('menu.ia_employee', JSON.stringify(response.data.employee));
      onLogin(response.data.employee);
      toast.success(`¡Hola, ${response.data.employee.nombre}!`);
    } catch (error) {
      toast.error('PIN incorrecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#4ADE80] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-white">Acceso Mesero</h1>
          <p className="text-gray-400 mt-2">Ingresa tu PIN de 4 dígitos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold ${pin.length > index
                  ? 'bg-[#4ADE80] border-[#4ADE80] text-[#111814]'
                  : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
              >
                {pin[index] || '•'}
              </div>
            ))}
          </div>

          <Input
            type="tel"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="sr-only"
            autoFocus
            data-testid="pin-input"
          />

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((num, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (num === 'del') {
                    setPin(pin.slice(0, -1));
                  } else if (num !== null && pin.length < 4) {
                    setPin(pin + num);
                  }
                }}
                className={`
                  h-14 rounded-xl font-semibold text-xl transition-colors
                  ${num === null ? 'invisible' : ''}
                  ${num === 'del'
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                  }
                `}
                data-testid={`numpad-${num}`}
              >
                {num === 'del' ? <X className="w-5 h-5 mx-auto" /> : num}
              </button>
            ))}
          </div>

          <Button
            type="submit"
            disabled={pin.length !== 4 || loading}
            className="w-full h-14 bg-[#4ADE80] hover:bg-[#22C55E] text-[#111814] text-lg"
            data-testid="pin-submit-btn"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Ingresar'
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

// Main Waiter App Component
const WaiterAppContent = ({ employee, slug, onLogout }) => {
  const { items, addItem, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tables, setTables] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [tableSelectOpen, setTableSelectOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = async () => {
    try {
      const [businessRes, productsRes, tablesRes] = await Promise.all([
        axios.get(`/api/business/${slug}`),
        axios.get(`/api/menu-items/${slug}`),
        axios.get(`/api/tables/${slug}`)
      ]);

      setBusiness(businessRes.data);
      setProducts(productsRes.data.filter(p => p.disponible));
      setTables(tablesRes.data);

      const cats = [...new Set(productsRes.data.map(p => p.categoria))];
      setCategories(cats);
      if (cats.length > 0) setActiveCategory(cats[0]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const handleAddToCart = (product) => {
    addItem(product, 1);
    toast.success(`${product.nombre} agregado`, { duration: 1000 });
  };

  const handleSubmitOrder = async () => {
    if (!selectedTable) {
      toast.error('Selecciona una mesa');
      return;
    }
    if (items.length === 0) {
      toast.error('Agrega productos al pedido');
      return;
    }

    setSubmitting(true);

    try {
      const orderData = {
        mesa_id: selectedTable.id,
        mesa_numero: selectedTable.numero,
        items: items.map(item => ({
          producto_id: item.producto_id,
          nombre: item.nombre,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          notas: item.notas
        })),
        mesero_id: employee.id,
        tipo: 'mesa'
      };

      await axios.post(`/api/orders/${slug}`, orderData);
      clearCart();
      setCartOpen(false);
      setSelectedTable(null);
      setTableSelectOpen(true);
      toast.success('¡Pedido enviado a cocina!');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Error al enviar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = activeCategory
    ? products.filter(p => p.categoria === activeCategory)
    : products;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22C55E]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] pb-24" data-testid="waiter-app-container">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Hola, {employee.nombre}</p>
            <h1 className="font-heading font-bold text-lg">
              {selectedTable ? `Mesa ${selectedTable.numero}` : 'Selecciona mesa'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {selectedTable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTable(null);
                  setTableSelectOpen(true);
                  clearCart();
                }}
              >
                Cambiar mesa
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="text-gray-500"
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Table Selection */}
      <AnimatePresence>
        {tableSelectOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full rounded-t-3xl max-h-[80vh] overflow-auto"
            >
              <div className="sticky top-0 bg-white p-4 border-b">
                <h2 className="font-heading font-bold text-xl text-center">Selecciona una mesa</h2>
              </div>
              <div className="grid grid-cols-3 gap-3 p-4">
                {tables.map(table => (
                  <button
                    key={table.id}
                    onClick={() => {
                      setSelectedTable(table);
                      setTableSelectOpen(false);
                    }}
                    className={`
                      aspect-square rounded-xl border-2 flex flex-col items-center justify-center
                      font-bold text-2xl transition-all active:scale-95
                      ${table.estado === 'libre'
                        ? 'border-green-300 bg-green-50 text-green-700 hover:border-green-500'
                        : 'border-amber-300 bg-amber-50 text-amber-700'
                      }
                    `}
                    data-testid={`select-table-${table.numero}`}
                  >
                    {table.numero}
                    <span className="text-xs font-normal mt-1">
                      {table.estado === 'libre' ? 'Libre' : 'Ocupada'}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Navigation */}
      {selectedTable && (
        <>
          <nav className="sticky top-[65px] z-30 bg-white/80 backdrop-blur-md border-b">
            <div className="px-4">
              <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === cat
                      ? 'bg-[#4ADE80] text-[#111814]'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    data-testid={`waiter-category-${cat}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {/* Products Grid */}
          <div className="px-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <motion.button
                  key={product.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleAddToCart(product)}
                  className="bg-white rounded-xl border p-3 text-left active:bg-gray-50"
                  data-testid={`waiter-product-${product.id}`}
                >
                  {product.imagen_url && (
                    <img
                      src={product.imagen_url}
                      alt={product.nombre}
                      className="w-full aspect-video rounded-lg object-cover mb-2"
                    />
                  )}
                  <h3 className="font-medium text-sm text-gray-900 line-clamp-1">{product.nombre}</h3>
                  <p className="font-bold text-[#22C55E] mt-1">{formatCurrency(product.precio)}</p>
                </motion.button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bottom Cart Bar */}
      {selectedTable && itemCount > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40"
        >
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <button
                className="w-full bg-[#4ADE80] text-[#111814] rounded-xl px-4 py-4 flex items-center justify-between hover:bg-[#22C55E] transition-colors"
                data-testid="waiter-cart-btn"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="font-semibold">{itemCount} items</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatCurrency(total)}</span>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>Pedido Mesa {selectedTable?.numero}</SheetTitle>
              </SheetHeader>

              <div className="mt-4 flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.nombre}</h4>
                        <p className="text-sm text-gray-500">{formatCurrency(item.precio_unitario)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => updateQuantity(index, item.cantidad - 1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-bold text-lg">{item.cantidad}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => updateQuantity(index, item.cantidad + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 mt-4 border-t space-y-4">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-[#22C55E]">{formatCurrency(total)}</span>
                  </div>
                  <Button
                    onClick={handleSubmitOrder}
                    disabled={submitting}
                    className="w-full h-14 bg-[#4ADE80] hover:bg-[#22C55E] text-[#111814] text-lg"
                    data-testid="send-order-btn"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Enviar a cocina
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </motion.div>
      )}
    </div>
  );
};

// Main Export
export default function MeseroApp() {
  const { slug } = useParams();
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    // Check for existing session
    const savedEmployee = localStorage.getItem('menu.ia_employee');
    if (savedEmployee) {
      setEmployee(JSON.parse(savedEmployee));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('menu.ia_employee_token');
    localStorage.removeItem('menu.ia_employee');
    setEmployee(null);
  };

  if (!employee) {
    return <PinLogin slug={slug} onLogin={setEmployee} />;
  }

  return (
    <CartProvider>
      <WaiterAppContent employee={employee} slug={slug} onLogout={handleLogout} />
    </CartProvider>
  );
}
