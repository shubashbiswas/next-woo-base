"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, User, ArrowRight } from "lucide-react";

interface UseCartProps {
  addItem: (item: any) => Promise<void>;
  removeItem: (productId: number, variationId?: number) => void;
  updateQuantity: (productId: number, quantity: number, variationId?: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
}

interface UserFlowProps {
  addItem: UseCartProps["addItem"];
  removeItem: UseCartProps["removeItem"];
  updateQuantity: UseCartProps["updateQuantity"];
  clearCart: UseCartProps["clearCart"];
  getItemCount: UseCartProps["getItemCount"];
}

export function UserFlow({ addItem, removeItem, updateQuantity, clearCart, getItemCount }: UserFlowProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const itemCount = getItemCount();

  return (
    <>
      {/* Cart Button */}
      <button
        onClick={() => clearCart()}
        className="relative p-2 text-gray-600 hover:text-primary transition-colors"
      >
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center h-4 w-4 text-xs font-bold bg-red-500 text-white rounded-full">
            {itemCount}
          </span>
        )}
      </button>

      {/* User Account Button */}
      <Link href="/account" className="p-2 text-gray-600 hover:text-primary transition-colors">
        <User className="h-5 w-5" />
      </Link>
    </>
  );
}