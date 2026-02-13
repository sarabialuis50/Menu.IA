import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({ nombre: '', telefono: '' });

  const addItem = useCallback((product, quantity = 1, notas = '') => {
    setItems(prev => {
      const existingIndex = prev.findIndex(item => 
        item.producto_id === product.id && item.notas === notas
      );
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].cantidad += quantity;
        return updated;
      }
      
      return [...prev, {
        producto_id: product.id,
        nombre: product.nombre,
        cantidad: quantity,
        precio_unitario: product.precio,
        notas: notas || null,
        imagen_url: product.imagen_url,
      }];
    });
  }, []);

  const removeItem = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuantity = useCallback((index, quantity) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }
    setItems(prev => {
      const updated = [...prev];
      updated[index].cantidad = quantity;
      return updated;
    });
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomerInfo({ nombre: '', telefono: '' });
  }, []);

  const total = items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
  const itemCount = items.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <CartContext.Provider value={{
      items,
      customerInfo,
      setCustomerInfo,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total,
      itemCount,
    }}>
      {children}
    </CartContext.Provider>
  );
};
