import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link2, RefreshCw, Copy, Check, ExternalLink, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { calendarApi } from '../api/pets';
import Modal from '../components/UI/Modal';

const typeLabels = { vet_visit: 'Tierarzt', vaccination: 'Impfung fällig', event: 'Ereignis' };

function IcsSyncPanel() {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(null); // 'ics' | 'webcal'

  const { data: tokenData, isLoading } = useQuery({
    queryKey: ['ics-token'],
    queryFn: calendarApi.getIcsToken
  });

  const refreshMutation = useMutation({
    mutationFn: calendarApi.refreshIcsToken,
    onSuccess: () => { qc.invalidateQueries(['ics-token']); toast.success('URL erneuert'); }
  });

  function copyToClipboard(text, type) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      toast.success('Kopiert!');
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function CopyButton({ text, type, label }) {
    const isCopied = copied === type;
    return (
      <button
        onClick={() => copyToClipboard(text, type)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
      >
        {isCopied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
        {isCopied ? 'Kopiert!' : label}
      </button>
    );
  }

  if (isLoading) return <div className="text-sm text-gray-400">Lade...</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Abonniere deinen Kalender in Apple Kalender, Google Calendar, Outlook oder jeder anderen App, die ICS/WebCal unterstützt.
        Der Link enthält alle Tierarzttermine, Impfungen und Ereignisse.
      </p>

      <div className="space-y-3">
        {/* ICS URL */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">ICS-URL</p>
          <div className="flex gap-2 items-center">
            <input
              readOnly
              value={tokenData?.icsUrl || ''}
              className="input text-xs flex-1 bg-gray-50 font-mono"
            />
            <CopyButton text={tokenData?.icsUrl || ''} type="ics" label="Kopieren" />
          </div>
          <p className="text-xs text-gray-400 mt-1">Zum Abonnieren in Kalender-Apps (https://…)</p>
        </div>

        {/* WebCal URL */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Webcal-URL</p>
          <div className="flex gap-2 items-center">
            <input
              readOnly
              value={tokenData?.webcalUrl || ''}
              className="input text-xs flex-1 bg-gray-50 font-mono"
            />
            <CopyButton text={tokenData?.webcalUrl || ''} type="webcal" label="Kopieren" />
            <a
              href={tokenData?.webcalUrl || ''}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
              title="Direkt in Kalender-App öffnen"
            >
              <ExternalLink size={12} /> Öffnen
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-1">Direkter Klick öffnet die Standard-Kalender-App</p>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Der Link enthält alle Ereignisse der letzten 6 Monate + alle zukünftigen Termine.
        </p>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors"
          title="URL ungültig machen und neu generieren"
        >
          <RefreshCw size={12} className={refreshMutation.isPending ? 'animate-spin' : ''} />
          URL erneuern
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
        <strong>Hinweis:</strong> Mit „URL erneuern" wird der alte Link ungültig. Bestehende Kalender-Abonnements müssen dann neu eingerichtet werden.
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showSync, setShowSync] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['calendar', currentDate.getFullYear(), currentDate.getMonth() + 1],
    queryFn: () => calendarApi.getEvents({ year: currentDate.getFullYear(), month: currentDate.getMonth() + 1 })
  });

  const calEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: e.color,
    borderColor: e.color,
    extendedProps: e
  }));

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
          <p className="text-gray-500 text-sm mt-1">Alle Termine und Ereignisse deiner Tiere</p>
        </div>
        <button onClick={() => setShowSync(true)} className="btn-secondary flex items-center gap-2">
          <CalendarDays size={16} /> Kalender synchronisieren
        </button>
      </div>

      <div className="card">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={deLocale}
          events={calEvents}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
          eventClick={info => setSelectedEvent(info.event.extendedProps)}
          datesSet={arg => setCurrentDate(arg.view.currentStart)}
          height="auto"
        />
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-4 flex-wrap text-sm">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" /> Zukünftiger Tierarzttermin</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-500 shrink-0" /> Vergangener Tierarztbesuch</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" /> Impfung fällig</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" /> Ereignis</div>
      </div>

      {/* Event detail modal */}
      <Modal open={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={selectedEvent?.title || ''} size="sm">
        {selectedEvent && (
          <div className="space-y-3 text-sm">
            <div><span className="label">Tier</span><p>{selectedEvent.petName}</p></div>
            <div><span className="label">Typ</span><p>{typeLabels[selectedEvent.type] || selectedEvent.type}</p></div>
            <div>
              <span className="label">Datum</span>
              <p>{format(new Date(selectedEvent.start), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
            </div>
            {selectedEvent.data?.reason && <div><span className="label">Grund</span><p>{selectedEvent.data.reason}</p></div>}
            {selectedEvent.data?.description && <div><span className="label">Beschreibung</span><p>{selectedEvent.data.description}</p></div>}
          </div>
        )}
      </Modal>

      {/* ICS sync modal */}
      <Modal open={showSync} onClose={() => setShowSync(false)} title="Kalender synchronisieren" size="md">
        <IcsSyncPanel />
      </Modal>
    </div>
  );
}
