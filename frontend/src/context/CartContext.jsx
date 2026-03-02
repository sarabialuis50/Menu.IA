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

  const addItem = useCallback((product, quantity = 1, notas = '', selectedModifiers = []) => {
    // Helper to compare arrays ignoring order
    const areModifiersEqual = (arr1, arr2) => {
      if (!arr1 && !arr2) return true;
      if (!arr1 || !arr2) return false;
      if (arr1.length !== arr2.length) return false;
      const sorted1 = [...arr1].sort();
      const sorted2 = [...arr2].sort();
      return sorted1.every((val, index) => val === sorted2[index]);
    };

    setItems(prev => {
      // Find item with same product ID, same notes, AND same selected modifiers
      const existingIndex = prev.findIndex(item =>
        item.producto_id === product.id &&
        item.notas === notas &&
        areModifiersEqual(item.modificadores, selectedModifiers?.map(m => typeof m === 'string' ? m : m.nombre))
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].cantidad += quantity;
        return updated;
      }

      // Calculate extra price from modifiers (accounting for quantity per modifier)
      const modifiersPrice = selectedModifiers ? selectedModifiers.reduce((acc, m) => acc + ((m.precio || 0) * (m.cantidad || 1)), 0) : 0;
      const finalUnitPrice = product.precio + modifiersPrice;

      return [...prev, {
        producto_id: product.id,
        nombre: product.nombre,
        descripcion: product.descripcion,
        cantidad: quantity,
        precio_unitario: finalUnitPrice,
        notas: notas || null,
        imagen: product.imagen,
        modificadores: selectedModifiers?.map(m => {
          if (typeof m === 'string') return m;
          return `(${m.cantidad || 1}) ${m.nombre}`;
        }) || []
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
