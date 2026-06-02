import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, ArrowLeft, Puzzle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { petsApi, backupApi } from '../../api/pets';
import client from '../../api/client';
import VetVisitsTab from './tabs/VetVisitsTab';
import MedicationsTab from './tabs/MedicationsTab';
import BloodWorkTab from './tabs/BloodWorkTab';
import StoolDiaryTab from './tabs/StoolDiaryTab';
import BehaviorTab from './tabs/BehaviorTab';
import FeedingTab from './tabs/FeedingTab';
import VaccinationsTab from './tabs/VaccinationsTab';
import EventsTab from './tabs/EventsTab';
import StatisticsTab from './tabs/StatisticsTab';
import WeightDiaryTab from './tabs/WeightDiaryTab';
import PluginFrame from '../../components/PluginFrame';

const STATIC_TABS = [
  { id: 'vet', label: 'Tierarzt' },
  { id: 'meds', label: 'Medikamente' },
  { id: 'blood', label: 'Blutbilder' },
  { id: 'stool', label: 'Kottagebuch' },
  { id: 'behavior', label: 'Verhalten' },
  { id: 'feeding', label: 'Futterplan' },
  { id: 'vaccinations', label: 'Impfplan' },
  { id: 'events', label: 'Ereignisse' },
  { id: 'weight', label: 'Gewicht' },
  { id: 'stats', label: 'Statistiken' }
];

const genderLabels = { male: 'Männlich', female: 'Weiblich', unknown: 'Unbekannt' };

export default function PetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('vet');
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef();

  async function handleExport() {
    setExporting(true);
    try {
      const { blob, filename } = await backupApi.exportPet(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export erfolgreich heruntergeladen');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Export fehlgeschlagen');
    } finally {
      setExporting(false);
    }
  }

  const { data: pet, isLoading } = useQuery({ queryKey: ['pet', id], queryFn: () => petsApi.getOne(id) });

  // Pet-level plugins
  const { data: allPlugins = [] } = useQuery({
    queryKey: ['active-plugins'],
    queryFn: () => client.get('/plugins/active').then(r => r.data)
  });
  const petPlugins = allPlugins.filter(p => p.menuPlacement === 'pet');
  const allTabs = [
    ...STATIC_TABS,
    ...petPlugins.map(p => ({ id: `plugin:${p.name}`, label: p.shortName, plugin: p }))
  ];

  const photoMutation = useMutation({
    mutationFn: file => petsApi.uploadPhoto(id, file),
    onSuccess: () => { qc.invalidateQueries(['pet', id]); qc.invalidateQueries(['pets']); toast.success('Foto aktualisiert'); },
    onError: () => toast.error('Fehler beim Upload')
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">Lade...</div>;
  if (!pet) return <div className="p-8 text-center text-red-500">Tier nicht gefunden</div>;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 pt-6 pb-0">
        <button onClick={() => navigate('/pets')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={16} /> Alle Tiere
        </button>

        <div className="flex items-start gap-6 mb-6">
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            {pet.photo_path ? (
              <img src={pet.photo_path} alt={pet.name} className="w-24 h-24 rounded-2xl object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 text-3xl font-bold">
                {pet.name[0].toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={20} className="text-white" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && photoMutation.mutate(e.target.files[0])} />
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{pet.name}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
              {pet.species && <span>{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</span>}
              {pet.gender && pet.gender !== 'unknown' && <span>{genderLabels[pet.gender]}</span>}
              {pet.birth_date && <span>* {format(new Date(pet.birth_date), 'dd.MM.yyyy')}</span>}
              {pet.weight && <span>{pet.weight} kg</span>}
              {pet.microchip_id && <span>Chip: {pet.microchip_id}</span>}
            </div>
            {pet.notes && <p className="mt-2 text-sm text-gray-500 italic">{pet.notes}</p>}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-secondary btn-sm mt-3 self-start"
              title="Alle Daten dieses Tiers als ZIP exportieren"
            >
              <Download size={13} />
              {exporting ? 'Exportiere…' : 'Exportieren'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {allTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.plugin && (
                tab.plugin.iconPath
                  ? <img src={tab.plugin.iconPath} alt="" className="w-4 h-4" />
                  : <Puzzle size={14} />
              )}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'vet' && <VetVisitsTab petId={id} />}
        {activeTab === 'meds' && <MedicationsTab petId={id} />}
        {activeTab === 'blood' && <BloodWorkTab petId={id} />}
        {activeTab === 'stool' && <StoolDiaryTab petId={id} />}
        {activeTab === 'behavior' && <BehaviorTab petId={id} />}
        {activeTab === 'feeding' && <FeedingTab petId={id} />}
        {activeTab === 'vaccinations' && <VaccinationsTab petId={id} />}
        {activeTab === 'events' && <EventsTab petId={id} />}
        {activeTab === 'weight' && <WeightDiaryTab petId={id} />}
        {activeTab === 'stats' && <StatisticsTab petId={id} petName={pet.name} />}
        {activeTab.startsWith('plugin:') && (() => {
          const pluginName = activeTab.replace('plugin:', '');
          const plugin = petPlugins.find(p => p.name === pluginName);
          return <PluginFrame pluginName={pluginName} file="pet.html" petId={id} title={plugin?.shortName} />;
        })()}
      </div>
    </div>
  );
}
