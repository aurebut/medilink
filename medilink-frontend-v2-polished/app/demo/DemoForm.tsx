'use client';

import { useRef, useState, type FormEvent } from 'react';
import { apiFetch, ApiError } from '@/lib/api';

export default function DemoForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const sending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    const data = new FormData(event.currentTarget);
    setStatus('sending');
    try {
      await apiFetch('/demo-requests', { method: 'POST', body: {
        firstName: String(data.get('firstName') || '').trim(),
        lastName: String(data.get('lastName') || '').trim(),
        email: String(data.get('email') || '').trim(),
        phone: String(data.get('phone') || '').trim(),
        organization: String(data.get('organization') || '').trim(),
        role: data.get('role'),
        interests: data.getAll('interests'),
        message: String(data.get('message') || '').trim(),
        consent: data.get('consent') === 'on',
        website: data.get('website'),
      } });
      setStatus('success');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429
        ? 'Vous avez effectué plusieurs demandes. Patientez quelques minutes avant de réessayer.'
        : 'Votre demande n’a pas pu être envoyée. Vérifiez votre connexion et réessayez.');
      setStatus('error');
    } finally { sending.current = false; }
  }
  if (status === 'success') return <div className="demo-success" role="status">
    <span className="demo-success-icon" aria-hidden="true">✓</span>
    <h3>Merci, votre demande est bien reçue.</h3>
    <p>Notre équipe vous recontactera pour convenir d’un créneau et préparer une démo adaptée à vos besoins.</p>
    <a className="demo-submit" href="/landing.html">Revenir à l’accueil <span aria-hidden="true">↗</span></a>
  </div>;
  return <form onSubmit={submit} className="demo-form" aria-busy={status === 'sending'}>
    <p className="demo-required">Les champs marqués d’un * sont obligatoires.</p>
    <div className="demo-fields">
      <label>Prénom *<input name="firstName" autoComplete="given-name" placeholder="Votre prénom" required maxLength={100} pattern=".*\S.*" /></label>
      <label>Nom *<input name="lastName" autoComplete="family-name" placeholder="Votre nom" required maxLength={100} pattern=".*\S.*" /></label>
      <label>Adresse e-mail *<input name="email" type="email" autoComplete="email" placeholder="vous@exemple.fr" required maxLength={254} /></label>
      <label>Téléphone <span className="demo-optional">(facultatif)</span><input name="phone" type="tel" autoComplete="tel" placeholder="06 12 34 56 78" maxLength={30} pattern="[+0-9\(\).\s\-]{6,30}" /></label>
      <label>Cabinet / établissement <span className="demo-optional">(facultatif)</span><input name="organization" autoComplete="organization" placeholder="Nom de votre structure" maxLength={200} /></label>
      <label>Vous êtes… *<select name="role" required defaultValue=""><option value="" disabled>Sélectionner votre profil</option><option>Médecin remplaçant</option><option>Médecin installé</option><option>Responsable d’établissement</option><option>Équipe RH / recrutement</option><option>Autre</option></select></label>
    </div>
    <fieldset><legend>Ce qui vous intéresse <span className="demo-optional">(facultatif)</span></legend><div className="demo-interests">{['Trouver une mission', 'Trouver un remplaçant', 'Organiser et suivre les remplacements'].map(interest => <label key={interest}><input type="checkbox" name="interests" value={interest} />{interest}</label>)}</div></fieldset>
    <label>Parlez-nous de vos besoins <span className="demo-optional">(facultatif)</span><textarea name="message" rows={3} maxLength={3000} placeholder="Votre organisation, vos attentes, les questions que vous aimeriez aborder…" /></label>
    <div className="demo-honeypot" aria-hidden="true"><label>Site internet<input name="website" tabIndex={-1} autoComplete="off" maxLength={200} /></label></div>
    <label className="demo-consent"><input name="consent" type="checkbox" required /><span>J’accepte que MédiLink utilise mes coordonnées pour me recontacter au sujet de ma demande de démo. *</span></label>
    <p className="demo-privacy">Ces informations servent uniquement au traitement de votre demande. Ne renseignez aucune donnée de patient.</p>
    {status === 'error' && <p className="demo-error" role="alert">{error}</p>}
    <button className="demo-submit" disabled={status === 'sending'} type="submit">{status === 'sending' ? 'Envoi en cours…' : 'Être recontacté(e)'}<span aria-hidden="true">↗</span></button>
  </form>;
}
