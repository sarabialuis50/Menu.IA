import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Image as ImageIcon,
  X,
  Loader2,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const defaultCategories = ['Platos fuertes', 'Entradas', 'Bebidas', 'Postres', 'Acompañamientos'];

const defaultImages = [
  'https://images.unsplash.com/photo-1654018334224-4887d9e85ffe?w=400&q=80',
  'https://images.unsplash.com/photo-1723693407562-bb4fcae76797?w=400&q=80',
  'https://images.unsplash.com/photo-1723693407703-f42009db4cd7?w=400&q=80',
];

export default function CatalogoPage() {
  const { slug } = useParams();
  const { api } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    categoria: '',
    imagen_url: '',
    disponible: true
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [slug]);

  const fetchProducts = async () => {
    try {
      const response = await api().get(`/products/${slug}`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api().get(`/categories/${slug}`);
      setCategories(response.data.length > 0 ? response.data : defaultCategories);
    } catch (error) {
      setCategories(defaultCategories);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      categoria: categories[0] || 'Platos fuertes',
      imagen_url: defaultImages[Math.floor(Math.random() * defaultImages.length)],
      disponible: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      precio: product.precio.toString(),
      categoria: product.categoria,
      imagen_url: product.imagen_url || '',
      disponible: product.disponible
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        precio: parseFloat(formData.precio)
      };

      if (editingProduct) {
        await api().put(`/products/${slug}/${editingProduct.id}`, payload);
        toast.success('Producto actualizado');
      } else {
        await api().post(`/products/${slug}`, payload);
        toast.success('Producto creado');
      }

      setIsModalOpen(false);
      fetchProducts();
      fetchCategories();
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al guardar producto';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      await api().delete(`/products/${slug}/${productId}`);
      toast.success('Producto eliminado');
      fetchProducts();
    } catch (error) {
      toast.error('Error al eliminar producto');
    }
  };

  const toggleAvailability = async (product) => {
    try {
      await api().put(`/products/${slug}/${product.id}`, {
        disponible: !product.disponible
      });
      fetchProducts();
      toast.success(product.disponible ? 'Producto marcado como agotado' : 'Producto disponible');
    } catch (error) {
      toast.error('Error al actualizar disponibilidad');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.categoria === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    if (!acc[product.categoria]) acc[product.categoria] = [];
    acc[product.categoria].push(product);
    return acc;
  }, {});

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#25D366]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="catalogo-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-gray-900">Catálogo</h1>
            <p className="text-gray-500">{products.length} productos</p>
          </div>
          <Button 
            onClick={openCreateModal}
            className="bg-[#25D366] hover:bg-[#128C7E] text-white"
            data-testid="add-product-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar producto
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-products-input"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-48" data-testid="filter-category-select">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {Object.keys(groupedProducts).length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="font-heading font-bold text-lg mb-2">No hay productos</h3>
            <p className="text-gray-500 mb-4">Comienza agregando productos a tu catálogo</p>
            <Button onClick={openCreateModal} className="bg-[#25D366] hover:bg-[#128C7E] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Agregar primer producto
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
              <div key={category}>
                <h2 className="font-heading font-bold text-lg mb-4 text-gray-800">{category}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {categoryProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={{ y: -4 }}
                        className={`bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all ${
                          !product.disponible ? 'opacity-60' : ''
                        }`}
                        data-testid={`product-card-${product.id}`}
                      >
                        <div className="relative aspect-video bg-gray-100">
                          {product.imagen_url ? (
                            <img
                              src={product.imagen_url}
                              alt={product.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                          {!product.disponible && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                Agotado
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-1 truncate">{product.nombre}</h3>
                          <p className="text-sm text-gray-500 mb-2 line-clamp-2">{product.descripcion}</p>
                          <p className="font-bold text-[#25D366] text-lg">{formatCurrency(product.precio)}</p>
                          
                          <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={product.disponible}
                                onCheckedChange={() => toggleAvailability(product)}
                                data-testid={`toggle-availability-${product.id}`}
                              />
                              <span className="text-xs text-gray-500">
                                {product.disponible ? 'Disponible' : 'Agotado'}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(product)}
                                className="h-8 w-8"
                                data-testid={`edit-product-${product.id}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(product.id)}
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                data-testid={`delete-product-${product.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Product Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar producto' : 'Nuevo producto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del producto</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Bandeja Paisa"
                  required
                  data-testid="product-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción del producto..."
                  rows={3}
                  data-testid="product-description-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precio">Precio (COP)</Label>
                  <Input
                    id="precio"
                    type="number"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    placeholder="25000"
                    required
                    data-testid="product-price-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                  >
                    <SelectTrigger data-testid="product-category-select">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imagen_url">URL de imagen</Label>
                <Input
                  id="imagen_url"
                  value={formData.imagen_url}
                  onChange={(e) => setFormData({ ...formData, imagen_url: e.target.value })}
                  placeholder="https://..."
                  data-testid="product-image-input"
                />
                {formData.imagen_url && (
                  <div className="mt-2 rounded-lg overflow-hidden border h-32">
                    <img
                      src={formData.imagen_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="disponible"
                  checked={formData.disponible}
                  onCheckedChange={(checked) => setFormData({ ...formData, disponible: checked })}
                />
                <Label htmlFor="disponible">Producto disponible</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white"
                  data-testid="save-product-btn"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {editingProduct ? 'Guardar cambios' : 'Crear producto'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
