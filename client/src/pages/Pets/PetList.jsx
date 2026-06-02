import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, PawPrint, Pencil, Trash2, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { petsApi, backupApi } from '../../api/pets';
import Modal from '../../components/UI/Modal';
import ConfirmDialog from '../../components/UI/ConfirmDialog';

const SPECIES = ['Hund', 'Katze', 'Vogel', 'Kaninchen', 'Meerschweinchen', 'Hamster', 'Fisch', 'Reptil', 'Sonstiges'];

function PetForm({ pet, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: pet || {} });

  const mutation = useMutation({
    mutationFn: data => pet ? petsApi.update(pet.id, data) : petsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['pets']);
      toast.success(pet ? 'Tier aktualisiert' : 'Tier angelegt');
      onClose();
    },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });

  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2">
          <label className="label">Name *</label>
          <input className="input" {...register('name', { required: true })} />
        </div>
        <div className="form-group">
          <label className="label">Tierart</label>
          <select className="input" {...register('species')}>
            <option value="">Wählen...</option>
            {SPECIES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Rasse</label>
          <input className="input" {...register('breed')} />
        </div>
        <div className="form-group">
          <label className="label">Geburtsdatum</label>
          <input type="date" className="input" {...register('birth_date')} />
        </div>
        <div className="form-group">
          <label className="label">Geschlecht</label>
          <select className="input" {...register('gender')}>
            <option value="unknown">Unbekannt</option>
            <option value="male">Männlich</option>
            <option value="female">Weiblich</option>
          </select>
        </div>
        <div className="form-group">
          <label className="label">Gewicht (kg)</label>
          <input type="number" step="0.01" className="input" {...register('weight')} />
        </div>
        <div className="form-group">
          <label className="label">Farbe</label>
          <input className="input" {...register('color')} />
        </div>
        <div className="form-group col-span-2">
          <label className="label">Mikrochip-Nr.</label>
          <input className="input" {...register('microchip_id')} />
        </div>
        <div className="form-group col-span-2">
          <label className="label">Notizen</label>
          <textarea className="input" rows={3} {...register('notes')} />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Speichern...' : (pet ? 'Aktualisieren' : 'Anlegen')}
        </button>
      </div>
    </form>
  );
}

const genderLabels = { male: 'Männlich', female: 'Weiblich', unknown: '' };

export default function PetList() {
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [importing, setImporting] = useState(false);
  const importRef = useRef();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: pets = [], isLoading } = useQuery({ queryKey: ['pets'], queryFn: petsApi.getAll });

  const deleteMutation = useMutation({
    mutationFn: id => petsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries(['pets']); toast.success('Tier entfernt'); setDeleteTarget(null); },
    onError: () => toast.error('Fehler beim Löschen')
  });

  async function handleImport(file) {
    if (!file) return;
    setImporting(true);
    try {
      const pet = await backupApi.importPet(file);
      qc.invalidateQueries(['pets']);
      toast.success(`"${pet.name}" erfolgreich importiert!`);
      navigate(`/pets/${pet.id}`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Import fehlgeschlagen');
    } finally {
      setImporting(false);
      importRef.current.value = '';
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meine Tiere</h1>
          <p className="text-gray-500 text-sm mt-1">{pets.length} Tier{pets.length !== 1 ? 'e' : ''} angelegt</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={importRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={e => handleImport(e.target.files?.[0])}
          />
          <button
            onClick={() => importRef.current?.click()}
            disabled={importing}
            className="btn-secondary"
            title="Tier aus Export-ZIP importieren"
          >
            <Upload size={16} />
            {importing ? 'Importiere…' : 'Importieren'}
          </button>
          <button onClick={() => setModal({ type: 'new' })} className="btn-primary">
            <Plus size={16} /> Neues Tier
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 py-8">Lade...</p>
      ) : pets.length === 0 ? (
        <div className="card text-center py-16">
          <PawPrint size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500">Noch keine Tiere angelegt</h3>
          <button onClick={() => setModal({ type: 'new' })} className="btn-primary mt-4 mx-auto">
            <Plus size={16} /> Erstes Tier anlegen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pets.map(pet => (
            <div key={pet.id} className="card hover:shadow-md transition-shadow group">
              <Link to={`/pets/${pet.id}`}>
                <div className="flex flex-col items-center text-center mb-4">
                  {pet.photo_path ? (
                    <img src={pet.photo_path} alt={pet.name} className="w-20 h-20 rounded-full object-cover mb-3" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-2xl font-bold mb-3">
                      {pet.name[0].toUpperCase()}
                    </div>
                  )}
                  <h3 className="font-semibold text-gray-900 text-lg">{pet.name}</h3>
                  {pet.species && <p className="text-sm text-gray-500">{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>}
                  {pet.birth_date && <p className="text-xs text-gray-400 mt-1">{format(new Date(pet.birth_date), 'dd.MM.yyyy')}</p>}
                </div>
              </Link>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setModal({ type: 'edit', pet })} className="btn-secondary btn-sm flex-1">
                  <Pencil size={13} /> Bearbeiten
                </button>
                <button onClick={() => setDeleteTarget(pet)} className="btn-danger btn-sm">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal?.type === 'new' || modal?.type === 'edit'} onClose={() => setModal(null)} title={modal?.type === 'edit' ? 'Tier bearbeiten' : 'Neues Tier anlegen'} size="lg">
        <PetForm pet={modal?.pet} onClose={() => setModal(null)} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        title="Tier entfernen"
        message={`Möchtest du "${deleteTarget?.name}" wirklich entfernen? Alle Daten bleiben erhalten.`}
      />
    </div>
  );
}
