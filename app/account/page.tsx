"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { WordPressAccountIframe } from "@/components/wordpress/wordpress-account-iframe";
import { ShoppingCart, Package, User, LogOut, Globe, LayoutDashboard, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/site.config";

type AccountTab = "dashboard" | "wordpress-account";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AccountTab>("dashboard");

  const tabs: { id: AccountTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "wordpress-account", label: "My Account", icon: <Globe className="h-4 w-4" /> },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600 mb-4">Please log in to view your account</p>
          <Link href="/account/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold">My Account</h1>
        <Button variant="outline" onClick={logout} size="sm">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </header>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* User Info */}
          <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500 block">Name</span>
                <span className="text-gray-900">{user.name}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500 block">Email</span>
                <span className="text-gray-900">{user.email}</span>
              </div>
            </div>
          </section>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/account/orders"
              className="block bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-3 flex items-center">
                <Package className="mr-2 h-5 w-5 text-primary" />
                Order History
              </h2>
              <p className="text-gray-600">View and track all your orders</p>
            </Link>

            <button
              onClick={() => setActiveTab("wordpress-account")}
              className="block bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left w-full cursor-pointer"
            >
              <h2 className="text-xl font-semibold mb-3 flex items-center">
                <Globe className="mr-2 h-5 w-5 text-primary" />
                WooCommerce Account
              </h2>
              <p className="text-gray-600">Manage subscriptions, payment methods, and more</p>
            </button>
          </div>

          {/* Quick link to WordPress Account */}
          <section className="bg-gradient-to-br from-primary/5 to-secondary/5 p-6 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  WordPress Account Dashboard
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Access your full WooCommerce account with orders, downloads, addresses, and payment methods.
                </p>
              </div>
              <Button
                onClick={() => setActiveTab("wordpress-account")}
                variant="default"
                className="gap-2 flex-shrink-0"
              >
                Open
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </section>
        </div>
      )}

      {activeTab === "wordpress-account" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">WooCommerce Account</h2>
              <p className="text-gray-500 text-sm">
                Manage your orders, subscriptions, addresses, and payment methods.
              </p>
            </div>
            <a
              href={`${siteConfig.wordpress_url.replace(/\/+$/, "")}/my-account/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Open in new tab <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <WordPressAccountIframe
            wordpressUrl={siteConfig.wordpress_url}
            returnUrl={
              typeof window !== "undefined"
                ? window.location.origin + "/account"
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}