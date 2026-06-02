import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, PawPrint, Pill, TrendingUp, TrendingDown, Minus, Plus } from 'lucide-react';
import { dashboardApi } from '../api/pets';
import useAuthStore from '../store/authStore';

const eventTypeLabels = { vet_visit: 'Tierarzt', vaccination: 'Impfung', event: 'Ereignis' };
const eventTypeColors = { vet_visit: 'bg-blue-100 text-blue-700', vaccination: 'bg-amber-100 text-amber-700', event: 'bg-emerald-100 text-emerald-700' };

function TrendIcon({ trend }) {
  if (trend === 'improving') return <TrendingUp size={16} className="text-green-500" />;
  if (trend === 'declining') return <TrendingDown size={16} className="text-red-500" />;
  return <Minus size={16} className="text-gray-400" />;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Lade...</div>;

  const { pets = [], upcomingEvents = [], activeMedications = [], recentStoolAvg, recentBehaviorAvg, stoolEntryCount7d, behaviorEntryCount7d } = data || {};

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Guten Morgen, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-gray-500 mt-1">{format(new Date(), "EEEE, d. MMMM yyyy", { locale: de })}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <PawPrint size={22} className="text-primary-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{pets.length}</p>
            <p className="text-sm text-gray-500">Tiere</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Calendar size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{upcomingEvents.length}</p>
            <p className="text-sm text-gray-500">Anstehende Termine</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Pill size={22} className="text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{activeMedications.length}</p>
            <p className="text-sm text-gray-500">Aktive Medikamente</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <TrendingUp size={22} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stoolEntryCount7d || 0}</p>
            <p className="text-sm text-gray-500">Einträge letzte 7 Tage</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming events */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Nächste Termine (30 Tage)</h2>
            <Link to="/calendar" className="text-sm text-primary-600 hover:text-primary-700">Kalender →</Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">Keine anstehenden Termine</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((evt, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <span className={`badge ${eventTypeColors[evt.type] || 'bg-gray-100 text-gray-700'}`}>
                    {eventTypeLabels[evt.type] || evt.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{evt.title}</p>
                    <p className="text-xs text-gray-500">{evt.petName}</p>
                  </div>
                  <p className="text-xs text-gray-500 shrink-0">
                    {format(parseISO(evt.date), 'dd.MM.yyyy', { locale: de })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Trends */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Trends (7 Tage)</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ø Kot-Bewertung</span>
                <span className="text-sm font-semibold">{recentStoolAvg ?? '–'} / 5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ø Verhaltensbew.</span>
                <span className="text-sm font-semibold">{recentBehaviorAvg ?? '–'} / 5</span>
              </div>
            </div>
          </div>

          {/* Active meds */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">Aktive Medikamente</h2>
            {activeMedications.length === 0 ? (
              <p className="text-gray-400 text-sm">Keine aktiven Medikamente</p>
            ) : (
              <div className="space-y-2">
                {activeMedications.slice(0, 5).map(med => (
                  <div key={med.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{med.name}</p>
                      <p className="text-xs text-gray-500">{med.petName}</p>
                    </div>
                    {med.dosage && <span className="text-xs text-gray-500">{med.dosage} {med.unit}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pets quick access */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Tiere</h2>
              <Link to="/pets" className="btn-secondary btn-sm">
                <Plus size={14} /> Neues Tier
              </Link>
            </div>
            {pets.length === 0 ? (
              <p className="text-gray-400 text-sm">Noch keine Tiere angelegt</p>
            ) : (
              <div className="space-y-2">
                {pets.map(pet => (
                  <Link key={pet.id} to={`/pets/${pet.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    {pet.photo_path ? (
                      <img src={pet.photo_path} alt={pet.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-semibold">
                        {pet.name[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{pet.name}</p>
                      <p className="text-xs text-gray-500">{pet.species}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
