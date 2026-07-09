'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AuthPage } from '@/components/AuthPage';
import { Alert, Button, Field, Input, Select } from '@/components/ui';
import { defaultRouteForUser } from '@/lib/routes';
import type { CandidateGender } from '@/lib/types';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [accountType, setAccountType] = useState<'candidate' | 'establishment'>('candidate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [candidateGender, setCandidateGender] = useState<CandidateGender | ''>('');
  const [phone, setPhone] = useState('');
  const [rpps, setRpps] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const requestedType = new URLSearchParams(window.location.search).get('type');
    if (requestedType === 'candidate' || requestedType === 'establishment') {
      setAccountType(requestedType);
    }
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await register({
        accountType,
        email,
        password,
        firstName,
        lastName,
        candidateGender: accountType === 'candidate' ? candidateGender || undefined : undefined,
        phone,
        rpps: accountType === 'candidate' ? rpps || undefined : undefined,
      });
      router.push(defaultRouteForUser(user));
    } catch (err: any) {
      setError(err.message || 'Inscription impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPage
      eyebrow="Bienvenue sur MédiLink"
      title="Créer un compte"
      description="Rejoignez la plateforme pensée pour les remplacements en médecine générale."
      onSubmit={submit}
      footer={<Link href="/login" className="small auth-card-footer-strong">J&apos;ai déjà un compte</Link>}
    >
        {error ? <Alert type="error">{error}</Alert> : null}
        <Field label="Type de compte">
          <Select value={accountType} onChange={(e) => setAccountType(e.target.value as any)}>
            <option value="candidate">Candidat médical</option>
            <option value="establishment">Établissement / recruteur</option>
          </Select>
        </Field>
        <div className="form-row">
          <Field label="Prénom"><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
          <Field label="Nom"><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
        </div>
        {accountType === 'candidate' ? (
          <>
            <Field label="Sexe / accord grammatical">
              <Select value={candidateGender} onChange={(e) => setCandidateGender(e.target.value as CandidateGender | '')}>
                <option value="">Sélectionner</option>
                <option value="FEMININE">Féminin</option>
                <option value="MASCULINE">Masculin</option>
              </Select>
            </Field>
            <Field label="Numero RPPS (facultatif)">
              <Input
                inputMode="numeric"
                value={rpps}
                onChange={(e) => setRpps(e.target.value)}
                placeholder="Ex : 10001234567"
              />
            </Field>
          </>
        ) : null}
        <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@example.com" /></Field>
        <Field label="Téléphone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" /></Field>
        <Field label="Mot de passe"><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" /></Field>
        <Button block disabled={loading}>{loading ? 'Création...' : 'Créer le compte'}</Button>
    </AuthPage>
  );
}
