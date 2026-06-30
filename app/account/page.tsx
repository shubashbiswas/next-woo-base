"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { ShoppingCart, Package, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccountPage() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please log in to view your account</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold">My Account</h1>
        <Button variant="outline" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </header>

      {/* User Info */}
      <section className="mb-8 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-gray-500">Name:</span> {user.name}
          </div>
          <div>
            <span className="font-medium text-gray-500">Email:</span> {user.email}
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <nav className="space-y-4">
        <Link href="/account/orders" className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <Package className="mr-2 h-5 w-5 text-primary" />
            Order History
          </h2>
          <p className="text-gray-600">View and track all your orders</p>
        </Link>

        <Link href="/account/wishlist" className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <User className="mr-2 h-5 w-5 text-primary" />
            Wishlist
          </h2>
          <p className="text-gray-600">Your saved products for later</p>
        </Link>
      </nav>
    </div>
  );
}