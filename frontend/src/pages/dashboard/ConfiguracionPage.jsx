import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import {
    Building2,
    MapPin,
    Phone,
    Clock,
    Camera,
    Utensils,
    Image as ImageIcon,
    Save,
    Plus,
    Search,
    Edit2,
    Trash2,
    Check,
    Loader2,
    LayoutGrid,
    Settings2,
    Languages,
    Smartphone,
    X,
    FolderPlus,
    Palette,
    Upload,
    MoreVertical,
    Tag as TagIcon,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Package,
    Truck,
    ShoppingBag,
    Navigation as NavigationIcon,
    CreditCard as CreditCardIcon,
    Globe,
    QrCode,
    Copy,
    Download,
    Sparkles,
    Coins,
    Wallet,
    Banknote,
    Link as LinkIcon,
    Pizza,
    Coffee,
    Beer,
    Wine,
    Cake,
    IceCream,
    Sandwich,
    Salad,
    Soup,
    Fish,
    Drumstick,
    Beef,
    Wheat,
    Apple,
    Carrot,
    Egg,
    Milk,
    Vegan,
    GlassWater,
    Star,
    Tag,
    Cookie,
    Croissant,
    Grape,
    Banana,
    Cherry,
    Citrus,
    Martini,
    CupSoda,
    Popcorn
} from 'lucide-react';

// Icon mapping for categories
const AvailableIcons = {
    Utensils,
    Pizza,
    Coffee,
    Beer,
    Wine,
    Cake,
    IceCream,
    Sandwich,
    Salad,
    Soup,
    Fish,
    Drumstick,
    Beef,
    Wheat,
    Apple,
    Carrot,
    Egg,
    Milk,
    Vegan,
    GlassWater,
    Star,
    Tag,
    Cookie,
    Croissant,
    Grape,
    Banana,
    Cherry,
    Citrus,
    Martini,
    CupSoda,
    Popcorn
};
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const defaultCategories = ['Platos fuertes', 'Entradas', 'Bebidas', 'Postres', 'Acompañamientos'];
const defaultImages = [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
];

const getButtonStyle = (hasPendingChanges, size = "large") => {
    const heightClass = size === "small" ? "h-11 px-6" : "h-14 px-10";
    if (hasPendingChanges) {
        return `${heightClass} rounded-full bg-[#13ec6d] text-[#111814] font-black uppercase text-[10px] tracking-widest hover:bg-[#0fd660] shadow-xl shadow-[#13ec6d]/20 transition-all active:scale-95 flex items-center gap-3 border-2 border-transparent`;
    }
    return `${heightClass} rounded-full bg-white text-[#13ec6d] border-2 border-[#13ec6d] font-black uppercase text-[10px] tracking-widest hover:bg-[#13ec6d]/5 transition-all active:scale-95 flex items-center gap-3 shadow-sm`;
};

const getModalButtonStyle = (hasPendingChanges) => {
    if (hasPendingChanges) {
        return "flex-1 h-12 rounded-2xl bg-[#13ec6d] text-[#111814] font-black uppercase text-[10px] tracking-widest hover:bg-[#0fd660] shadow-lg shadow-[#13ec6d]/10 transition-all active:scale-95";
    }
    return "flex-1 h-12 rounded-2xl bg-gray-100 text-gray-400 font-black uppercase text-[10px] tracking-widest cursor-not-allowed transition-all";
};

const formatPrice = (val) => {
    if (!val && val !== 0) return '';
    const numeric = val.toString().replace(/\D/g, '');
    return numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export default function ConfiguracionPage() {
    const { slug } = useParams();
    const { user, api } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    // Auto-detect tab from path if not explicitly set in query
    const activeByPath = pathname.endsWith('/catalogo') ? 'menu' : 'diseno';
    const activeTab = searchParams.get('tab') || activeByPath;

    // Status states
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Business Data
    const [businessData, setBusinessData] = useState({
        nombre: '',
        descripcion: '',
        direccion: '',
        telefono: '',
        horarios: '',
        banner_url: '',
        logo_url: '',
        slogan: '',
        banner_tag: '',
        banner_title: '',
        banner_description: '',
        ai_habilitado: true,
        ai_personalidad: 'Amigable y cercano (Recomendado)',
        ai_saludo: '',
        ai_conocimiento: ''
    });
    const [originalData, setOriginalData] = useState(null);

    // Catalog Data
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Category State
    const [categories, setCategories] = useState([]);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null); // The object being edited
    const [categoryName, setCategoryName] = useState('');
    const [originalCategoryName, setOriginalCategoryName] = useState('');
    const [categoryIcon, setCategoryIcon] = useState('Utensils'); // Default icon

    // Tag State
    const [tags, setTags] = useState([]);
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [editingTag, setEditingTag] = useState(null);
    const [tagName, setTagName] = useState('');
    const [originalTagName, setOriginalTagName] = useState('');

    // Modal states
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const [productForm, setProductForm] = useState({
        nombre: '',
        descripcion: '',
        precio: '',
        categoria: '',
        etiqueta: '',
        imagen: '',
        disponible: true,
        destacado: false,
        oferta_porcentaje: ''
    });
    const [originalProductForm, setOriginalProductForm] = useState(null);

    const [uploadingProductImage, setUploadingProductImage] = useState(false);
    const [newPaymentMethod, setNewPaymentMethod] = useState('');
    const [newDeliveryMethod, setNewDeliveryMethod] = useState('');

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecciona una imagen válida');
            return;
        }

        setUploadingProductImage(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api().post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setProductForm(prev => ({ ...prev, imagen: response.data.url }));
            toast.success('Imagen subida correctamente');
        } catch (error) {
            console.error('Upload error:', error);
            const errorMsg = error.response?.data?.detail || 'Error al subir la imagen';
            toast.error(errorMsg);
        } finally {
            setUploadingProductImage(false);
        }
    };

    const handleCategoryIconUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecciona una imagen válida');
            return;
        }

        setSaving(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api().post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setCategoryIcon(response.data.url);
            toast.success('Icono subido correctamente');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Error al subir icono');
        } finally {
            setSaving(false);
        }
    };

    const handleBusinessMediaUpload = async (e, field) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecciona una imagen válida');
            return;
        }

        setSaving(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api().post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setBusinessData(prev => ({ ...prev, [field]: response.data.url }));
            toast.success('Imagen de identidad actualizada');
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Error al subir la imagen');
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [slug]);

    useEffect(() => {
        const editId = searchParams.get('edit');
        if (editId && products.length > 0) {
            const productToEdit = products.find(p => p.id === editId || p.id.toString() === editId);
            if (productToEdit) {
                openEditProduct(productToEdit);
                // Clear the param so it doesn't re-open on every render
                setSearchParams({ tab: activeTab });
            }
        }
    }, [searchParams, products]);

    const fetchCatalog = async () => {
        try {
            const [productsRes, categoriesRes, tagsRes] = await Promise.all([
                api().get(`/products/${slug}`),
                api().get(`/categories/${slug}`).catch(() => ({ data: defaultCategories })),
                api().get(`/tags/${slug}`).catch(() => ({ data: [] }))
            ]);
            setProducts(productsRes.data);
            setCategories(categoriesRes.data.length > 0 ? categoriesRes.data : defaultCategories);
            setTags(tagsRes.data);
            return { products: productsRes.data, categories: categoriesRes.data, tags: tagsRes.data };
        } catch (error) {
            console.error('Error loading catalog:', error);
            toast.error('Error al actualizar catálogo');
        }
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [businessRes, catalogData] = await Promise.all([
                api().get(`/business/${slug}`),
                fetchCatalog()
            ]);

            // Normalize delivery methods if they are in old array format
            const normalizedEntrega = (methods) => {
                if (!methods) return { domicilio: true, recoger: true, mesa: true };
                if (Array.isArray(methods)) {
                    const lower = methods.map(m => m.toLowerCase());
                    return {
                        domicilio: lower.some(m => m.includes('domicilio')),
                        recoger: lower.some(m => m.includes('recoger') || m.includes('llevar')),
                        mesa: lower.some(m => m.includes('mesa'))
                    };
                }
                return {
                    domicilio: !!methods.domicilio,
                    recoger: !!methods.recoger,
                    mesa: !!methods.mesa
                };
            };

            // Normalize payment methods if they are in old array format
            const normalizedPago = (methods) => {
                if (!methods) return { efectivo: true, nequi: true, transferencia: true, daviplata: false, tarjeta: false, link: false };
                if (Array.isArray(methods)) {
                    const lower = methods.map(m => m.toLowerCase());
                    return {
                        efectivo: lower.some(m => m.includes('efectivo')),
                        nequi: lower.some(m => m.includes('nequi')),
                        daviplata: lower.some(m => m.includes('daviplata')),
                        transferencia: lower.some(m => m.includes('transferencia')),
                        tarjeta: lower.some(m => m.includes('tarjeta') || m.includes('datáfono') || m.includes('datafono')),
                        link: lower.some(m => m.includes('link') || m.includes('epayco') || m.includes('wompi'))
                    };
                }
                return {
                    efectivo: !!methods.efectivo,
                    nequi: !!methods.nequi,
                    daviplata: !!methods.daviplata,
                    transferencia: !!methods.transferencia,
                    tarjeta: !!methods.tarjeta,
                    link: !!methods.link
                };
            };

            const dataWithNormalizedMethods = {
                ...businessRes.data,
                metodos_entrega: normalizedEntrega(businessRes.data.metodos_entrega),
                metodos_pago: normalizedPago(businessRes.data.metodos_pago)
            };

            setBusinessData(dataWithNormalizedMethods);
            setOriginalData(dataWithNormalizedMethods);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error loading config:', error);
            toast.error('Error al cargar la configuración');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBusiness = async () => {
        setSaving(true);
        try {
            // Normalize delivery methods
            const normalizedEntrega = (methods) => {
                if (!methods) return { domicilio: true, recoger: true, mesa: true };
                if (Array.isArray(methods)) {
                    const lower = methods.map(m => m.toLowerCase());
                    return {
                        domicilio: lower.some(m => m.includes('domicilio')),
                        recoger: lower.some(m => m.includes('recoger') || m.includes('llevar')),
                        mesa: lower.some(m => m.includes('mesa'))
                    };
                }
                return {
                    domicilio: !!methods.domicilio,
                    recoger: !!methods.recoger,
                    mesa: !!methods.mesa
                };
            };

            // Normalize payment methods
            const normalizedPago = (methods) => {
                if (!methods) return { efectivo: true, nequi: true, transferencia: true, daviplata: false, tarjeta: false, link: false };
                if (Array.isArray(methods)) {
                    const lower = methods.map(m => m.toLowerCase());
                    return {
                        efectivo: lower.some(m => m.includes('efectivo')),
                        nequi: lower.some(m => m.includes('nequi')),
                        daviplata: lower.some(m => m.includes('daviplata')),
                        transferencia: lower.some(m => m.includes('transferencia')),
                        tarjeta: lower.some(m => m.includes('tarjeta') || m.includes('datáfono') || m.includes('datafono')),
                        link: lower.some(m => m.includes('link') || m.includes('epayco') || m.includes('wompi'))
                    };
                }
                return {
                    efectivo: !!methods.efectivo,
                    nequi: !!methods.nequi,
                    daviplata: !!methods.daviplata,
                    transferencia: !!methods.transferencia,
                    tarjeta: !!methods.tarjeta,
                    link: !!methods.link
                };
            };

            const response = await api().put(`/business/${slug}`, businessData);

            const dataWithNormalizedMethods = {
                ...response.data,
                metodos_entrega: normalizedEntrega(response.data.metodos_entrega),
                metodos_pago: normalizedPago(response.data.metodos_pago)
            };

            setBusinessData(dataWithNormalizedMethods);
            setOriginalData(dataWithNormalizedMethods);
            toast.success('Configuración general guardada');
        } catch (error) {
            toast.error('Error al guardar cambios');
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = () => {
        if (!originalData) return false;

        const isEquivalent = (val1, val2) => {
            // Handle null/undefined as equal to empty string for simple fields
            if ((val1 === null || val1 === undefined || val1 === '') &&
                (val2 === null || val2 === undefined || val2 === '')) return true;

            // Handle numbers as strings (e.g. price inputs)
            if (typeof val1 === 'number' || typeof val2 === 'number') {
                return val1?.toString() === val2?.toString();
            }

            // Handle objects (like metodos)
            if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
                return JSON.stringify(val1) === JSON.stringify(val2);
            }

            return val1 === val2;
        };

        const fields = [
            'precio_km', 'costo_minimo_domicilio', 'lat', 'lng',
            'nombre', 'descripcion', 'direccion', 'telefono', 'horarios', 'slogan',
            'banner_url', 'logo_url',
            'ai_habilitado', 'ai_personalidad', 'ai_saludo', 'ai_conocimiento',
            'banner_tag', 'banner_title', 'banner_description'
        ];

        const simpleChanges = fields.some(f => !isEquivalent(businessData[f], originalData[f]));
        const entregaChanges = !isEquivalent(businessData.metodos_entrega, originalData.metodos_entrega);
        const pagoChanges = !isEquivalent(businessData.metodos_pago, originalData.metodos_pago);

        return simpleChanges || entregaChanges || pagoChanges;
    };

    // Product Functions
    const openAddProduct = () => {
        const initial = {
            nombre: '',
            descripcion: '',
            precio: '',
            categoria: categories[0] || 'Entradas',
            etiqueta: '',
            imagen: '',
            disponible: true,
            destacado: false,
            oferta_porcentaje: ''
        };
        setEditingProduct(null);
        setProductForm(initial);
        setOriginalProductForm(initial);
        setIsProductModalOpen(true);
    };

    const openEditProduct = (product) => {
        const catName = typeof product.categoria === 'object' ? product.categoria.nombre : product.categoria;
        const initial = {
            nombre: product.nombre,
            descripcion: product.descripcion || '',
            precio: (product.precio_original || product.precio).toString(),
            categoria: catName,
            etiqueta: product.etiqueta || '',
            imagen: product.imagen || '',
            disponible: product.disponible,
            destacado: product.destacado || false,
            oferta_porcentaje: product.oferta_porcentaje?.toString() || ''
        };
        setEditingProduct(product);
        setProductForm(initial);
        setOriginalProductForm(initial);
        setIsProductModalOpen(true);
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const basePrice = parseFloat(productForm.precio);
            const discount = parseInt(productForm.oferta_porcentaje) || 0;
            const finalPrice = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;

            const payload = {
                ...productForm,
                precio: finalPrice,
                precio_original: discount > 0 ? basePrice : null,
                oferta_porcentaje: discount > 0 ? discount : null,
                etiqueta: productForm.etiqueta === 'none' ? null : productForm.etiqueta,
            };

            if (editingProduct) {
                await api().put(`/products/${slug}/${editingProduct.id}`, payload);
                toast.success('Producto actualizado');
            } else {
                await api().post(`/products/${slug}`, payload);
                toast.success('Producto creado');
            }
            setIsProductModalOpen(false);
            fetchCatalog();
        } catch (error) {
            console.error('Error saving product:', error);
            const errorMsg = error.response?.data?.detail || 'Error al guardar producto';
            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!confirm('¿Eliminar este producto?')) return;
        try {
            await api().delete(`/products/${slug}/${id}`);
            toast.success('Producto eliminado');
            fetchCatalog();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    // Category Functions
    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        if (!categoryName.trim()) return;

        setSaving(true);
        try {
            const oldName = typeof editingCategory === 'object' ? editingCategory?.nombre : editingCategory;
            const newName = categoryName.trim();
            const newIcon = categoryIcon;
            console.log('Submitting Category:', { oldName, newName, newIcon, editingCategory });

            // Scenario 1: Editing existing category
            if (editingCategory) {
                // If name changed, update all products
                if (oldName !== newName) {
                    const productsToUpdate = products.filter(p => p.categoria === oldName);
                    // Update products sequentially to avoid race conditions or overload
                    for (const p of productsToUpdate) {
                        await api().put(`/products/${slug}/${p.id}`, { categoria: newName });
                    }
                }

                // Update category metadata in backend (name & icon)
                // We use post to create/update if it exists (upsert logic in backend would be ideal, but for now we rely on API)
                // Actually, our backend POST /categories/{slug} performs insert. 
                // We should add a PUT endpoint or just call POST which likely inserts. 
                // Wait, if we rename, we should update the existing record.
                // But the backend current implementation (line 709) checks by NAME.
                // So if we rename, we might be creating a new one matching the new name.
                // We need to delete the old one if name changed? 
                // Let's assume for now we call POST to save the new state.
                await api().post(`/categories/${slug}`, { nombre: newName, icono: newIcon });

                // If name changed, delete old category entry if it was purely based on name
                if (oldName !== newName) {
                    await api().delete(`/categories/${slug}?nombre=${encodeURIComponent(oldName)}`);
                }

                toast.success('Categoría actualizada');
            } else {
                // Scenario 2: New Category
                await api().post(`/categories/${slug}`, { nombre: newName, icono: newIcon });
                toast.success('Categoría creada');
            }

            // Refresh data
            fetchCatalog();
            setIsCategoryModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Error al gestionar categoría');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCategory = async (catToDelete) => {
        const catName = typeof catToDelete === 'object' ? catToDelete.nombre : catToDelete;
        const hasProducts = products.some(p => p.categoria === catName);
        const msg = hasProducts
            ? `Esta categoría tiene productos asignados. ¿Realmente deseas eliminarla y dejar esos productos sin categoría?`
            : `¿Eliminar la categoría "${catName}"?`;

        if (!confirm(msg)) return;

        setSaving(true);
        try {
            if (hasProducts) {
                // If it has products, we might want to update them to "Sin Categoría" or similar
                const productsToUpdate = products.filter(p => p.categoria === catName);
                await Promise.all(productsToUpdate.map(p =>
                    api().put(`/products/${slug}/${p.id}`, { categoria: 'General' })
                ));
            }
            // Delete from backend table
            await api().delete(`/categories/${slug}?nombre=${encodeURIComponent(catName)}`);

            toast.success('Categoría eliminada');
            fetchCatalog();
        } catch (error) {
            toast.error('Error al eliminar categoría');
        } finally {
            setSaving(false);
        }
    };

    // Tag Functions
    const handleTagSubmit = async (e) => {
        e.preventDefault();
        if (!tagName.trim()) return;

        setSaving(true);
        try {
            if (editingTag) {
                // Rename scenario: update all products with this tag
                const productsToUpdate = products.filter(p => p.etiqueta === editingTag);
                await Promise.all(productsToUpdate.map(p =>
                    api().put(`/products/${slug}/${p.id}`, { etiqueta: tagName.trim() })
                ));
                toast.success('Etiqueta renombrada');
                fetchCatalog();
            } else {
                await api().post(`/tags/${slug}`, { nombre: tagName.trim() });
                setTags(prev => [...new Set([...prev, tagName.trim()])]);
                toast.success('Etiqueta creada');
            }
            setIsTagModalOpen(false);
        } catch (error) {
            toast.error('Error al gestionar etiqueta');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTag = async (tagToDelete) => {
        const hasProducts = products.some(p => p.etiqueta === tagToDelete);
        const msg = hasProducts
            ? `Esta etiqueta se usa en algunos productos. ¿Realmente deseas eliminarla de ellos?`
            : `¿Eliminar la etiqueta "${tagToDelete}"?`;

        if (!confirm(msg)) return;

        setSaving(true);
        try {
            if (hasProducts) {
                const productsToUpdate = products.filter(p => p.etiqueta === tagToDelete);
                await Promise.all(productsToUpdate.map(p =>
                    api().put(`/products/${slug}/${p.id}`, { etiqueta: null })
                ));
            }

            await api().delete(`/tags/${slug}?nombre=${encodeURIComponent(tagToDelete)}`);

            setTags(tags.filter(t => t !== tagToDelete));
            toast.success('Etiqueta eliminada');
        } catch (error) {
            toast.error('Error al eliminar etiqueta');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = filterCategory === 'all' || p.categoria === filterCategory;
        return matchesSearch && matchesCat;
    });

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const hasProductChanges = () => {
        if (!originalProductForm) return false;
        return JSON.stringify(productForm) !== JSON.stringify(originalProductForm);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-screen -mt-20">
                    <Loader2 className="w-10 h-10 animate-spin text-[#13ec6d]" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 md:px-6">
                {/* Header Contextual */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="space-y-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 text-[#618972] font-black text-[10px] uppercase tracking-[0.2em]">
                            <Settings2 className="w-3 h-3 text-[#13ec6d]" />
                            Panel de Control
                        </div>
                        <h1 className="text-4xl font-black text-[#111814] tracking-tighter">Configuración</h1>
                        <p className="text-[#618972] font-medium italic">Gestiona tu identidad y menú desde un solo lugar.</p>
                    </div>
                    <Button
                        onClick={handleSaveBusiness}
                        disabled={saving}
                        className={getButtonStyle(hasChanges())}
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        GUARDAR CAMBIOS
                    </Button>
                </div>

                <Tabs
                    value={activeTab}
                    onValueChange={(val) => setSearchParams({ tab: val })}
                    className="w-full"
                >
                    <TabsList className="bg-gray-100/50 p-1 h-auto rounded-[2.5rem] grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1 mb-8 w-full overflow-hidden">
                        <TabsTrigger
                            value="diseno"
                            className="flex-1 rounded-full px-2 py-3 font-black uppercase tracking-tighter text-[9px] items-center gap-2 transition-all duration-300 border border-transparent whitespace-nowrap
                            data-[state=active]:bg-[#13ec6d] data-[state=active]:text-[#111814] data-[state=active]:shadow-lg data-[state=active]:shadow-[#13ec6d]/20
                            data-[state=inactive]:text-[#618972] data-[state=inactive]:bg-white data-[state=inactive]:border-gray-100 data-[state=inactive]:hover:bg-gray-50 data-[state=inactive]:shadow-sm"
                        >
                            <Palette className="w-3.5 h-3.5" />
                            Identidad Visual
                        </TabsTrigger>
                        <TabsTrigger
                            value="menu"
                            className="flex-1 rounded-full px-2 py-3 font-black uppercase tracking-tighter text-[9px] items-center gap-2 transition-all duration-300 border border-transparent whitespace-nowrap
                            data-[state=active]:bg-[#13ec6d] data-[state=active]:text-[#111814] data-[state=active]:shadow-lg data-[state=active]:shadow-[#13ec6d]/20
                            data-[state=inactive]:text-[#618972] data-[state=inactive]:bg-white data-[state=inactive]:border-gray-100 data-[state=inactive]:hover:bg-gray-50 data-[state=inactive]:shadow-sm"
                        >
                            <Utensils className="w-3.5 h-3.5" />
                            Gestión de Menú
                        </TabsTrigger>
                        <TabsTrigger
                            value="domicilios"
                            className="flex-1 rounded-full px-2 py-3 font-black uppercase tracking-tighter text-[9px] items-center gap-2 transition-all duration-300 border border-transparent whitespace-nowrap
                            data-[state=active]:bg-[#13ec6d] data-[state=active]:text-[#111814] data-[state=active]:shadow-lg data-[state=active]:shadow-[#13ec6d]/20
                            data-[state=inactive]:text-[#618972] data-[state=inactive]:bg-white data-[state=inactive]:border-gray-100 data-[state=inactive]:hover:bg-gray-50 data-[state=inactive]:shadow-sm"
                        >
                            <Truck className="w-3.5 h-3.5" />
                            Logística
                        </TabsTrigger>
                        <TabsTrigger
                            value="entrega"
                            className="flex-1 rounded-full px-2 py-3 font-black uppercase tracking-tighter text-[9px] items-center gap-2 transition-all duration-300 border border-transparent whitespace-nowrap
                            data-[state=active]:bg-[#13ec6d] data-[state=active]:text-[#111814] data-[state=active]:shadow-lg data-[state=active]:shadow-[#13ec6d]/20
                            data-[state=inactive]:text-[#618972] data-[state=inactive]:bg-white data-[state=inactive]:border-gray-100 data-[state=inactive]:hover:bg-gray-50 data-[state=inactive]:shadow-sm"
                        >
                            <Package className="w-3.5 h-3.5" />
                            Métodos de Entrega
                        </TabsTrigger>
                        <TabsTrigger
                            value="pagos"
                            className="flex-1 rounded-full px-2 py-3 font-black uppercase tracking-tighter text-[9px] items-center gap-2 transition-all duration-300 border border-transparent whitespace-nowrap
                            data-[state=active]:bg-[#13ec6d] data-[state=active]:text-[#111814] data-[state=active]:shadow-lg data-[state=active]:shadow-[#13ec6d]/20
                            data-[state=inactive]:text-[#618972] data-[state=inactive]:bg-white data-[state=inactive]:border-gray-100 data-[state=inactive]:hover:bg-gray-50 data-[state=inactive]:shadow-sm"
                        >
                            <CreditCardIcon className="w-3.5 h-3.5" />
                            Métodos de Pago
                        </TabsTrigger>
                        <TabsTrigger
                            value="experiencia"
                            className="flex-1 rounded-full px-2 py-3 font-black uppercase tracking-tighter text-[9px] items-center gap-2 transition-all duration-300 border border-transparent whitespace-nowrap
                            data-[state=active]:bg-[#13ec6d] data-[state=active]:text-[#111814] data-[state=active]:shadow-lg data-[state=active]:shadow-[#13ec6d]/20
                            data-[state=inactive]:text-[#618972] data-[state=inactive]:bg-white data-[state=inactive]:border-gray-100 data-[state=inactive]:hover:bg-gray-50 data-[state=inactive]:shadow-sm"
                        >
                            <Smartphone className="w-3.5 h-3.5" />
                            Experiencia Cliente
                        </TabsTrigger>
                        <TabsTrigger
                            value="ai"
                            className="flex-1 rounded-full px-2 py-3 font-black uppercase tracking-tighter text-[9px] items-center gap-2 transition-all duration-300 border border-transparent whitespace-nowrap
                            data-[state=active]:bg-[#13ec6d] data-[state=active]:text-[#111814] data-[state=active]:shadow-lg data-[state=active]:shadow-[#13ec6d]/20
                            data-[state=inactive]:text-[#618972] data-[state=inactive]:bg-white data-[state=inactive]:border-gray-100 data-[state=inactive]:hover:bg-gray-50 data-[state=inactive]:shadow-sm"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Configuración Bot
                        </TabsTrigger>
                    </TabsList>


                    {/* DISEÑO TAB */}
                    <TabsContent value="diseno" className="space-y-6 outline-none">
                        <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                            <CardHeader className="pt-8 md:pt-10 px-6 md:px-10 pb-4 flex flex-col md:flex-row items-center md:items-center justify-between gap-6">
                                <div className="text-center md:text-left space-y-1">
                                    <CardTitle className="text-2xl md:text-3xl font-black">Identidad Visual</CardTitle>
                                    <CardDescription className="text-sm md:text-base">Configura los elementos gráficos que verán los clientes en el catálogo.</CardDescription>
                                </div>
                                <Button
                                    onClick={handleSaveBusiness}
                                    disabled={saving}
                                    className={`${getButtonStyle(hasChanges(), "small")} w-full md:w-auto h-12 md:h-11`}
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    GUARDAR IDENTIDAD
                                </Button>
                            </CardHeader>
                            <CardContent className="px-10 pb-10 space-y-10">
                                {/* Banner Personalization Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-tight text-[#111814]">Etiqueta del banner (Ej: Nuevo, Recomendado)</Label>
                                            <div className="relative">
                                                <Input
                                                    maxLength={20}
                                                    value={businessData.banner_tag || ''}
                                                    onChange={e => setBusinessData({ ...businessData, banner_tag: e.target.value })}
                                                    className="h-11 rounded-xl bg-white border-gray-100 font-medium pr-12 text-xs text-[#618972] placeholder:text-[#618972]/50"
                                                    placeholder="Ej: Nuestros favoritos"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">
                                                    {(businessData.banner_tag || '').length}/20
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-tight text-[#111814]">Título principal del banner</Label>
                                            <div className="relative">
                                                <Input
                                                    maxLength={40}
                                                    value={businessData.banner_title || ''}
                                                    onChange={e => setBusinessData({ ...businessData, banner_title: e.target.value })}
                                                    className="h-11 rounded-xl bg-white border-gray-100 font-medium pr-12 text-xs text-[#618972] placeholder:text-[#618972]/50"
                                                    placeholder="Ej: Nuestro menú"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">
                                                    {(businessData.banner_title || '').length}/40
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-tight text-[#111814]">Descripción del banner</Label>
                                        <div className="relative">
                                            <Textarea
                                                maxLength={150}
                                                value={businessData.banner_description || ''}
                                                onChange={e => setBusinessData({ ...businessData, banner_description: e.target.value })}
                                                className="min-h-[100px] rounded-xl bg-white border-gray-100 resize-none pr-4 pb-8 text-xs font-medium text-[#618972] placeholder:text-[#618972]/50 transition-all"
                                                placeholder="Describe brevemente lo que ofreces hoy..."
                                            />
                                            <span className="absolute right-4 bottom-4 text-[10px] text-gray-400 font-bold">
                                                {(businessData.banner_description || '').length}/150
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Banner Section */}
                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                        <div>
                                            <Label className="text-[11px] font-bold tracking-tight text-gray-600">Imagen principal del menú (Banner)</Label>
                                            <p className="text-xs text-[#618972]">Se mostrará en la parte superior de tu página pública.</p>
                                        </div>
                                    </div>
                                    <div className="relative aspect-[21/7] rounded-[2rem] overflow-hidden border border-gray-100 group shadow-inner bg-gray-50">
                                        <img
                                            src={businessData.banner_url || defaultImages[1]}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center cursor-pointer" onClick={() => document.getElementById('banner-upload').click()}>
                                            <div className="bg-white/90 p-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-sm text-[#111814] scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
                                                <Camera className="w-4 h-4" />
                                                Actualizar Banner
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Input
                                            value={businessData.banner_url || ''}
                                            onChange={e => setBusinessData({ ...businessData, banner_url: e.target.value })}
                                            className="rounded-2xl bg-gray-50 border-dashed text-xs font-mono"
                                            placeholder="URL de la imagen del banner..."
                                        />
                                        <div className="flex justify-end">
                                            <input
                                                type="file"
                                                id="banner-upload"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => handleBusinessMediaUpload(e, 'banner_url')}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full md:w-auto rounded-xl border-dashed hover:bg-[#13ec6d]/5 hover:text-[#13ec6d] hover:border-[#13ec6d]/30 transition-all font-bold h-11"
                                                onClick={() => document.getElementById('banner-upload').click()}
                                                disabled={saving}
                                            >
                                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                                SUBIR IMAGEN DEL BANNER
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Logo Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-base font-black uppercase tracking-tight">Logo del Negocio</Label>
                                            <p className="text-xs text-[#618972]">Tu sello distintivo.</p>
                                        </div>
                                        <div
                                            className="relative w-40 h-40 rounded-full bg-white p-2 shadow-2xl border-4 border-white overflow-hidden group cursor-pointer"
                                            onClick={() => document.getElementById('logo-upload').click()}
                                        >
                                            <img
                                                src={businessData.logo_url || `https://ui-avatars.com/api/?name=${businessData.nombre}&background=13ec6d&color=111814&bold=true`}
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                <Camera className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-bold">URL del Logotipo</Label>
                                        </div>
                                        <Input
                                            value={businessData.logo_url || ''}
                                            onChange={e => setBusinessData({ ...businessData, logo_url: e.target.value })}
                                            className="rounded-2xl bg-white border-dashed text-xs font-mono"
                                            placeholder="URL del logo (preferiblemente PNG sin fondo)..."
                                        />
                                        <div className="flex justify-end">
                                            <input
                                                type="file"
                                                id="logo-upload"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => handleBusinessMediaUpload(e, 'logo_url')}
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full md:w-auto rounded-xl border-dashed hover:bg-[#13ec6d]/5 hover:text-[#13ec6d] hover:border-[#13ec6d]/30 transition-all font-bold h-11"
                                                onClick={() => document.getElementById('logo-upload').click()}
                                                disabled={saving}
                                            >
                                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                                                SUBIR LOGOTIPO
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-[#618972] italic">* Recomendado: 512x512px, PNG transparente.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* MENU TAB */}
                    <TabsContent value="menu" className="space-y-8 outline-none">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Categories Manager */}
                            <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                                <CardHeader className="pt-8 px-8 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl">Categorías</CardTitle>
                                        <CardDescription className="text-xs">Estructura de tu menú.</CardDescription>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setEditingCategory(null);
                                            setCategoryName('');
                                            setOriginalCategoryName('');
                                            setCategoryIcon('Utensils');
                                            setIsCategoryModalOpen(true);
                                        }}
                                        className="rounded-xl bg-[#13ec6d] text-[#111814] font-black hover:bg-[#0fd660] shadow-md transition-all active:scale-95 text-[10px]"
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                                        NUEVA
                                    </Button>
                                </CardHeader>
                                <CardContent className="px-8 pb-8">
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map((cat, idx) => {
                                            const catName = typeof cat === 'string' ? cat : cat.nombre;
                                            const catIcon = typeof cat === 'object' ? cat.icono : 'Utensils';
                                            const isUrl = catIcon?.includes('/') || catIcon?.includes('http');
                                            const isLucide = AvailableIcons[catIcon];
                                            const IconComponent = isLucide ? AvailableIcons[catIcon] : Utensils;

                                            return (
                                                <div key={`${catName}-${idx}`} className="group flex items-center gap-2 bg-gray-50 border border-gray-100 pl-3 pr-1 py-1.5 rounded-xl hover:border-[#13ec6d] transition-all">
                                                    {isUrl ? (
                                                        <img src={catIcon} alt="" className="w-4 h-4 object-contain" />
                                                    ) : isLucide ? (
                                                        <IconComponent className="w-4 h-4 text-gray-500" />
                                                    ) : (
                                                        <span className="text-sm leading-none">{catIcon}</span>
                                                    )}
                                                    <span className="font-bold text-xs text-[#111814]">{catName}</span>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="size-6 rounded-lg hover:bg-gray-100">
                                                                <MoreVertical className="w-3 h-3 text-gray-400" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="rounded-2xl p-2 border-gray-100 shadow-xl">
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setEditingCategory(cat);
                                                                    setCategoryName(catName);
                                                                    setOriginalCategoryName(catName);
                                                                    setCategoryIcon(catIcon || 'Utensils');
                                                                    setIsCategoryModalOpen(true);
                                                                }}
                                                                className="rounded-xl font-bold text-sm cursor-pointer gap-2"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                                Editar
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteCategory(cat)}
                                                                className="rounded-xl font-bold text-sm cursor-pointer gap-2 text-red-500 focus:text-red-600 focus:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Eliminar
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            );
                                        })}
                                        {categories.length === 0 && (
                                            <div className="w-full text-center py-8 text-gray-400 text-sm">
                                                No hay categorías creadas.
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Tags Manager */}
                            <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                                <CardHeader className="pt-8 px-8 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl">Etiquetas</CardTitle>
                                        <CardDescription className="text-xs">Promociones y estados.</CardDescription>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setEditingTag(null);
                                            setTagName('');
                                            setOriginalTagName('');
                                            setIsTagModalOpen(true);
                                        }}
                                        className="rounded-xl bg-[#13ec6d] text-[#111814] font-black hover:bg-[#0fd660] shadow-md transition-all active:scale-95 text-[10px]"
                                    >
                                        <TagIcon className="w-3.5 h-3.5 mr-1.5" />
                                        NUEVA
                                    </Button>
                                </CardHeader>
                                <CardContent className="px-8 pb-8">
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map((tag, idx) => (
                                            <div key={`${tag}-${idx}`} className="group flex items-center gap-1 bg-[#13ec6d]/5 border border-[#13ec6d]/20 pl-3 pr-1 py-1.5 rounded-xl hover:border-[#13ec6d] transition-all">
                                                <span className="font-bold text-xs text-[#13ec6d]">{tag}</span>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="size-6 rounded-lg hover:bg-gray-100">
                                                            <MoreVertical className="w-3 h-3 text-gray-400" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-2xl p-2 border-gray-100 shadow-xl">
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setEditingTag(tag);
                                                                setTagName(tag);
                                                                setOriginalTagName(tag);
                                                                setIsTagModalOpen(true);
                                                            }}
                                                            className="rounded-xl font-bold text-sm cursor-pointer gap-2"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                            Renombrar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDeleteTag(tag)}
                                                            className="rounded-xl font-bold text-sm cursor-pointer gap-2 text-red-500 focus:text-red-600 focus:bg-red-50"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Eliminar
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        ))}
                                        {tags.length === 0 && (
                                            <p className="text-[10px] text-gray-400 italic">No hay etiquetas creadas (ej: "Oferta", "Nuevo").</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Products Table */}
                        <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                            <div className="p-6 md:px-8 border-b border-gray-50">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-black text-[#111814] tracking-tight whitespace-nowrap">Gestión de Catálogo</h2>
                                        <p className="text-[11px] text-[#618972] font-medium mt-0.5 hidden sm:block">Administra tus productos y existencias.</p>
                                    </div>
                                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                                        <Button
                                            onClick={() => navigate(`/dashboard/${slug}/catalogo/todos`)}
                                            variant="outline"
                                            className="rounded-2xl h-10 md:h-11 px-4 md:px-6 border-gray-200 text-[#618972] font-black gap-2 hover:bg-gray-50 transition-all active:scale-95 text-xs md:text-sm"
                                        >
                                            <LayoutGrid className="w-4 h-4" />
                                            <span className="hidden sm:inline whitespace-nowrap">Ver lista completa</span>
                                        </Button>
                                        <Button
                                            onClick={() => window.open(`/${slug}/menu-completo`, '_blank')}
                                            variant="outline"
                                            className="rounded-2xl h-10 md:h-11 px-4 md:px-6 border-gray-200 text-[#618972] font-black gap-2 hover:bg-gray-50 transition-all active:scale-95 text-xs md:text-sm"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            <span className="hidden sm:inline whitespace-nowrap">Ver catálogo</span>
                                        </Button>
                                        <Button
                                            onClick={openAddProduct}
                                            className="rounded-2xl h-10 md:h-11 px-4 md:px-6 bg-[#13ec6d] hover:bg-[#0fd660] text-[#111814] font-black gap-2 shadow-lg shadow-[#13ec6d]/10 transition-all active:scale-95 text-xs md:text-sm"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span className="whitespace-nowrap">Nuevo Producto</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="hidden sm:table-cell px-3 py-3 text-left text-[10px] font-black text-[#618972] uppercase tracking-widest w-[72px]">Imagen</th>
                                            <th className="px-3 py-3 text-left text-[10px] font-black text-[#618972] uppercase tracking-widest">Producto</th>
                                            <th className="hidden lg:table-cell px-3 py-3 text-left text-[10px] font-black text-[#618972] uppercase tracking-widest">Categoría</th>
                                            <th className="px-3 py-3 text-left text-[10px] font-black text-[#618972] uppercase tracking-widest w-[100px]">Precio</th>
                                            <th className="hidden md:table-cell px-3 py-3 text-left text-[10px] font-black text-[#618972] uppercase tracking-widest w-[110px]">Estado</th>
                                            <th className="px-3 py-3 text-right text-[10px] font-black text-[#618972] uppercase tracking-widest w-[100px]">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        <AnimatePresence mode='popLayout'>
                                            {paginatedProducts.map((p) => (
                                                <motion.tr
                                                    key={p.id}
                                                    layout
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className="hover:bg-gray-50/50 transition-colors group"
                                                >
                                                    <td className="hidden sm:table-cell px-3 py-3">
                                                        <div className="size-14 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 shadow-sm">
                                                            <img
                                                                src={p.imagen || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                                alt={p.nombre}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="sm:hidden size-12 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0">
                                                                <img
                                                                    src={p.imagen || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'}
                                                                    className="w-full h-full object-cover"
                                                                    alt={p.nombre}
                                                                />
                                                            </div>
                                                            <div className="space-y-0.5 min-w-0">
                                                                <div className="font-black text-[#111814] text-sm group-hover:text-[#13ec6d] transition-colors truncate">
                                                                    {p.nombre}
                                                                </div>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {p.etiqueta && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[#111824] text-[8px] font-black text-white uppercase tracking-widest">
                                                                            {p.etiqueta}
                                                                        </span>
                                                                    )}
                                                                    <span className={`sm:hidden text-[9px] font-black uppercase tracking-tight ${p.disponible ? 'text-[#13ec6d]' : 'text-red-400'}`}>
                                                                        {p.disponible ? 'Disponible' : 'Agotado'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="hidden lg:table-cell px-3 py-3">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-[10px] font-black text-[#618972] uppercase tracking-tighter">
                                                            {typeof p.categoria === 'object' ? p.categoria.nombre : p.categoria}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <span className="font-black text-[#111814] text-sm md:text-base tracking-tighter">
                                                            {formatCurrency(p.precio)}
                                                        </span>
                                                    </td>
                                                    <td className="hidden md:table-cell px-3 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${p.disponible ? 'text-[#13ec6d]' : 'text-red-400'}`}>
                                                                {p.disponible ? 'Disponible' : 'Agotado'}
                                                            </span>
                                                            <Switch
                                                                checked={p.disponible}
                                                                className="data-[state=checked]:bg-[#13ec6d]"
                                                                onCheckedChange={async (val) => {
                                                                    try {
                                                                        await api().put(`/products/${slug}/${p.id}`, { disponible: val });
                                                                        fetchInitialData();
                                                                        toast.success(val ? 'Activado' : 'Pausado');
                                                                    } catch (e) { toast.error('Error'); }
                                                                }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1 md:gap-2">
                                                            <Switch
                                                                checked={p.disponible}
                                                                className="sm:hidden scale-75 data-[state=checked]:bg-[#13ec6d]"
                                                                onCheckedChange={async (val) => {
                                                                    try {
                                                                        await api().put(`/products/${slug}/${p.id}`, { disponible: val });
                                                                        fetchInitialData();
                                                                        toast.success(val ? 'Activado' : 'Pausado');
                                                                    } catch (e) { toast.error('Error'); }
                                                                }}
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openEditProduct(p)}
                                                                className="size-8 md:size-9 rounded-xl text-gray-400 hover:text-[#13ec6d] hover:bg-[#13ec6d]/5 transition-all"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteProduct(p.id)}
                                                                className="size-8 md:size-9 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                                {filteredProducts.length === 0 && (
                                    <div className="py-20 text-center">
                                        <Utensils className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">No hay productos registrados</h3>
                                        <Button variant="link" className="text-[#13ec6d] text-xs font-black uppercase tracking-tighter" onClick={() => { setSearchTerm(''); setFilterCategory('all'); }}>Limpiar filtros</Button>
                                    </div>
                                )}
                            </div>

                            {/* Pagination Footer */}
                            <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    Mostrando {Math.min(filteredProducts.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredProducts.length, currentPage * itemsPerPage)} de {filteredProducts.length} productos
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-9 px-4 rounded-xl border-gray-200 font-black text-[9px] tracking-widest hover:bg-white transition-all disabled:opacity-30"
                                    >
                                        ANTERIOR
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="h-9 px-4 rounded-xl border-[#13ec6d] text-[#13ec6d] bg-white font-black text-[9px] tracking-widest hover:bg-[#13ec6d]/5 shadow-sm transition-all disabled:opacity-30"
                                    >
                                        SIGUIENTE
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* DOMICILIOS TAB */}
                    <TabsContent value="domicilios" className="space-y-6 outline-none">
                        <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                            <CardHeader className="pt-10 px-10 pb-4">
                                <CardTitle>Configuración de Envíos</CardTitle>
                                <CardDescription>Establece las reglas para el cálculo automático de domicilios por distancia.</CardDescription>
                            </CardHeader>
                            <CardContent className="px-10 pb-10 space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* Precio por KM */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                                                <Truck className="w-4 h-4 text-[#13ec6d]" />
                                                Precio por Kilómetro (COP)
                                            </Label>
                                            <p className="text-xs text-[#618972]">Valor que se multiplicará por la distancia entre el local y el cliente.</p>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[#618972]">$</div>
                                            <Input
                                                type="text"
                                                value={formatPrice(businessData.precio_km)}
                                                onChange={e => {
                                                    const raw = e.target.value.replace(/\D/g, '');
                                                    setBusinessData({ ...businessData, precio_km: parseFloat(raw) || 0 });
                                                }}
                                                className="h-14 pl-10 rounded-3xl bg-gray-50 border-2 border-transparent focus:border-[#13ec6d] focus:bg-white transition-all font-black text-lg"
                                                placeholder="Ej: 2.500"
                                            />
                                        </div>
                                    </div>

                                    {/* Costo Mínimo */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                                                <Check className="w-4 h-4 text-[#13ec6d]" />
                                                Costo Mínimo de Domicilio
                                            </Label>
                                            <p className="text-xs text-[#618972]">El cobro mínimo garantizado, incluso para distancias muy cortas.</p>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[#618972]">$</div>
                                            <Input
                                                type="text"
                                                value={formatPrice(businessData.costo_minimo_domicilio)}
                                                onChange={e => {
                                                    const raw = e.target.value.replace(/\D/g, '');
                                                    setBusinessData({ ...businessData, costo_minimo_domicilio: parseFloat(raw) || 0 });
                                                }}
                                                className="h-14 pl-10 rounded-3xl bg-gray-50 border-2 border-transparent focus:border-[#13ec6d] focus:bg-white transition-all font-black text-lg"
                                                placeholder="Ej: 5.000"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Geolocation Section */}
                                <div className="bg-gray-50 rounded-[2rem] p-8 border border-gray-100 space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-gray-900">
                                            <NavigationIcon className="w-4 h-4" />
                                            Ubicación de Referencia del Negocio
                                        </Label>
                                        <p className="text-xs text-gray-500">Estas coordenadas son necesarias para calcular la distancia con el cliente.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-gray-400">LATITUD</Label>
                                            <Input
                                                value={businessData.lat || ''}
                                                onChange={e => setBusinessData({ ...businessData, lat: parseFloat(e.target.value) || 0 })}
                                                placeholder="Ej: 4.6097"
                                                className="h-12 rounded-2xl border-gray-200"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-gray-400">LONGITUD</Label>
                                            <Input
                                                value={businessData.lng || ''}
                                                onChange={e => setBusinessData({ ...businessData, lng: parseFloat(e.target.value) || 0 })}
                                                placeholder="Ej: -74.0817"
                                                className="h-12 rounded-2xl border-gray-200"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (navigator.geolocation) {
                                                navigator.geolocation.getCurrentPosition((pos) => {
                                                    setBusinessData({
                                                        ...businessData,
                                                        lat: pos.coords.latitude,
                                                        lng: pos.coords.longitude
                                                    });
                                                    toast.success("Ubicación capturada correctamente");
                                                });
                                            } else {
                                                toast.error("Geolocalización no soportada");
                                            }
                                        }}
                                        className="w-full h-auto py-3 sm:h-12 rounded-2xl border-2 border-dashed border-[#13ec6d]/30 text-[#618972] font-black text-[10px] sm:text-xs tracking-tight gap-2 hover:bg-[#13ec6d]/5 transition-all whitespace-normal"
                                    >
                                        <MapPin className="w-4 h-4 flex-shrink-0" />
                                        USAR MI UBICACIÓN ACTUAL
                                    </Button>
                                </div>

                                <div className="flex justify-end pt-6">
                                    <Button
                                        onClick={handleSaveBusiness}
                                        disabled={saving}
                                        className={getButtonStyle(hasChanges())}
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        GUARDAR LOGÍSTICA
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* MÉTODOS DE ENTREGA TAB */}
                    <TabsContent value="entrega" className="space-y-6 outline-none">
                        <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                            <CardHeader className="pt-10 px-10 pb-4">
                                <CardTitle className="text-2xl flex items-center gap-3 font-black tracking-tighter">
                                    <div className="size-10 rounded-2xl bg-[#13ec6d]/10 flex items-center justify-center text-[#13ec6d]">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    Configuración de Servicios
                                </CardTitle>
                                <CardDescription>Habilita o deshabilita los canales de venta según tu modelo de negocio.</CardDescription>
                            </CardHeader>
                            <CardContent className="px-10 pb-10 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Domicilio Switch */}
                                    <div className={`p-8 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-4 ${businessData.metodos_entrega?.domicilio ? 'border-[#13ec6d] bg-[#13ec6d]/5' : 'border-gray-100 bg-gray-50'}`}
                                        onClick={() => setBusinessData({
                                            ...businessData,
                                            metodos_entrega: { ...businessData.metodos_entrega, domicilio: !businessData.metodos_entrega?.domicilio }
                                        })}>
                                        <div className={`size-16 rounded-3xl flex items-center justify-center transition-all ${businessData.metodos_entrega?.domicilio ? 'bg-[#13ec6d] text-[#111814]' : 'bg-white text-gray-300 shadow-sm'}`}>
                                            <Truck className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="font-black text-sm uppercase tracking-tight">Domicilio</p>
                                            <p className="text-[10px] text-[#618972] mt-1 font-medium">Activa logística y rastreo GPS.</p>
                                        </div>
                                        <Switch
                                            activeColor="#13ec6d"
                                            checked={businessData.metodos_entrega?.domicilio || false}
                                            onCheckedChange={(checked) => setBusinessData({
                                                ...businessData,
                                                metodos_entrega: { ...businessData.metodos_entrega, domicilio: checked }
                                            })}
                                        />
                                    </div>

                                    {/* Recoger Switch */}
                                    <div className={`p-8 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-4 ${businessData.metodos_entrega?.recoger ? 'border-[#13ec6d] bg-[#13ec6d]/5' : 'border-gray-100 bg-gray-50'}`}
                                        onClick={() => setBusinessData({
                                            ...businessData,
                                            metodos_entrega: { ...businessData.metodos_entrega, recoger: !businessData.metodos_entrega?.recoger }
                                        })}>
                                        <div className={`size-16 rounded-3xl flex items-center justify-center transition-all ${businessData.metodos_entrega?.recoger ? 'bg-[#13ec6d] text-[#111814]' : 'bg-white text-gray-300 shadow-sm'}`}>
                                            <ShoppingBag className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="font-black text-sm uppercase tracking-tight">Recoger en local</p>
                                            <p className="text-[10px] text-[#618972] mt-1 font-medium">El cliente retira su pedido.</p>
                                        </div>
                                        <Switch
                                            activeColor="#13ec6d"
                                            checked={businessData.metodos_entrega?.recoger || false}
                                            onCheckedChange={(checked) => setBusinessData({
                                                ...businessData,
                                                metodos_entrega: { ...businessData.metodos_entrega, recoger: checked }
                                            })}
                                        />
                                    </div>

                                    {/* Mesa Switch */}
                                    <div className={`p-8 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-4 ${businessData.metodos_entrega?.mesa ? 'border-[#13ec6d] bg-[#13ec6d]/5' : 'border-gray-100 bg-gray-50'}`}
                                        onClick={() => setBusinessData({
                                            ...businessData,
                                            metodos_entrega: { ...businessData.metodos_entrega, mesa: !businessData.metodos_entrega?.mesa }
                                        })}>
                                        <div className={`size-16 rounded-3xl flex items-center justify-center transition-all ${businessData.metodos_entrega?.mesa ? 'bg-[#13ec6d] text-[#111814]' : 'bg-white text-gray-300 shadow-sm'}`}>
                                            <Utensils className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="font-black text-sm uppercase tracking-tight">Servicio en Mesa</p>
                                            <p className="text-[10px] text-[#618972] mt-1 font-medium">Pedidos mediante código QR.</p>
                                        </div>
                                        <Switch
                                            activeColor="#13ec6d"
                                            checked={businessData.metodos_entrega?.mesa || false}
                                            onCheckedChange={(checked) => setBusinessData({
                                                ...businessData,
                                                metodos_entrega: { ...businessData.metodos_entrega, mesa: checked }
                                            })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-gray-100">
                                    <Button
                                        onClick={handleSaveBusiness}
                                        disabled={saving}
                                        className={getButtonStyle(hasChanges())}
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        GUARDAR CONFIGURACIÓN
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* MÉTODOS DE PAGO TAB */}
                    <TabsContent value="pagos" className="space-y-6 outline-none">
                        <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                            <CardHeader className="pt-10 px-10 pb-4">
                                <CardTitle className="text-2xl flex items-center gap-3 font-black tracking-tighter">
                                    <div className="size-10 rounded-2xl bg-[#13ec6d]/10 flex items-center justify-center text-[#13ec6d]">
                                        <CreditCardIcon className="w-6 h-6" />
                                    </div>
                                    Gestión de Pagos
                                </CardTitle>
                                <CardDescription>Habilita los medios de pago que tus clientes podrán usar.</CardDescription>
                            </CardHeader>
                            <CardContent className="px-10 pb-10 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Predefined Payment Methods */}
                                    {[
                                        { key: 'efectivo', label: 'Efectivo', desc: 'Pago físico en caja.', icon: Banknote },
                                        { key: 'nequi', label: 'Nequi', desc: 'Plataforma digital.', icon: Smartphone },
                                        { key: 'daviplata', label: 'Daviplata', desc: 'Billetera virtual.', icon: Wallet },
                                        { key: 'transferencia', label: 'Transferencia', desc: 'Bancolombia/Otros.', icon: Coins },
                                        { key: 'tarjeta', label: 'Tarjeta / Datáfono', desc: 'Débito o Crédito.', icon: CreditCardIcon },
                                        { key: 'link', label: 'Bre-B', desc: 'Pagos Inteligentes.', icon: LinkIcon }
                                    ].map((method) => (
                                        <div
                                            key={method.key}
                                            className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-3 ${businessData.metodos_pago?.[method.key] ? 'border-[#13ec6d] bg-[#13ec6d]/5' : 'border-gray-100 bg-gray-50'}`}
                                            onClick={() => setBusinessData({
                                                ...businessData,
                                                metodos_pago: { ...businessData.metodos_pago, [method.key]: !businessData.metodos_pago?.[method.key] }
                                            })}
                                        >
                                            <div className={`size-14 rounded-2xl flex items-center justify-center transition-all ${businessData.metodos_pago?.[method.key] ? 'bg-[#13ec6d] text-[#111814]' : 'bg-white text-gray-300 shadow-sm'}`}>
                                                <method.icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-sm uppercase tracking-tight">{method.label}</p>
                                                <p className="text-[10px] text-[#618972] mt-1 font-medium">{method.desc}</p>
                                            </div>
                                            <Switch
                                                activeColor="#13ec6d"
                                                checked={businessData.metodos_pago?.[method.key] || false}
                                                onCheckedChange={(checked) => setBusinessData({
                                                    ...businessData,
                                                    metodos_pago: { ...businessData.metodos_pago, [method.key]: checked }
                                                })}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-center md:justify-end pt-4 border-t border-gray-100">
                                    <Button
                                        onClick={handleSaveBusiness}
                                        disabled={saving}
                                        className={`${getButtonStyle(hasChanges())} w-auto`}
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        GUARDAR MÉTODOS DE PAGO
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* EXPERIENCIA CLIENTE TAB */}
                    <TabsContent value="experiencia" className="space-y-8 outline-none text-[#111814]">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Canal 1: Menú Digital */}
                            <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                                <CardHeader className="pt-10 px-10 pb-4">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="size-12 rounded-2xl bg-[#13ec6d]/10 flex items-center justify-center text-[#13ec6d]">
                                            <Globe className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl font-black tracking-tight">Catálogo Digital</CardTitle>
                                            <CardDescription>Tu carta interactiva abierta al mundo.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-10 pb-10 space-y-8">
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#618972]">Enlace Público de tu Menú</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                readOnly
                                                value={`${window.location.origin}/${slug}/menu-completo`}
                                                className="h-14 rounded-2xl bg-gray-50 border-gray-100 font-mono text-xs pr-12"
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="size-14 rounded-2xl border-gray-100 shrink-0 hover:bg-[#13ec6d]/5 hover:text-[#13ec6d] transition-all"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${window.location.origin}/${slug}/menu-completo`);
                                                    toast.success("Enlace copiado al portapapeles");
                                                }}
                                            >
                                                <Copy className="w-5 h-5" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="size-14 rounded-2xl border-gray-100 shrink-0 hover:bg-[#13ec6d]/5 hover:text-[#13ec6d] transition-all"
                                                onClick={() => window.open(`/${slug}/menu-completo`, '_blank')}
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 flex flex-col items-center gap-6">
                                        <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100" id="qr-menu-container">
                                            <QRCodeSVG
                                                value={`${window.location.origin}/${slug}/menu-completo`}
                                                size={200}
                                                level="H"
                                                includeMargin={true}
                                                imageSettings={{
                                                    src: businessData.logo_url || "/favicon.svg",
                                                    x: undefined,
                                                    y: undefined,
                                                    height: 40,
                                                    width: 40,
                                                    excavate: true,
                                                }}
                                            />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <p className="font-black text-sm uppercase tracking-widest">QR del Menú Digital</p>
                                            <p className="text-[10px] text-[#618972]">Descarga este código e imprímelo para tus mesas.</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="w-full h-12 rounded-2xl border-[#13ec6d] text-[#13ec6d] font-black gap-2 hover:bg-[#13ec6d]/5"
                                            onClick={() => {
                                                const svg = document.querySelector("#qr-menu-container svg");
                                                const svgData = new XMLSerializer().serializeToString(svg);
                                                const canvas = document.createElement("canvas");
                                                const ctx = canvas.getContext("2d");
                                                const img = new Image();
                                                img.onload = () => {
                                                    canvas.width = img.width;
                                                    canvas.height = img.height;
                                                    ctx.drawImage(img, 0, 0);
                                                    const pngFile = canvas.toDataURL("image/png");
                                                    const downloadLink = document.createElement("a");
                                                    downloadLink.download = `QR-Menu-${slug}.png`;
                                                    downloadLink.href = pngFile;
                                                    downloadLink.click();
                                                };
                                                img.src = "data:image/svg+xml;base64," + btoa(svgData);
                                            }}
                                        >
                                            <Download className="w-4 h-4" />
                                            DESCARGAR QR PNG
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Canal 2: Seguimiento de Pedidos */}
                            <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                                <CardHeader className="pt-10 px-10 pb-4">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="size-12 rounded-2xl bg-[#13ec6d]/10 flex items-center justify-center text-[#13ec6d]">
                                            <Clock className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl font-black tracking-tight">Seguimiento Real-Time</CardTitle>
                                            <CardDescription>Donde tus clientes ven el estado de sus pedidos.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-10 pb-10 space-y-8">
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#618972]">Enlace de Seguimiento (Mis Pedidos)</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                readOnly
                                                value={`${window.location.origin}/${slug}/mis-pedidos`}
                                                className="h-14 rounded-2xl bg-gray-50 border-gray-100 font-mono text-xs pr-12"
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="size-14 rounded-2xl border-gray-100 shrink-0 hover:bg-[#13ec6d]/5 hover:text-[#13ec6d] transition-all"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${window.location.origin}/${slug}/mis-pedidos`);
                                                    toast.success("Enlace de seguimiento copiado");
                                                }}
                                            >
                                                <Copy className="w-5 h-5" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="size-14 rounded-2xl border-gray-100 shrink-0 hover:bg-[#13ec6d]/5 hover:text-[#13ec6d] transition-all"
                                                onClick={() => window.open(`/${slug}/mis-pedidos`, '_blank')}
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 flex flex-col items-center gap-6">
                                        <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100" id="qr-tracking-container">
                                            <QRCodeSVG
                                                value={`${window.location.origin}/${slug}/mis-pedidos`}
                                                size={200}
                                                level="H"
                                                includeMargin={true}
                                                imageSettings={{
                                                    src: businessData.logo_url || "/favicon.svg",
                                                    x: undefined,
                                                    y: undefined,
                                                    height: 40,
                                                    width: 40,
                                                    excavate: true,
                                                }}
                                            />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <p className="font-black text-sm uppercase tracking-widest">QR de Seguimiento</p>
                                            <p className="text-[10px] text-[#618972]">Útil para que el cliente escanee y vea sus últimos pedidos.</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="w-full h-12 rounded-2xl border-[#13ec6d] text-[#13ec6d] font-black gap-2 hover:bg-[#13ec6d]/5"
                                            onClick={() => {
                                                const svg = document.querySelector("#qr-tracking-container svg");
                                                const svgData = new XMLSerializer().serializeToString(svg);
                                                const canvas = document.createElement("canvas");
                                                const ctx = canvas.getContext("2d");
                                                const img = new Image();
                                                img.onload = () => {
                                                    canvas.width = img.width;
                                                    canvas.height = img.height;
                                                    ctx.drawImage(img, 0, 0);
                                                    const pngFile = canvas.toDataURL("image/png");
                                                    const downloadLink = document.createElement("a");
                                                    downloadLink.download = `QR-Tracking-${slug}.png`;
                                                    downloadLink.href = pngFile;
                                                    downloadLink.click();
                                                };
                                                img.src = "data:image/svg+xml;base64," + btoa(svgData);
                                            }}
                                        >
                                            <Download className="w-4 h-4" />
                                            DESCARGAR QR PNG
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Preview Section */}
                        <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-[#111814] text-white">
                            <div className="p-10 flex flex-col md:flex-row items-center gap-10">
                                <div className="space-y-6 flex-1">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#13ec6d]/10 border border-[#13ec6d]/20 text-[#13ec6d] text-[10px] font-black uppercase tracking-widest">
                                        <Sparkles className="w-3 h-3" /> Tip Pro
                                    </div>
                                    <h3 className="text-3xl font-black tracking-tighter leading-none">Tu menú vive en el bolsillo de tu cliente.</h3>
                                    <p className="text-gray-400 font-medium leading-relaxed">
                                        Aprovecha el enlace directo para enviarlo por WhatsApp al confirmar un pedido,
                                        o imprimir los códigos QR para que tus comensales en mesa puedan pedir sin esperas.
                                    </p>
                                    <div className="flex gap-4">
                                        <Button
                                            className="bg-[#13ec6d] hover:bg-[#0fd660] text-[#111814] font-black rounded-2xl h-12 px-8 uppercase text-[10px] tracking-widest"
                                            onClick={() => window.open(`/${slug}/menu-completo`, '_blank')}
                                        >
                                            Ver mi Catálogo Digital
                                        </Button>
                                    </div>
                                </div>
                                <div className="w-full md:w-64 aspect-[9/18] bg-white rounded-[2.5rem] border-[8px] border-gray-800 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-[#f6f8f7]">
                                        {/* Mockup content */}
                                        <div className="h-16 bg-[#13ec6d] px-4 pt-6 pb-2 shadow-sm rounded-b-[1.5rem] relative z-10 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 bg-white rounded-full p-0.5 shadow-sm flex items-center justify-center overflow-hidden">
                                                    <img src={businessData.logo_url || "/favicon.svg"} className="size-full object-cover" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-[#111814] leading-tight">Don Jediondo</span>
                                                    <span className="text-[8px] font-medium text-[#111814]/70 leading-tight">Abierto • 20-30 min</span>
                                                </div>
                                            </div>
                                            <div className="size-8 bg-white/20 rounded-full flex items-center justify-center text-[#111814]">
                                                <Search className="w-3 h-3" />
                                            </div>
                                        </div>

                                        <div className="p-3 space-y-3 overflow-hidden bg-[#f8fcf9] h-full">
                                            {/* Categories */}
                                            <div className="flex gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
                                                <div className="px-3 py-1 bg-[#111814] rounded-full flex items-center shadow-lg shadow-black/10">
                                                    <span className="text-[9px] font-bold text-white whitespace-nowrap">Todos</span>
                                                </div>
                                                <div className="px-3 py-1 bg-white border border-gray-100 rounded-full flex items-center">
                                                    <span className="text-[9px] font-bold text-gray-500 whitespace-nowrap">Burgers</span>
                                                </div>
                                                <div className="px-3 py-1 bg-white border border-gray-100 rounded-full flex items-center">
                                                    <span className="text-[9px] font-bold text-gray-500 whitespace-nowrap">Pizzas</span>
                                                </div>
                                                <div className="px-3 py-1 bg-white border border-gray-100 rounded-full flex items-center">
                                                    <span className="text-[9px] font-bold text-gray-500 whitespace-nowrap">Bebidas</span>
                                                </div>
                                            </div>

                                            {/* Product 1 */}
                                            <div className="bg-white p-2.5 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-50 flex gap-3 items-center">
                                                <div className="size-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 shadow-sm relative group">
                                                    <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <h4 className="text-[10px] font-black text-gray-900 leading-tight truncate">Hamburguesa Doble</h4>
                                                    <p className="text-[8px] text-gray-500 leading-tight line-clamp-1 mt-0.5">Queso cheddar, tocineta, salsas...</p>
                                                    <p className="text-[10px] font-black text-[#13ec6d] mt-1">$24.900</p>
                                                </div>
                                                <div className="size-7 bg-[#13ec6d] rounded-full flex items-center justify-center text-[#111814] shadow-lg shadow-[#13ec6d]/20 active:scale-90 transition-transform">
                                                    <Plus className="w-3.5 h-3.5" />
                                                </div>
                                            </div>

                                            {/* Product 2 */}
                                            <div className="bg-white p-2.5 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-50 flex gap-3 items-center">
                                                <div className="size-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 shadow-sm">
                                                    <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&q=80" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <h4 className="text-[10px] font-black text-gray-900 leading-tight truncate">Pizza Pepperoni</h4>
                                                    <p className="text-[8px] text-gray-500 leading-tight line-clamp-1 mt-0.5">Masa madre, queso mozzarella...</p>
                                                    <p className="text-[10px] font-black text-[#13ec6d] mt-1">$32.000</p>
                                                </div>
                                                <div className="size-7 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center hover:bg-[#13ec6d] hover:text-[#111814] transition-colors">
                                                    <Plus className="w-3.5 h-3.5" />
                                                </div>
                                            </div>

                                            {/* Product 3 */}
                                            <div className="bg-white p-2.5 rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-50 flex gap-3 items-center opacity-80">
                                                <div className="size-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 shadow-sm">
                                                    <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <h4 className="text-[10px] font-black text-gray-900 leading-tight truncate">Ensalada César</h4>
                                                    <p className="text-[8px] text-gray-500 leading-tight line-clamp-1 mt-0.5">Pollo grillé, crutones, parmesano...</p>
                                                    <p className="text-[10px] font-black text-[#13ec6d] mt-1">$18.500</p>
                                                </div>
                                                <div className="size-7 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center">
                                                    <Plus className="w-3.5 h-3.5" />
                                                </div>
                                            </div>

                                            {/* Floating Cart Pill */}
                                            <div className="mx-auto w-max bg-[#111814] rounded-full px-4 py-2 mt-4 flex items-center gap-2 shadow-xl">
                                                <div className="size-4 rounded-full bg-[#13ec6d] text-[#111814] text-[8px] font-black flex items-center justify-center">1</div>
                                                <span className="text-[9px] font-bold text-white">Ver pedido</span>
                                                <span className="text-[9px] font-bold text-white/60 pl-2 border-l border-white/10">$24.900</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-center p-6">
                                        <p className="font-black text-xs">Así se ve tu negocio en el móvil del cliente</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </TabsContent>

                    {/* BOT CONFIG TAB */}
                    <TabsContent value="ai" className="space-y-6 outline-none">
                        <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                            <CardHeader className="pt-8 px-6 md:pt-10 md:px-10 pb-4 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0 bg-white">
                                <div className="text-center md:text-left">
                                    <div className="flex flex-col md:flex-row items-center gap-2 mb-2 justify-center md:justify-start">
                                        <div className="p-2 bg-[#13ec6d]/10 rounded-xl">
                                            <Sparkles className="w-5 h-5 text-[#13ec6d]" />
                                        </div>
                                        <CardTitle className="text-xl md:text-2xl font-black text-[#111814]">Configuración del Bot IA</CardTitle>
                                    </div>
                                    <CardDescription className="text-xs md:text-sm text-center md:text-left">Personaliza cómo tu asistente responde por WhatsApp.</CardDescription>
                                </div>

                                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 w-full md:w-auto justify-between md:justify-start">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#618972]">Estado del Bot</span>
                                    <Switch
                                        checked={businessData.ai_habilitado}
                                        onCheckedChange={(val) => setBusinessData({ ...businessData, ai_habilitado: val })}
                                        className="data-[state=checked]:bg-[#13ec6d]"
                                    />
                                </div>
                            </CardHeader>

                            <CardContent className="px-6 md:px-10 pb-8 md:pb-10 space-y-8">
                                <div className="grid grid-cols-1 gap-8 max-w-xl mx-auto">
                                    {/* Personalidad */}
                                    <div className="space-y-3 text-center">
                                        <Label className="text-xs font-black uppercase tracking-widest text-[#111814]">Personalidad del Bot</Label>
                                        <Select
                                            value={businessData.ai_personalidad}
                                            onValueChange={(val) => setBusinessData({ ...businessData, ai_personalidad: val })}
                                        >
                                            <SelectTrigger className="h-11 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#13ec6d]/20 transition-all font-medium text-xs text-center justify-center">
                                                <SelectValue placeholder="Selecciona una personalidad" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-gray-100 text-xs font-medium">
                                                <SelectItem value="Amigable y cercano (Recomendado)">Amigable y cercano (Recomendado)</SelectItem>
                                                <SelectItem value="Formal y profesional">Formal y profesional</SelectItem>
                                                <SelectItem value="Divertido y entusiasta">Divertido y entusiasta</SelectItem>
                                                <SelectItem value="Elegante y sofisticado">Elegante y sofisticado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-[#618972] font-medium italic">Define el tono de voz que usará el bot.</p>
                                    </div>

                                    {/* Saludo */}
                                    <div className="space-y-3 text-center">
                                        <Label className="text-xs font-black uppercase tracking-widest text-[#111814]">Saludo Automático</Label>
                                        <Textarea
                                            value={businessData.ai_saludo || ''}
                                            onChange={(e) => setBusinessData({ ...businessData, ai_saludo: e.target.value })}
                                            placeholder="¡Hola! Soy el asistente de su negocio 🍕 ¿En qué puedo ayudarte hoy?"
                                            className="min-h-[80px] rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#13ec6d]/20 transition-all font-medium leading-relaxed text-xs text-center placeholder:text-center"
                                        />
                                        <p className="text-[10px] text-[#618972] font-medium italic">Este mensaje se enviará al iniciar.</p>
                                    </div>

                                    {/* Conocimiento */}
                                    <div className="space-y-3 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Label className="text-xs font-black uppercase tracking-widest text-[#111814]">Conocimiento de la IA</Label>
                                            <span className="text-[9px] font-black text-[#13ec6d] uppercase bg-[#13ec6d]/10 px-2 py-0.5 rounded-full">Mejora la Precisión</span>
                                        </div>
                                        <Textarea
                                            value={businessData.ai_conocimiento || ''}
                                            onChange={(e) => setBusinessData({ ...businessData, ai_conocimiento: e.target.value })}
                                            placeholder="Describe detalles únicos de tu negocio, políticas, especialidades o curiosidades..."
                                            className="min-h-[120px] rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-[#13ec6d]/20 transition-all font-medium leading-relaxed text-xs p-4"
                                        />
                                        <p className="text-[10px] text-[#618972] font-medium italic">Describe detalles únicos para que la IA los use.</p>
                                    </div>
                                </div>

                                {/* Footer / Actions */}
                                <div className="pt-6 border-t border-gray-100 flex flex-col items-center gap-6">
                                    <div className="flex gap-8 justify-center w-full">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="size-10 rounded-xl bg-[#13ec6d]/10 flex items-center justify-center">
                                                <Check className="w-5 h-5 text-[#13ec6d]" />
                                            </div>
                                            <span className="text-[9px] font-bold text-[#618972]">Bot Activo</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                                <Globe className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <span className="text-[9px] font-bold text-[#618972]">Multilingüe</span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleSaveBusiness}
                                        disabled={saving}
                                        className={`${getButtonStyle(hasChanges(), "small")} w-full md:w-auto justify-center h-11 px-8 text-[10px]`}
                                    >
                                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                                        GUARDAR CONFIGURACIÓN
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* PRODUCT MODAL */}
                <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
                    <DialogContent className="rounded-[2.5rem] max-w-2xl p-0 overflow-hidden border-none">
                        <DialogHeader className="p-10 pb-6 bg-gray-50 shrink-0">
                            <DialogTitle className="text-3xl font-black tracking-tighter">
                                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                            </DialogTitle>
                            <DialogDescription>
                                Completa los detalles para actualizar tu catálogo en tiempo real.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleProductSubmit} className="p-10 pt-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="font-bold">Nombre del Producto</Label>
                                        <Input
                                            value={productForm.nombre}
                                            onChange={e => setProductForm({ ...productForm, nombre: e.target.value })}
                                            required
                                            className="h-12 rounded-2xl bg-gray-50 border-gray-100"
                                            placeholder="Ej: Hamburguesa Suprema"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold text-[#111814]">Precio (COP)</Label>
                                        <Input
                                            type="text"
                                            value={formatPrice(productForm.precio)}
                                            onChange={e => {
                                                const raw = e.target.value.replace(/\D/g, '');
                                                setProductForm({ ...productForm, precio: raw });
                                            }}
                                            required
                                            className="h-12 rounded-2xl bg-gray-50 border-gray-100 font-bold text-[#111814]"
                                            placeholder="25.000"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="font-bold">Categoría</Label>
                                        <Select
                                            value={productForm.categoria}
                                            onValueChange={val => setProductForm({ ...productForm, categoria: val })}
                                        >
                                            <SelectTrigger className="h-12 rounded-2xl bg-gray-50 border-gray-100">
                                                <SelectValue placeholder="Seleccionar sección..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((cat, idx) => {
                                                    const catName = typeof cat === 'object' ? cat.nombre : cat;
                                                    return <SelectItem key={`${catName}-${idx}`} value={catName}>{catName}</SelectItem>;
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold">Etiqueta (Opcional)</Label>
                                        <Select
                                            value={productForm.etiqueta}
                                            onValueChange={val => setProductForm({ ...productForm, etiqueta: val })}
                                        >
                                            <SelectTrigger className="h-12 rounded-2xl bg-gray-100/50 border-gray-100 border-dashed">
                                                <SelectValue placeholder="Sin etiqueta" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Ninguna</SelectItem>
                                                {tags.map(tag => (
                                                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-bold">Descripción / Ingredientes</Label>
                                    <Textarea
                                        value={productForm.descripcion}
                                        onChange={e => setProductForm({ ...productForm, descripcion: e.target.value })}
                                        className="rounded-2xl bg-gray-50 border-gray-100 min-h-[100px]"
                                        placeholder="Detalla lo que incluye el plato..."
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="font-bold">Imagen del Producto</Label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="file"
                                                id="product-image-upload"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                disabled={uploadingProductImage}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 rounded-xl border-[#13ec6d]/20 text-[#13ec6d] hover:bg-[#13ec6d]/5 font-bold gap-2 text-[10px]"
                                                onClick={() => document.getElementById('product-image-upload').click()}
                                                disabled={uploadingProductImage}
                                            >
                                                {uploadingProductImage ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Upload className="w-3 h-3" />
                                                )}
                                                {uploadingProductImage ? 'SUBIENDO...' : 'SUBIR'}
                                            </Button>

                                            {productForm.imagen && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setProductForm({ ...productForm, imagen: '' })}
                                                    className="h-8 rounded-xl border-red-100 text-red-500 hover:bg-red-50 font-bold gap-2 text-[10px]"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                    ELIMINAR
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex-1 relative">
                                            <Input
                                                value={productForm.imagen}
                                                onChange={e => setProductForm({ ...productForm, imagen: e.target.value })}
                                                className="h-12 rounded-2xl bg-gray-50 border-gray-100 text-xs font-mono pr-10"
                                                placeholder="https://images.unsplash... o sube una imagen"
                                            />
                                            <ImageIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                        </div>
                                        <div className="size-12 rounded-xl border border-gray-100 overflow-hidden bg-gray-50 shrink-0 shadow-sm flex items-center justify-center">
                                            {productForm.imagen ? (
                                                <img src={productForm.imagen} className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="w-5 h-5 text-gray-200" />
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-[#618972] italic px-1">Sugerencia: Usa imágenes de 800x600px para mejor rendimiento.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                                    <div className="space-y-2">
                                        <Label className="font-bold flex items-center gap-1">
                                            Oferta (%)
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={productForm.oferta_porcentaje}
                                                onChange={e => setProductForm({ ...productForm, oferta_porcentaje: e.target.value })}
                                                className="h-12 rounded-2xl bg-gray-50 border-gray-100 pr-10"
                                                placeholder="Ej: 15"
                                                min="0"
                                                max="100"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-[#618972]">%</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-center gap-3">
                                        <div className="flex items-center gap-3 mt-4">
                                            <Switch
                                                checked={productForm.destacado}
                                                onCheckedChange={checked => setProductForm({ ...productForm, destacado: checked })}
                                                className="data-[state=checked]:bg-[#13ec6d]"
                                            />
                                            <Label className="font-bold cursor-pointer" onClick={() => setProductForm({ ...productForm, destacado: !productForm.destacado })}>
                                                Marcar como Producto Destacado
                                            </Label>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 py-2 border-t border-gray-50 pt-6">
                                    <Switch
                                        checked={productForm.disponible}
                                        onCheckedChange={checked => setProductForm({ ...productForm, disponible: checked })}
                                        className="data-[state=checked]:bg-[#13ec6d]"
                                    />
                                    <div>
                                        <Label className="font-bold">Disponible para la venta</Label>
                                        <p className="text-xs text-[#618972]">Si lo desactivas, aparecerá como "Agotado" en el menú.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white/80 backdrop-blur-sm py-4 border-t mt-auto">
                                    <Button type="button" variant="ghost" className="flex-1 h-12 rounded-2xl font-bold" onClick={() => setIsProductModalOpen(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={saving} className={getModalButtonStyle(hasProductChanges())}>
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingProduct ? 'GUARDAR PRODUCTO' : 'CREAR PRODUCTO'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* CATEGORY MODAL */}
                <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
                    <DialogContent className="rounded-[2.5rem] max-w-md border-none overflow-hidden max-h-[90vh] flex flex-col">
                        <DialogHeader className="p-8 pb-4 shrink-0">
                            <DialogTitle className="text-2xl font-black">{editingCategory ? 'Renombrar Categoría' : 'Nueva Categoría'}</DialogTitle>
                            <DialogDescription>Las categorías ayudan a tus clientes a navegar el menú.</DialogDescription>
                        </DialogHeader>
                        <div className="overflow-y-auto custom-scrollbar">
                            <form onSubmit={handleCategorySubmit} className="p-8 pt-4 space-y-6">
                                <div className="space-y-2">
                                    <Label className="font-bold">Nombre de la Categoría</Label>
                                    <Input
                                        value={categoryName}
                                        onChange={e => setCategoryName(e.target.value)}
                                        placeholder="Ej: Postres de Autor"
                                        className="h-12 rounded-2xl bg-gray-50"
                                        required
                                    />
                                    {editingCategory && (
                                        <p className="text-[10px] text-orange-500 font-bold bg-orange-50 p-3 rounded-xl border border-orange-100">
                                            Aviso: Al renombrar una categoría, todos los productos asociados se actualizarán automáticamente.
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <Label className="font-bold">Icono</Label>
                                    <Tabs defaultValue="icons" className="w-full">
                                        <TabsList className="grid w-full grid-cols-3 mb-4 h-11 p-1 bg-gray-100 rounded-xl">
                                            <TabsTrigger value="icons" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Iconos</TabsTrigger>
                                            <TabsTrigger value="emojis" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Emojis</TabsTrigger>
                                            <TabsTrigger value="upload" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Subir</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="icons" className="mt-0">
                                            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                                                {Object.entries(AvailableIcons).map(([name, Icon]) => (
                                                    <button
                                                        key={name}
                                                        type="button"
                                                        onClick={() => setCategoryIcon(name)}
                                                        className={`p-2 rounded-xl border flex items-center justify-center transition-all ${categoryIcon === name
                                                            ? 'bg-[#13ec6d]/10 border-[#13ec6d] text-[#13ec6d] ring-2 ring-[#13ec6d]/20'
                                                            : 'bg-white border-gray-100 hover:border-gray-300 text-gray-500'
                                                            }`}
                                                    >
                                                        <Icon className="w-5 h-5" />
                                                    </button>
                                                ))}
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="emojis" className="mt-0 space-y-3">
                                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-6 gap-4 bg-gray-50/50">
                                                <Input
                                                    value={(!AvailableIcons[categoryIcon] && !categoryIcon?.includes('/')) ? categoryIcon : ''}
                                                    onChange={(e) => setCategoryIcon(e.target.value)}
                                                    className="w-24 h-24 text-6xl text-center rounded-2xl border-gray-200 focus:border-[#13ec6d] bg-white shadow-sm"
                                                    placeholder="😁"
                                                />
                                                <p className="text-xs text-gray-500 text-center font-medium mt-2">
                                                    Usa <span className="font-bold text-[#111814]">Tecla Windows</span> + <span className="font-bold text-[#111814]">Punto (.)</span> para abrir el panel de emojis
                                                </p>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="upload" className="mt-0 space-y-3">
                                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-6 gap-4 bg-gray-50/50 hover:bg-gray-50 transition-colors relative cursor-pointer group"
                                                onClick={() => document.getElementById('cat-icon-upload').click()}>

                                                <input
                                                    type="file"
                                                    id="cat-icon-upload"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleCategoryIconUpload}
                                                />

                                                {categoryIcon?.includes('/') || categoryIcon?.includes('http') ? (
                                                    <div className="relative">
                                                        <img src={categoryIcon} alt="Icon Preview" className="w-20 h-20 object-contain" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-lg transition-opacity">
                                                            <Edit2 className="w-6 h-6" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-[#13ec6d] transition-colors">
                                                        <div className="p-4 bg-white rounded-full shadow-sm group-hover:shadow-md transition-all">
                                                            <Upload className="w-6 h-6" />
                                                        </div>
                                                        <span className="text-xs font-bold uppercase tracking-wider">Subir Imagen</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-center text-gray-400">Recomendado: Imágenes cuadradas, PNG transparente, máx 1MB.</p>
                                        </TabsContent>
                                    </Tabs>

                                    {/* Preview of Selection */}
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest flex-1">Vista Previa:</span>
                                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                                            {(() => {
                                                const isUrl = categoryIcon?.includes('/') || categoryIcon?.includes('http');
                                                const isLucide = AvailableIcons[categoryIcon];
                                                const IconComponent = isLucide ? AvailableIcons[categoryIcon] : Utensils;

                                                if (isUrl) return <img src={categoryIcon} className="w-5 h-5 object-contain" />;
                                                if (isLucide) return <IconComponent className="w-5 h-5 text-[#13ec6d]" />;
                                                return <span className="text-lg leading-none">{categoryIcon}</span>;
                                            })()}
                                            <span className="text-sm font-bold text-[#111814]">{categoryName || 'Nombre Categoría'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <Button type="button" variant="ghost" className="flex-1 h-12 rounded-2xl" onClick={() => setIsCategoryModalOpen(false)}>Cancelar</Button>
                                    <Button type="submit" disabled={saving} className={getModalButtonStyle(categoryName !== originalCategoryName || (editingCategory && categoryIcon !== (typeof editingCategory === 'object' ? editingCategory.icono : 'Utensils')))}>
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'GUARDAR SECCIÓN'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* TAG MODAL */}
                <Dialog open={isTagModalOpen} onOpenChange={setIsTagModalOpen}>
                    <DialogContent className="rounded-[2.5rem] max-w-md border-none overflow-hidden">
                        <DialogHeader className="p-8 pb-4">
                            <DialogTitle className="text-2xl font-black">{editingTag ? 'Renombrar Etiqueta' : 'Nueva Etiqueta'}</DialogTitle>
                            <DialogDescription>Las etiquetas sirven para resaltar promociones o estados especiales.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleTagSubmit} className="p-8 pt-4 space-y-6">
                            <div className="space-y-2">
                                <Label className="font-bold">Nombre de la Etiqueta</Label>
                                <Input
                                    value={tagName}
                                    onChange={e => setTagName(e.target.value)}
                                    placeholder="Ej: Oferta, Nuevo, Recomendado"
                                    className="h-12 rounded-2xl bg-gray-50"
                                    required
                                />
                                {editingTag && (
                                    <p className="text-[10px] text-orange-500 font-bold bg-orange-50 p-3 rounded-xl border border-orange-100">
                                        Aviso: Al renombrar una etiqueta, todos los productos que la usen se actualizarán automáticamente.
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <Button type="button" variant="ghost" className="flex-1 h-12 rounded-2xl" onClick={() => setIsTagModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={saving} className={getModalButtonStyle(tagName !== originalTagName)}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'GUARDAR ETIQUETA'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout >
    );
}
