import { NavLink, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, PawPrint, Calendar, Users, Puzzle, Mail, LogOut, ChevronDown, ChevronRight, Settings, SlidersHorizontal, X, Palette, UserCog } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../../store/authStore';
import { petsApi } from '../../api/pets';
import client from '../../api/client';
import { useBranding } from '../../hooks/useBranding';

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary-600 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`;

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [petsOpen, setPetsOpen] = useState(true);
  const branding = useBranding();
  const appName = branding.app_name || 'Project Nemo';

  const { data: pets = [] } = useQuery({ queryKey: ['pets'], queryFn: petsApi.getAll });
  const { data: activePlugins = [] } = useQuery({
    queryKey: ['active-plugins'],
    queryFn: () => client.get('/plugins/active').then(r => r.data)
  });

  function handleNav() {
    onClose?.();
  }

  function handleLogout() {
    logout();
    navigate('/login');
    onClose?.();
  }

  return (
    <div className="flex flex-col h-full bg-slate-800 text-slate-300 w-64 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
          {branding.logo_path
            ? <img src={branding.logo_path} alt={appName} className="w-full h-full object-cover" />
            : <PawPrint size={18} className="text-white" />
          }
        </div>
        <span className="text-white font-bold text-base flex-1 truncate">{appName}</span>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700"
          aria-label="Menü schließen"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <NavLink to="/" end className={linkClass} onClick={handleNav}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>

        {/* Pets expandable */}
        <div>
          <button
            onClick={() => setPetsOpen(o => !o)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <PawPrint size={18} />
            <span className="flex-1 text-left">Meine Tiere</span>
            {petsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {petsOpen && (
            <div className="ml-4 mt-0.5 space-y-0.5">
              <NavLink to="/pets" end className={linkClass} onClick={handleNav}>
                Alle Tiere
              </NavLink>
              {pets.map(pet => (
                <NavLink key={pet.id} to={`/pets/${pet.id}`} className={linkClass} onClick={handleNav}>
                  <span className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-xs shrink-0">
                    {pet.name[0].toUpperCase()}
                  </span>
                  <span className="truncate">{pet.name}</span>
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <NavLink to="/calendar" className={linkClass} onClick={handleNav}>
          <Calendar size={18} /> Kalender
        </NavLink>

        {/* Top-level plugin menu items (placement: "top") */}
        {activePlugins.filter(p => !p.menuPlacement || p.menuPlacement === 'top').map(plugin => (
          <NavLink key={plugin.name} to={`/plugin/${plugin.name}`} className={linkClass} onClick={handleNav}>
            {plugin.iconPath
              ? <img src={plugin.iconPath} alt="" className="w-4 h-4 shrink-0" />
              : <Puzzle size={18} />}
            <span className="truncate">{plugin.shortName}</span>
          </NavLink>
        ))}

        {/* Admin section */}
        {user?.role === 'admin' && (
          <>
            <div className="pt-4 pb-1">
              <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Administration</p>
            </div>
            <NavLink to="/admin/users" className={linkClass} onClick={handleNav}>
              <Users size={18} /> Nutzerverwaltung
            </NavLink>
            <NavLink to="/admin/plugins" className={linkClass} onClick={handleNav}>
              <Puzzle size={18} /> Plugins
            </NavLink>
            <NavLink to="/admin/smtp" className={linkClass} onClick={handleNav}>
              <Mail size={18} /> SMTP / E-Mail
            </NavLink>
            <NavLink to="/admin/branding" className={linkClass} onClick={handleNav}>
              <Palette size={18} /> Branding & SEO
            </NavLink>
            <NavLink to="/admin/settings" className={linkClass} onClick={handleNav}>
              <SlidersHorizontal size={18} /> Einstellungen
            </NavLink>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-700 px-3 py-3">
        <Link to="/profile" onClick={handleNav} className="flex items-center gap-3 mb-2 rounded-lg hover:bg-slate-700 px-1 py-1 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-slate-400 text-xs truncate group-hover:text-slate-300">{user?.email}</p>
          </div>
          <UserCog size={14} className="text-slate-500 group-hover:text-slate-300 shrink-0" />
        </Link>
        <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
          <LogOut size={14} /> Abmelden
        </button>
      </div>
    </div>
  );
}
