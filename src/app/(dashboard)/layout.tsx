"use client";

import { useState } from "react";
import Link from "next/link";

const navItems = [
  { label: "Conversations", href: "/dashboard", icon: "💬" },
  { label: "Analytiques", href: "/dashboard/analytics", icon: "📊" },
  { label: "Intégrations", href: "/dashboard/integrations", icon: "🔌" },
  { label: "Configuration", href: "/dashboard/settings", icon: "⚙️" },
  { label: "Équipe", href: "/dashboard/team", icon: "👥" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-border transform transition-transform duration-200 lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/dashboard" className="text-xl font-bold text-brand-600">
            Humen<span className="font-light text-text-primary">AI</span>
          </Link>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 lg:px-8 bg-white">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-surface-secondary"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <span className="text-lg">☰</span>
          </button>
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-sm text-text-secondary">Plan Standard</span>
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-medium text-brand-600">
              M
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 bg-surface-secondary">{children}</main>
      </div>
    </div>
  );
}
