"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/auth.hooks";
import LoginForm from "@/components/admin/auth/LoginForm";
import { useState } from "react";
import { useCategoriesManager } from "@/features/categories/categories.hooks";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, user, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { tree } = useCategoriesManager();
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);

  // The dedicated /admin/login route renders without the dashboard shell,
  // regardless of any (possibly stale) client-side session.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (!token) {
    return <LoginForm />;
  }

  const navLinks = [
    { name: "Dashboard", path: "/admin" },
    { name: "Orders", path: "/admin/orders" },
    { name: "Products", path: "/admin/products" },
    { name: "Categories / الأقسام", path: "/admin/categories" },
  ];

  const renderCategoryNode = (node: any, depth: number = 0) => (
    <div key={node.id} className="flex flex-col">
      <Link
        href={`/admin/categories`}
        onClick={() => setIsMobileMenuOpen(false)}
        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex items-center"
        style={{ paddingLeft: `${(depth + 1) * 1}rem` }}
      >
        <span className="truncate">{node.name_ar} ({node.name_en})</span>
      </Link>
      {node.subcategories && node.subcategories.length > 0 && (
        <div className="flex flex-col border-l border-gray-200 ml-4">
          {node.subcategories.map((sub: any) => renderCategoryNode(sub, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            7alm Admin
          </h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`w-full md:w-64 bg-white border-b md:border-r border-gray-200 flex flex-col md:h-screen md:sticky top-0 z-40 transition-all ${isMobileMenuOpen ? "block" : "hidden md:flex"}`}>
        <div className="p-6 border-b border-gray-200 hidden md:block">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            7alm Admin
          </h1>
          <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
        </div>
        
        {/* Mobile user info */}
        <div className="p-4 border-b border-gray-200 md:hidden">
           <p className="text-gray-500 text-sm">Logged in as: {user?.email}</p>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-amber-50 text-amber-600 border border-amber-200"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          
          <div className="mt-2">
            <button
              onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex justify-between items-center transition-all"
            >
              <span>Category Tree</span>
              {isCategoriesExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {isCategoriesExpanded && (
              <div className="mt-1 flex flex-col space-y-1">
                {tree.map((node: any) => renderCategoryNode(node, 0))}
              </div>
            )}
          </div>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-65px)] md:h-screen bg-gray-50">
        {children}
      </main>
    </div>
  );
}
