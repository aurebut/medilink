'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Alert, Button, Field, Input, Select } from '@/components/ui';
import { defaultRouteForUser } from '@/lib/routes';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [accountType, setAccountType] = useState<'candidate' | 'establishment'>('candidate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        phone,
      });
      router.push(defaultRouteForUser(user));
    } catch (err: any) {
      setError(err.message || 'Inscription impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card form" onSubmit={submit}>
        <Link className="brand" href="/"><span className="brand-mark">M</span><span>Medilink</span></Link>
        <div>
          <h1>Creer un compte</h1>
          <p>Choisis le type de compte pour acceder directement a ton espace.</p>
        </div>
        {error ? <Alert type="error">{error}</Alert> : null}
        <Field label="Type de compte">
          <Select value={accountType} onChange={(e) => setAccountType(e.target.value as any)}>
            <option value="candidate">Candidat medical</option>
            <option value="establishment">Etablissement / recruteur</option>
          </Select>
        </Field>
        <div className="form-row">
          <Field label="Prenom"><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
          <Field label="Nom"><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
        </div>
        <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Telephone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        <Field label="Mot de passe"><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Button block disabled={loading}>{loading ? 'Creation...' : 'Creer le compte'}</Button>
        <Link href="/login" className="small">J'ai deja un compte</Link>
      </form>
    </main>
  );
}
