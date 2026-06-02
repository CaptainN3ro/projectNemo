/**
 * Renders a plugin's HTML in a sandboxed iframe.
 * The auth token and petId are passed as query params so the plugin's JS
 * can call the REST API directly.
 *
 * Plugin HTML files can access:
 *   const params = new URLSearchParams(window.location.search);
 *   const token  = params.get('token');
 *   const petId  = params.get('petId');   // only for pet-placement plugins
 */
export default function PluginFrame({ pluginName, file = 'index.html', petId = null, title }) {
  const token = localStorage.getItem('token') || '';
  const params = new URLSearchParams({ token });
  if (petId) params.set('petId', petId);

  const src = `/plugins/${pluginName}/html/${file}?${params.toString()}`;

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col">
      <iframe
        src={src}
        title={title || pluginName}
        className="w-full flex-1 rounded-xl border border-gray-100"
        style={{ minHeight: '600px' }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      />
    </div>
  );
}
