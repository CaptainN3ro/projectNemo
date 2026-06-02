import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useBranding() {
  const { data: branding = {} } = useQuery({
    queryKey: ['public-branding'],
    queryFn: () => fetch(`${API_BASE}/api/public/branding`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
    retry: false
  });

  useEffect(() => {
    const appName = branding.app_name || 'Project Nemo';

    document.title = branding.seo_title || appName;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = branding.seo_description || '';

    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.name = 'robots';
      document.head.appendChild(metaRobots);
    }
    metaRobots.content = branding.robots_index === false ? 'noindex, nofollow' : 'index, follow';

    if (branding.favicon_path) {
      let favicon = document.querySelector('link[rel="icon"]');
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = branding.favicon_path;
    }
  }, [branding]);

  return branding;
}
