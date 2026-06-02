import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import PluginFrame from '../components/PluginFrame';

export default function PluginPage() {
  const { name } = useParams();

  const { data: plugins = [] } = useQuery({
    queryKey: ['active-plugins'],
    queryFn: () => client.get('/plugins/active').then(r => r.data)
  });

  const plugin = plugins.find(p => p.name === name);

  if (plugins.length > 0 && !plugin) {
    return (
      <div className="p-8 text-center text-gray-500">
        Plugin "{name}" nicht gefunden oder deaktiviert.
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col">
      {plugin && (
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{plugin.shortName}</h1>
        </div>
      )}
      <div className="flex-1">
        <PluginFrame pluginName={name} file="index.html" title={plugin?.shortName} />
      </div>
    </div>
  );
}
