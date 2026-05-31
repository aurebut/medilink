import Link from 'next/link';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function Button({
  children,
  variant = 'primary',
  block,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'light' | 'danger' | 'success';
  block?: boolean;
}) {
  return (
    <button className={`btn btn-${variant} ${block ? 'btn-block' : ''} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = 'primary',
  className = '',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'light' | 'danger' | 'success';
  className?: string;
}) {
  return (
    <Link className={`btn btn-${variant} ${className}`} href={href}>
      {children}
    </Link>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="select" {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />;
}

export function Alert({ children, type = 'info' }: { children: ReactNode; type?: 'info' | 'success' | 'error' }) {
  return <div className={`alert ${type}`}>{children}</div>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <Card>
      <div className="empty-illustration">＋</div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="actions">{action}</div> : null}
    </Card>
  );
}

export function LoadingCard({ label = 'Chargement...' }: { label?: string }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="loading-emblem" aria-hidden="true">
        <span className="loading-ring" />
        <span className="loading-mark">M</span>
      </div>
      <LoadingCopy label={label} />
    </div>
  );
}

export function LoadingInline({ label = 'Chargement...' }: { label?: string }) {
  return (
    <div className="loading-inline" role="status" aria-live="polite">
      <span className="loading-inline-pulse" aria-hidden="true" />
      <LoadingCopy label={label} />
    </div>
  );
}

function LoadingCopy({ label }: { label: string }) {
  return (
    <span className="loading-copy">
      <span>{label.replace(/\.{3}$/, '')}</span>
      <span className="loading-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

export function StatCard({
  label,
  value,
  helper,
  action,
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="stat-card">
      <div className="stat">
        <span>{label}</span>
        <strong>{value}</strong>
        {helper ? <div className="small">{helper}</div> : null}
        {action ? <div className="actions">{action}</div> : null}
      </div>
    </Card>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="progress" aria-label={`Progression ${safeValue}%`}>
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}
