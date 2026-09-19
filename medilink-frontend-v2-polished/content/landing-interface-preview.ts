import captures from '@/public/landing-assets/interface/manifest.json';

type PreviewName = 'messages' | 'mission' | 'documents';

// Capture dimensions and cache keys are generated alongside the real app images.
// Arguments are repository-authored strings only, never API or user content.
export function interfacePreview(name: PreviewName, className: string, title: string, alt: string) {
  const desktop = captures.assets.find(asset => asset.name === name && asset.device === 'desktop')!;
  const mobile = captures.assets.find(asset => asset.name === name && asset.device === 'mobile')!;
  const source = (device: typeof desktop, retina = false) =>
    `/landing-assets/interface/${name}-${device.device}${retina ? '@2x' : ''}.webp?v=${device.sha256.slice(0, 12)}`;

  const previewStyle = name === 'documents' ? ` style="--ml-documents-preview-ratio:${mobile.width}/${mobile.previewHeight}"` : '';

  return `<figure class="${className} ml-interface-preview ml-interface-preview--${name}" aria-label="${title}"${previewStyle}>
    <a class="ml-interface-open" href="${source(desktop, true)}" target="_blank" rel="noopener" data-interface-preview="${name}" aria-label="Voir l’interface : ${title} (agrandir)">
      <span class="ml-interface-stage">
        <span class="ml-interface-window">
          <picture>
            <source media="(max-width: 700px)" srcset="${source(mobile)} 1x, ${source(mobile, true)} 2x" width="${mobile.width}" height="${mobile.height}">
            <img src="${source(desktop)}" srcset="${source(desktop)} 1x, ${source(desktop, true)} 2x" width="${desktop.width}" height="${desktop.height}" alt="${alt}" loading="lazy" decoding="async">
          </picture>
        </span>
      </span>
    </a>
  </figure>`;
}
