'use client';

import { useState } from 'react';
import type { EstablishmentPhoto } from '@/lib/types';

export function PhotoCarousel({
  photos = [],
  alt = 'Photo de l’établissement',
}: {
  photos?: EstablishmentPhoto[];
  alt?: string;
}) {
  const [index, setIndex] = useState(0);

  if (!photos || photos.length === 0) return null;

  if (photos.length === 1) {
    const photo = photos[0];
    return (
      <div className="public-mission-photo">
        <img src={photo.url} alt={alt} />
      </div>
    );
  }

  function next() {
    setIndex((prev) => (prev + 1) % photos.length);
  }

  function prev() {
    setIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }

  return (
    <div className="public-mission-photo photo-carousel">
      <div className="carousel-track-wrapper">
        <div className="carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {photos.map((photo, i) => (
            <div key={photo.id} className="carousel-slide">
              <img src={photo.url} alt={`${alt} - ${i + 1}`} />
            </div>
          ))}
        </div>
      </div>

      <button type="button" className="carousel-btn prev" onClick={prev} aria-label="Photo précédente">
        ‹
      </button>
      <button type="button" className="carousel-btn next" onClick={next} aria-label="Photo suivante">
        ›
      </button>

      <div className="carousel-dots">
        {photos.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`carousel-dot ${i === index ? 'active' : ''}`}
            onClick={() => setIndex(i)}
            aria-label={`Aller à la photo ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
