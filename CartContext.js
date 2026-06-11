// src/lib/CartContext.js
"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const CartContext = createContext(null);
const KEY = "tiibaby_cart";

export function CartProvider({ children }) {
  const [items,    setItems]    = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setItems(JSON.parse(raw)); } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items, hydrated]);

  const addToCart = useCallback((product, qty = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === product.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], qty: n[idx].qty + qty }; return n; }
      return [...prev, { ...product, qty }];
    });
  }, []);

  const removeFromCart = useCallback((id) => setItems(prev => prev.filter(i => i.id !== id)), []);

  const updateQty = useCallback((id, qty) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(KEY); } catch {}
  }, []);

  const total     = items.reduce((s, i) => s + Number(i.price) * i.qty, 0);
  const itemCount = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQty, clearCart, total, itemCount, hydrated }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
