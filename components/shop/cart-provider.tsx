"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

import type { CartItem, Cart, CartTotals } from "@/lib/woocommerce.d";
import { loadCartFromStorage, saveCartToStorage, clearCartFromStorage } from "./cart-utils";

interface CartContextType {
  cart: Cart;
  isOpen: boolean;
  isLoading: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (productId: number, variationId?: number) => void;
  updateQuantity: (productId: number, quantity: number, variationId?: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function calculateTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce((sum, item) => {
    return sum + parseFloat(item.price) * item.quantity;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Tax and shipping would typically be calculated server-side
  // For now we return placeholders
  return {
    subtotal: subtotal.toFixed(2),
    shipping: "0.00",
    tax: "0.00",
    total: subtotal.toFixed(2),
    itemCount,
  };
}

function getCartKey(productId: number, variationId?: number): string {
  return variationId ? `${productId}-${variationId}` : `${productId}`;
}

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [cart, setCart] = useState<Cart>({
    items: [],
    totals: calculateTotals([]),
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const storedItems = loadCartFromStorage();
      if (storedItems) {
        setCart({
          items: storedItems,
          totals: calculateTotals(storedItems),
        });
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to load cart from storage:", error);
      setIsLoading(false);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      saveCartToStorage(cart.items);
    }
  }, [cart.items, isLoading]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), []);

  const addItem = useCallback(async (newItem: CartItem) => {
    setCart((prev) => {
      const existingIndex = prev.items.findIndex(
        (item) =>
          item.productId === newItem.productId &&
          item.variationId === newItem.variationId
      );

      let newItems: CartItem[];

      if (existingIndex >= 0) {
        // Update quantity if item already exists
        newItems = prev.items.map((item, index) => {
          if (index === existingIndex) {
            return {
              ...item,
              quantity: item.quantity + newItem.quantity,
            };
          }
          return item;
        });
      } else {
        // Add new item
        newItems = [...prev.items, newItem];
      }

      return {
        items: newItems,
        totals: calculateTotals(newItems),
      };
    });

    // Open cart drawer after adding
    setIsOpen(true);
  }, []);

  const removeItem = useCallback(
    (productId: number, variationId?: number) => {
      setCart((prev) => {
        const newItems = prev.items.filter(
          (item) =>
            !(
              item.productId === productId &&
              item.variationId === variationId
            )
        );

        return {
          items: newItems,
          totals: calculateTotals(newItems),
        };
      });
    },
    []
  );

  const updateQuantity = useCallback(
    (productId: number, quantity: number, variationId?: number) => {
      if (quantity <= 0) {
        removeItem(productId, variationId);
        return;
      }

      setCart((prev) => {
        const newItems = prev.items.map((item) => {
          if (
            item.productId === productId &&
            item.variationId === variationId
          ) {
            return { ...item, quantity };
          }
          return item;
        });

        return {
          items: newItems,
          totals: calculateTotals(newItems),
        };
      });
    },
    [removeItem]
  );

  const clearCart = useCallback(() => {
    setCart({
      items: [],
      totals: calculateTotals([]),
    });
  }, []);

  const getItemCount = useCallback(() => {
    return cart.totals.itemCount;
  }, [cart.totals.itemCount]);

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        isLoading,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
