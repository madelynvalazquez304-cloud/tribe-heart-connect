import { useEffect } from 'react';
import { useSiteSettings } from './useSiteSettings';

/**
 * Replaces ALL favicon-related <link> tags in <head> with the URL configured
 * in admin → site branding. Falls back to the default if none is set.
 * Also keeps the document.title in sync with the configured site name so
 * search engines never see the default placeholder.
 */
export const useFaviconSync = () => {
  const { data: site } = useSiteSettings();

  useEffect(() => {
    if (!site) return;

    const url = site.site_favicon_url || site.site_logo_url;
    if (url) {
      // Remove every existing icon link so nothing else can win the race.
      document
        .querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
        .forEach((el) => el.parentNode?.removeChild(el));

      const ext = url.split('.').pop()?.toLowerCase().split('?')[0] || 'png';
      const mime = ext === 'svg' ? 'image/svg+xml'
        : ext === 'ico' ? 'image/x-icon'
        : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : 'image/png';

      const cacheBusted = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;

      const icon = document.createElement('link');
      icon.rel = 'icon';
      icon.type = mime;
      icon.href = cacheBusted;
      document.head.appendChild(icon);

      const shortcut = document.createElement('link');
      shortcut.rel = 'shortcut icon';
      shortcut.type = mime;
      shortcut.href = cacheBusted;
      document.head.appendChild(shortcut);

      const apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      apple.href = cacheBusted;
      document.head.appendChild(apple);
    }

    if (site.site_name) {
      document.title = site.site_name;
      const setMeta = (selector: string, content: string) => {
        const el = document.querySelector(selector) as HTMLMetaElement | null;
        if (el) el.content = content;
      };
      setMeta('meta[name="description"]', site.site_tagline || site.footer_description || '');
      setMeta('meta[property="og:title"]', site.site_name);
      setMeta('meta[name="twitter:title"]', site.site_name);
      // Strip any default author tag pointing at the platform.
      const author = document.querySelector('meta[name="author"]');
      if (author) author.parentNode?.removeChild(author);
    }
  }, [site]);
};