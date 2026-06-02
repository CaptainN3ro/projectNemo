import { NavLink, Outlet } from 'react-router-dom';
import { Users, Puzzle, Mail, Settings, Palette } from 'lucide-react';

const linkClass = ({ isActive }) =>
  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`;

export default function AdminLayout() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-500 text-sm mt-1">Nutzerverwaltung, Plugins und Systemeinstellungen</p>
      </div>
      <div className="flex gap-1 mb-6 border-b border-gray-200 pb-2">
        <NavLink to="/admin/users" className={linkClass}><Users size={16} /> Nutzer</NavLink>
        <NavLink to="/admin/plugins" className={linkClass}><Puzzle size={16} /> Plugins</NavLink>
        <NavLink to="/admin/smtp" className={linkClass}><Mail size={16} /> SMTP / E-Mail</NavLink>
        <NavLink to="/admin/branding" className={linkClass}><Palette size={16} /> Branding & SEO</NavLink>
        <NavLink to="/admin/settings" className={linkClass}><Settings size={16} /> Einstellungen</NavLink>
      </div>
      <Outlet />
    </div>
  );
}
