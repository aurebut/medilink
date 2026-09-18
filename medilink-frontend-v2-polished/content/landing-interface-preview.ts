import captures from '@/public/landing-assets/interface/manifest.json';

type PreviewName = 'messages' | 'mission' | 'documents';

// Capture dimensions and cache keys are generated alongside the real app images.
// Arguments are repository-authored strings only, never API or user content.
export function interfacePreview(name: PreviewName, className: string, title: string, alt: string) {
  const desktop = captures.assets.find(asset => asset.name === name && asset.device === 'desktop')!;
  const mobile = captures.assets.find(asset => asset.name === name && asset.device === 'mobile')!;
  const source = (device: typeof desktop, retina = false) =>
    `/landing-assets/interface/${name}-${device.device}${retina ? '@2x' : ''}.webp?v=${device.sha256.slice(0, 12)}`;

  return `<figure class="${className} ml-interface-preview" aria-labelledby="ml-${name}-preview-title">
    <div class="ml-interface-heading"><span id="ml-${name}-preview-title">${title}</span><span>MédiLink</span></div>
    <a class="ml-interface-open" href="${source(desktop, true)}" target="_blank" rel="noopener" data-interface-preview="${name}" aria-label="Agrandir l’aperçu : ${title}">
      <picture>
        <source media="(max-width: 700px)" srcset="${source(mobile)} 1x, ${source(mobile, true)} 2x" width="${mobile.width}" height="${mobile.height}">
        <img src="${source(desktop)}" srcset="${source(desktop)} 1x, ${source(desktop, true)} 2x" width="${desktop.width}" height="${desktop.height}" alt="${alt}" loading="lazy" decoding="async">
      </picture>
      <span class="ml-interface-enlarge"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/></svg>Agrandir</span>
    </a>
    <figcaption>Interface MédiLink · Données de démonstration</figcaption>
  </figure>`;
}
