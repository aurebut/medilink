'use client';

import Link from 'next/link';
import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type ComponentProps,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
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
  ...props
}: Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'light' | 'danger' | 'success';
  className?: string;
}) {
  return (
    <Link className={`btn btn-${variant} ${className}`} href={href} {...props}>
      {children}
    </Link>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

type FieldControlProps = {
  id?: string;
  required?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'false' | 'true' | 'grammar' | 'spelling';
};

export function Field({
  label,
  children,
  id,
  description,
  error,
  required,
}: {
  label: ReactNode;
  children: ReactNode;
  id?: string;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
}) {
  const generatedId = useId();
  const child = isValidElement(children) ? children as ReactElement<FieldControlProps> : null;
  const controlId = id || child?.props.id || `field-${generatedId}`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [
    child?.props['aria-describedby'],
    descriptionId,
    errorId,
  ].filter(Boolean).join(' ') || undefined;
  const isRequired = required ?? child?.props.required;
  const control = child
    ? cloneElement(child, {
        id: controlId,
        required: isRequired,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : child.props['aria-invalid'],
      })
    : children;

  return (
    <div className="field">
      <label className="label" htmlFor={controlId}>
        {label}
        {isRequired ? (
          <>
            <span className="required-indicator" aria-hidden="true"> *</span>
            <span className="sr-only"> (requis)</span>
          </>
        ) : null}
      </label>
      {description ? <div id={descriptionId} className="field-description">{description}</div> : null}
      {control}
      {error ? <div id={errorId} className="field-error" role="alert">{error}</div> : null}
    </div>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...props} />;
}

export function PasswordInput({
  className = '',
  id,
  style,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const generatedId = useId();
  const inputId = id || `password-${generatedId}`;

  return (
    <div className="password-input-wrap">
      <input
        className={`input password-input ${className}`}
        {...props}
        id={inputId}
        type={show ? 'text' : 'password'}
        style={style}
      />
      <button
        type="button"
        className="password-visibility-toggle"
        aria-controls={inputId}
        aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={show}
        onClick={() => setShow((visible) => !visible)}
      >
        {show ? (
          <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
            <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
            <line x1="2" y1="2" x2="22" y2="22"/>
          </svg>
        ) : (
          <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  );
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`select ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`textarea ${className}`} {...props} />;
}

export function Alert({ children, type = 'info' }: { children: ReactNode; type?: 'info' | 'success' | 'error' }) {
  return (
    <div
      className={`alert ${type}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {children}
    </div>
  );
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
    <div className="loading-state" role="status" aria-label={label}>
      <LoadingEmblem />
    </div>
  );
}

export function LoadingInline({ label = 'Chargement...' }: { label?: string }) {
  return (
    <div className="loading-inline" role="status" aria-label={label}>
      <LoadingEmblem compact />
    </div>
  );
}

export function PlatformSplash({ label = 'Préparation de votre espace' }: { label?: string }) {
  return (
    <div className="platform-splash" role="status" aria-label={label}>
      <div className="platform-splash-panel">
        <div className="platform-splash-brand">
          <span>Médi<em>Link</em></span>
        </div>
        <LoadingEmblem />
        <div className="platform-splash-copy">
          <strong>{label}</strong>
        </div>
      </div>
    </div>
  );
}

function LoadingEmblem({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`loading-emblem ${compact ? 'compact' : ''}`} aria-hidden="true">
      <span className="loading-ring" />
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

export function ProgressBar({ value, label = 'Progression' }: { value: number; label?: string }) {
  const safeValue = Math.max(0, Math.min(100, value || 0));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
      aria-valuetext={`${safeValue} %`}
    >
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}
