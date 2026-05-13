import Link from 'next/link';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Button({ children, variant = 'primary', block, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'light' | 'danger' | 'success'; block?: boolean }) {
  return <button className={`btn btn-${variant} ${block ? 'btn-block' : ''} ${className}`} {...props}>{children}</button>;
}

export function LinkButton({ href, children, variant = 'primary' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'light' | 'danger' | 'success' }) {
  return <Link className={`btn btn-${variant}`} href={href}>{children}</Link>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span className="label">{label}</span>{children}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input className="input" {...props} />; }
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select className="select" {...props} />; }
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className="textarea" {...props} />; }

export function Alert({ children, type = 'info' }: { children: ReactNode; type?: 'info' | 'success' | 'error' }) {
  return <div className={`alert ${type}`}>{children}</div>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <div className="page-header"><div><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{actions}</div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <Card><h3>{title}</h3>{description ? <p>{description}</p> : null}{action ? <div className="actions">{action}</div> : null}</Card>;
}

export function LoadingCard({ label = 'Chargement...' }: { label?: string }) {
  return <Card><p className="muted">{label}</p></Card>;
}
