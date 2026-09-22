import captures from '@/public/landing-assets/interface/manifest.json';
import personaCaptures from '@/public/landing-assets/persona-interface/manifest.json';

type PreviewName = 'messages' | 'mission' | 'documents' | 'search' | 'offer' | 'candidates' | 'report';

// Capture dimensions and cache keys are generated alongside the real app images.
// Arguments are repository-authored strings only, never API or user content.
export function interfacePreview(name: PreviewName, className: string, title: string, alt: string) {
  const persona = ['search', 'offer', 'candidates', 'report'].includes(name);
  const assets = persona ? personaCaptures.assets : captures.assets;
  const desktop = assets.find(asset => asset.name === name && asset.device === 'desktop')!;
  const mobile = assets.find(asset => asset.name === name && asset.device === 'mobile')!;
  const directory = persona ? 'persona-interface' : 'interface';
  const source = (device: typeof desktop, retina = false) =>
    `/landing-assets/${directory}/${name}-${device.device}${retina ? '@2x' : ''}.webp?v=${device.sha256.slice(0, 12)}`;
  const sourceSet = (device: typeof desktop) => device.sourceScale === 2
    ? `${source(device)} 1x, ${source(device, true)} 2x` : `${source(device)} 1x`;

  const previewStyle = name === 'documents' ? ` style="--ml-documents-preview-ratio:${mobile.width}/${mobile.previewHeight}"` : '';
  const scrollAttributes = name === 'mission' ? '' : ` tabindex="0" role="group" aria-label="${title} — aperçu défilable${name === 'messages' ? ' sur mobile' : ''}"`;

  return `<figure class="${className} ml-interface-preview ml-interface-preview--${name}" aria-label="${title}"${previewStyle}>
    <div class="ml-interface-display" data-interface-preview="${name}">
      <span class="ml-interface-stage">
        <span class="ml-interface-window">
          <span class="ml-device-camera" aria-hidden="true"></span>
          <span class="ml-device-screen">
            <span class="ml-device-status" aria-hidden="true"><span>9:41</span><span class="ml-device-island"></span><span class="ml-device-indicators"><svg viewBox="0 0 40 12" fill="currentColor"><path d="M0 8h2v4H0zm4-3h2v7H4zm4-2h2v9H8zm4-3h2v12h-2z"/><rect x="20" y="1" width="16" height="10" rx="3" fill="none" stroke="currentColor"/><rect x="22" y="3" width="12" height="6" rx="1"/><path d="M38 4h2v4h-2z"/></svg></span></span>
            <span class="ml-macos-window">
              <span class="ml-macos-toolbar" aria-hidden="true"><span class="ml-macos-lights"><span></span><span></span><span></span></span><span class="ml-macos-title">MédiLink</span></span>
              <picture${scrollAttributes} style="--ml-capture-width:${desktop.width};--ml-capture-height:${desktop.height};--ml-mobile-capture-width:${mobile.width};--ml-mobile-capture-height:${mobile.height}">
                <source media="(max-width: 700px)" srcset="${sourceSet(mobile)}" width="${mobile.width}" height="${mobile.height}">
                <img src="${source(desktop)}" srcset="${sourceSet(desktop)}" width="${desktop.width}" height="${desktop.height}" alt="${alt}" loading="lazy" decoding="async">
              </picture>
            </span>
            <span class="ml-device-home" aria-hidden="true"></span>
          </span>
          <span class="ml-device-buttons" aria-hidden="true"></span>
        </span>
        <span class="ml-device-base" aria-hidden="true"></span>
      </span>
    </div>
  </figure>`;
}
