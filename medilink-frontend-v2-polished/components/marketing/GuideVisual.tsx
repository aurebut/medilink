/* eslint-disable @next/next/no-img-element -- Editorial images are pre-sized WebP assets with explicit responsive variants. */
import type { GuideImage } from '@/content/guide-types';

export function GuideVisual({ image, priority = false, caption = false }: { image: GuideImage; priority?: boolean; caption?: boolean }) {
  return <figure className="guide-visual">
    <img src={image.src} srcSet={`${image.src.replace('.webp', '-640.webp')} 640w, ${image.src} 1600w`} sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 800px) calc(100vw - 64px), 540px" alt={image.alt} width={1600} height={1000} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding="async" />
    {caption && <figcaption>{image.creditUrl ? <a href={image.creditUrl}>{image.credit}</a> : image.credit}</figcaption>}
  </figure>;
}
