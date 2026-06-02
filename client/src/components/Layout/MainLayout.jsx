import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, PawPrint } from 'lucide-react';
import Sidebar from './Sidebar';
import AppFooter from '../AppFooter';
import { useBranding } from '../../hooks/useBranding';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const branding = useBranding();
  const appName = branding.app_name || 'Project Nemo';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, always visible on desktop */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-40 flex-shrink-0
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Menü öffnen"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            {branding.logo_path
              ? <img src={branding.logo_path} alt={appName} className="h-7 w-7 object-contain rounded" />
              : <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center"><PawPrint size={15} className="text-white" /></div>
            }
            <span className="font-semibold text-gray-800 text-sm">{appName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        <AppFooter />
      </div>
    </div>
  );
}
