'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowDownToLine, ArrowUpRight, ChevronLeft, ChevronRight, FileCheck2, FileText, FolderOpen, History, Mail, Plus, Send, Settings2, ShieldCheck, Upload, X } from 'lucide-react';
import { api, apiFetch, ApiError, getApiUrl, isMockStorageUrl, openDocumentPreviewWindow, showDocumentInPreview } from '@/lib/api';
import { errorMessage } from '@/lib/user-facing';
import { currentDossierDocument, dossierCategories, dossierCategoryFor, dossierDate, dossierDocumentHints, dossierDocumentIsCurrent, dossierDocumentLabels, dossierFieldLabels, dossierKindAllowsMultiple, dossierRecipientLabels, dossierUploadKinds, type DossierCategory, type DossierDocument, type DossierDocumentKind, type DossierRecipientType, type DossierUploadKind, type ReplacementDetails, type ReplacementDossierData } from '@/lib/replacement-dossier';
import { Alert, Button, Field, Input, Select, Textarea } from '@/components/ui';

type UploadResponse = { documentId: string; uploadUrl: string; method: string; headers: Record<string, string> };
type Panel = 'details' | 'upload' | 'send' | 'manage' | null;
type RegisterRow = { kind: DossierDocumentKind; document?: DossierDocument } | { kind: 'PLATFORM_RECEIPT' };
const PAGE_SIZE = 3;

export function ReplacementDossier({ applicationId, viewer, conversationId, paymentReleased = false }: { applicationId: string; viewer: 'candidate' | 'establishment'; conversationId?: string; paymentReleased?: boolean }) {
  const path = `/applications/${applicationId}/dossier`;
  const registerId = useId();
  const [category, setCategory] = useState<DossierCategory>('replacement');
  const [registerPage, setRegisterPage] = useState(0);
  const [revealedDocumentId, setRevealedDocumentId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<ReplacementDossierData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [managedKind, setManagedKind] = useState<DossierDocumentKind>('CONTRACT');
  const [managedId, setManagedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReplacementDetails | null>(null);
  const [editConflict, setEditConflict] = useState(false);
  const [uploadKind, setUploadKind] = useState<DossierUploadKind>('SIGNED_CONTRACT');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [expiry, setExpiry] = useState('');
  const [recipientType, setRecipientType] = useState<DossierRecipientType>('COUNTERPART');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendMessage, setSendMessage] = useState('');
  const [sendConfirmed, setSendConfirmed] = useState(false);
  const idempotency = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    setDossier(null); setPanel(null); setError(null); setNotice(null); setCategory('replacement'); setRegisterPage(0); setRevealedDocumentId(null);
    void api.reload<ReplacementDossierData>(path).then((data) => { if (active) setDossier(data); }).catch((cause) => { if (active) setError(errorMessage(cause)); });
    return () => { active = false; };
  }, [path]);

  useEffect(() => {
    if (panel) { panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); panelRef.current?.focus({ preventScroll: true }); }
  }, [panel, managedKind, managedId]);

  const sendingPending = dossier?.deliveries.some((delivery) => delivery.status === 'SENDING');
  useEffect(() => {
    if (!sendingPending) return;
    let active = true;
    const timer = window.setInterval(() => {
      void api.reload<ReplacementDossierData>(path).then((data) => { if (active) setDossier(data); }).catch(() => undefined);
    }, 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [path, sendingPending]);

  async function refresh() { const data = await api.reload<ReplacementDossierData>(path); setDossier(data); return data; }

  async function run(action: string, operation: () => Promise<void>) {
    setBusy(action); setError(null); setNotice(null);
    try { await operation(); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        await refresh().catch(() => undefined);
        if (action === 'save') setEditConflict(true);
        setError(`${errorMessage(cause)} Le dossier a été actualisé. ${action === 'save' ? 'Rechargez les informations du formulaire pour reprendre la dernière version avant de modifier à nouveau.' : 'Vérifiez les informations avant de réessayer.'}`);
      } else setError(errorMessage(cause));
    } finally { setBusy(null); }
  }

  function rememberPanelTrigger() { if (!panel && document.activeElement instanceof HTMLElement) panelTriggerRef.current = document.activeElement; }
  function closePanel() { setPanel(null); window.requestAnimationFrame(() => panelTriggerRef.current?.focus({ preventScroll: false })); }
  function openDetails() { if (!dossier) return; rememberPanelTrigger(); setDraft({ ...dossier.details }); setEditConflict(false); setPanel('details'); setError(null); }
  function openUpload(kind: DossierUploadKind) { rememberPanelTrigger(); setUploadKind(kind); setUploadFile(null); setUploadInputKey((value) => value + 1); setExpiry(''); setPanel('upload'); setError(null); }
  function openManage(kind: DossierDocumentKind, documentId?: string) { rememberPanelTrigger(); setManagedKind(kind); setManagedId(documentId || null); setPanel('manage'); setError(null); }
  function changeCategory(next: DossierCategory) { setCategory(next); setRegisterPage(0); setRevealedDocumentId(null); }
  function changePage(next: number) { setRegisterPage(next); setRevealedDocumentId(null); }

  async function generate(kind: 'CONTRACT' | 'DECLARATION') {
    if (!dossier) return;
    if (kind === 'CONTRACT' && dossier.missingFields.length) { openDetails(); setError('Complétez les informations du remplacement avant de générer le document.'); return; }
    await run(kind, async () => { await api.postSilent(`${path}/generate`, { kind, revision: dossier.revision }); await refresh(); setNotice('Le PDF est prêt. Relisez-le avant signature ou transmission.'); });
  }

  async function preview(document: DossierDocument) {
    const previewWindow = openDocumentPreviewWindow();
    await run(`preview-${document.id}`, async () => {
      try {
        const result = await api.reload<{ downloadUrl: string }>(`${path}/documents/${document.id}/download-url`);
        if (isMockStorageUrl(result.downloadUrl)) throw new Error('Le fichier n’est pas disponible dans cet environnement.');
        showDocumentInPreview(result.downloadUrl, previewWindow);
      } catch (cause) { previewWindow?.close(); throw cause; }
    });
  }

  async function download(file: DossierDocument) {
    await run(`download-${file.id}`, async () => {
      const { downloadUrl } = await api.reload<{ downloadUrl: string }>(`${path}/documents/${file.id}/download-url`);
      if (isMockStorageUrl(downloadUrl)) throw new Error('Le fichier n’est pas disponible dans cet environnement.');
      const response = await fetch(downloadUrl, { credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error('Le téléchargement a échoué. Réessayez.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url; link.download = file.fileName;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }

  async function downloadPaymentReceipt() {
    if (!conversationId || !paymentReleased) return;
    await run('payment-receipt', async () => {
      const type = viewer === 'candidate' ? 'candidate' : 'recruiter';
      const response = await fetch(getApiUrl(`/conversations/${conversationId}/invoices/${type}.pdf`), { credentials: 'include', cache: 'no-store' });
      if (!response.ok) throw new Error('Le justificatif de règlement n’est pas disponible. Réessayez depuis le suivi du paiement.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url; link.download = `justificatif-medilink-${applicationId}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }

  async function saveDetails(event: FormEvent) {
    event.preventDefault();
    if (!dossier || !draft || editConflict) return;
    if (draft.endDate && draft.startDate && draft.endDate < draft.startDate) { setError('Le dernier jour doit être égal ou postérieur au premier jour.'); return; }
    await run('save', async () => {
      await apiFetch(path, { method: 'PUT', body: { revision: dossier.revision, details: draft }, invalidateCache: false });
      await refresh(); closePanel(); setNotice('Informations enregistrées. Les documents déjà générés restent disponibles dans l’historique.');
    });
  }

  async function upload(event: FormEvent) {
    event.preventDefault(); if (!dossier || !uploadFile) return;
    if (uploadFile.size > 10 * 1024 * 1024) { setError('Le fichier doit faire moins de 10 Mo.'); return; }
    await run('upload', async () => {
      const result = await api.postSilent<UploadResponse>(`${path}/upload-url`, { kind: uploadKind, fileName: uploadFile.name, mimeType: uploadFile.type, sizeBytes: uploadFile.size, revision: dossier.revision, ...(expiry ? { expiresAt: expiry } : {}) });
      if (isMockStorageUrl(result.uploadUrl)) throw new Error('Le stockage de fichiers n’est pas disponible dans cet environnement.');
      const sent = await fetch(result.uploadUrl, { method: result.method, headers: result.headers, body: uploadFile });
      if (!sent.ok) throw new Error('Le fichier n’a pas pu être transféré. Réessayez.');
      await api.postSilent(`${path}/documents/${result.documentId}/confirm`, {});
      await refresh(); closePanel(); changeCategory(dossierCategoryFor(uploadKind)); setRevealedDocumentId(result.documentId); setNotice('La pièce a été ajoutée au dossier partagé.');
    });
  }

  function changeRecipient(type: DossierRecipientType) {
    if (!dossier) return;
    setRecipientType(type);
    setRecipientName(type === 'ORDER' ? dossier.details.orderCouncilName : type === 'COUNTERPART' ? viewer === 'candidate' ? dossier.details.holderName : dossier.details.replacementName : '');
    setRecipientEmail(type === 'ORDER' ? dossier.details.orderEmail : type === 'COUNTERPART' ? viewer === 'candidate' ? dossier.details.holderEmail : dossier.details.replacementEmail : '');
    resetSendConfirmation();
  }

  function resetSendConfirmation() { setSendConfirmed(false); idempotency.current = null; }

  function openSend(document?: DossierDocument) {
    if (!dossier) return;
    rememberPanelTrigger();
    changeRecipient(document?.kind === 'DECLARATION' ? 'ORDER' : document?.kind === 'REPLACEMENT_CERTIFICATE' ? 'CPAM' : 'COUNTERPART');
    setSelectedIds(document ? [document.id] : []); setSendMessage(''); setPanel('send'); setError(null);
  }

  async function send(event: FormEvent) {
    event.preventDefault(); if (!dossier || !sendConfirmed || !selectedIds.length) return;
    if (dossier.documents.filter((document) => selectedIds.includes(document.id)).reduce((total, document) => total + document.sizeBytes, 0) > 20 * 1024 * 1024) { setError('Les pièces sélectionnées dépassent 20 Mo. Sélectionnez moins de fichiers pour cet envoi.'); return; }
    await run('send', async () => {
      idempotency.current ||= crypto.randomUUID();
      const current = await api.postSilent<ReplacementDossierData>(`${path}/send`, { documentIds: selectedIds, recipientEmail, recipientName, recipientType, message: sendMessage || undefined, idempotencyKey: idempotency.current });
      setDossier(current);
      const delivery = current.deliveries.find((item) => item.idempotencyKey === idempotency.current);
      if (delivery?.status === 'FAILED') throw new Error('L’envoi a échoué. Le dossier est conservé, vous pouvez réessayer avec les mêmes pièces.');
      if (!delivery) throw new Error('L’état de cet envoi n’a pas pu être confirmé. Actualisez l’historique ou réessayez : la même demande sera vérifiée.');
      closePanel(); setNotice(delivery.status === 'SENT' ? `Le dossier a été envoyé à ${recipientEmail}. L’envoi ne vaut pas validation par le destinataire.` : 'L’envoi est en cours. Son état figure dans l’historique.');
    });
  }

  async function remove(document: DossierDocument) {
    if (!window.confirm(`Supprimer « ${document.fileName} » du dossier ?`)) return;
    await run(`delete-${document.id}`, async () => { await api.delete(`${path}/documents/${document.id}`); await refresh(); setNotice('Pièce supprimée du dossier.'); });
  }

  if (!dossier) return <section className="replacement-dossier rd-loading" aria-busy={!error}><FolderOpen size={27} /><h3>Dossier du remplacement</h3>{error ? <><Alert type="error">{error}</Alert><Button variant="light" onClick={() => void run('reload', async () => { await refresh(); })}>Réessayer</Button></> : <p>Ouverture du dossier partagé…</p>}</section>;

  const contract = currentDossierDocument(dossier, 'CONTRACT');
  const signed = currentDossierDocument(dossier, 'SIGNED_CONTRACT');
  const currentSigned = signed && dossierDocumentIsCurrent(signed, dossier) ? signed : undefined;
  const activeContract = currentSigned || contract || signed;
  const supportingKinds: DossierDocumentKind[] = dossier.details.replacementKind === 'STUDENT' ? ['DECLARATION', 'LICENSE', 'AUTHORIZATION', 'INSURANCE'] : ['DECLARATION', 'REGISTRATION', 'INSURANCE'];
  const ready = dossier.documents.filter((document) => document.status === 'READY');
  const availableToSend = ready.filter((document) => dossierDocumentIsCurrent(document, dossier));
  const disabled = Boolean(busy);
  const kindsByCategory: Record<DossierCategory, DossierDocumentKind[]> = {
    replacement: ['CONTRACT', ...supportingKinds],
    payment: ['BANK_DETAILS', 'FEE_STATEMENT', 'PAYMENT_PROOF'],
    additional: ['ADDENDUM', 'REPLACEMENT_CERTIFICATE', 'ORDER_RESPONSE', 'OTHER'],
  };
  const rowsByCategory = Object.fromEntries(dossierCategories.map(({ id }) => {
    const rows: RegisterRow[] = kindsByCategory[id].flatMap((kind): RegisterRow[] => {
      if (dossierKindAllowsMultiple(kind)) {
        const files = ready.filter(document => document.kind === kind).sort((a, b) => b.version - a.version);
        if (files.length) return files.map(document => ({ kind, document }));
        if (kind === 'OTHER') return [];
      }
      return [{ kind, document: kind === 'CONTRACT' ? activeContract : currentDossierDocument(dossier, kind) }];
    });
    if (id === 'payment' && conversationId && paymentReleased) rows.unshift({ kind: 'PLATFORM_RECEIPT' });
    return [id, rows];
  })) as Record<DossierCategory, RegisterRow[]>;
  const rows = rowsByCategory[category];
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const revealedIndex = revealedDocumentId ? rows.findIndex(row => row.kind !== 'PLATFORM_RECEIPT' && row.document?.id === revealedDocumentId) : -1;
  const currentPage = Math.min(revealedIndex >= 0 ? Math.floor(revealedIndex / PAGE_SIZE) : registerPage, pageCount - 1);
  const visibleRows = rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const managedDocument = managedId && dossierKindAllowsMultiple(managedKind) ? ready.find(document => document.id === managedId) : managedKind === 'CONTRACT' ? activeContract : currentDossierDocument(dossier, managedKind);
  const managedCurrent = managedDocument && dossierDocumentIsCurrent(managedDocument, dossier);

  function documentLabel(kind: DossierDocumentKind) { return kind === 'DECLARATION' && dossier?.details.replacementKind === 'STUDENT' ? 'Demande d’autorisation à l’Ordre' : dossierDocumentLabels[kind]; }
  function shortLabel(kind: DossierDocumentKind) {
    if (kind === 'DECLARATION') return dossier?.details.replacementKind === 'STUDENT' ? 'Demande à l’Ordre' : 'Courrier à l’Ordre';
    if (kind === 'REGISTRATION') return 'Inscription à l’Ordre';
    if (kind === 'AUTHORIZATION') return 'Autorisation de remplacement';
    if (kind === 'INSURANCE') return 'Assurance RCP';
    if (kind === 'REPLACEMENT_CERTIFICATE') return 'Attestation pour la CPAM';
    if (kind === 'ORDER_RESPONSE') return 'Retour de l’Ordre';
    if (kind === 'BANK_DETAILS') return 'Coordonnées bancaires';
    return documentLabel(kind);
  }
  function rowLabel(kind: DossierDocumentKind, document?: DossierDocument) {
    return document && dossierKindAllowsMultiple(kind) ? document.fileName : shortLabel(kind);
  }
  function rowActionLabel(kind: DossierDocumentKind, document?: DossierDocument) {
    return document && dossierKindAllowsMultiple(kind) ? document.fileName : documentLabel(kind);
  }
  function rowStatus(document?: DossierDocument) {
    if (!document) return 'À ajouter';
    if (!dossierDocumentIsCurrent(document, dossier!)) return document.source === 'GENERATED' || document.kind === 'SIGNED_CONTRACT' ? 'À actualiser' : 'Validité à renouveler';
    const transmitted = dossier!.deliveries.some(delivery => delivery.status === 'SENT' && delivery.documentIds.includes(document.id));
    if (document.kind === 'CONTRACT') return transmitted ? 'Transmis · à relire et signer' : 'À relire et signer';
    if (document.kind === 'SIGNED_CONTRACT') return transmitted ? 'Exemplaire signé ajouté · transmis' : 'Exemplaire signé ajouté';
    if (transmitted) return 'Transmis';
    return document.source === 'GENERATED' ? 'Prêt à relire' : 'Pièce ajoutée';
  }

  return <section className="replacement-dossier" aria-label="Dossier du remplacement" aria-busy={disabled}>
    <header className="rd-heading">
      <div><span className="rd-eyebrow">Le dossier partagé</span><h2>Vos <em>documents.</em></h2></div>
      <span className="rd-shared" aria-label="Espace partagé"><FolderOpen size={21} strokeWidth={1.3} /></span>
    </header>

    <div className="rd-mission-context">
      <p>{dossier.details.holderName || 'Médecin remplacé'}<span aria-hidden="true"> & </span>{dossier.details.replacementName || 'Remplaçant'}</p>
      <span>{dossierDate(dossier.details.startDate)} — {dossierDate(dossier.details.endDate)}</span>
    </div>

    {notice ? <div role="status"><Alert type="success">{notice}</Alert></div> : null}
    {error && !panel ? <Alert type="error">{error}</Alert> : null}

    <div className="rd-categories" role="group" aria-label="Rubriques du dossier">
      {dossierCategories.map(({ id, label }) => {
        const count = rowsByCategory[id].filter(row => row.kind === 'PLATFORM_RECEIPT' || row.document).length;
        return <button key={id} aria-pressed={category === id} aria-controls={registerId} disabled={disabled} onClick={() => changeCategory(id)}><span>{label}</span><small>{count} fichier{count > 1 ? 's' : ''}</small></button>;
      })}
    </div>
    <div className="rd-register-heading"><span>{dossierCategories.find(item => item.id === category)?.title}</span>{dossier.canEdit ? <button className="rd-text-button" aria-label="Informations du remplacement" disabled={disabled} onClick={openDetails}><Settings2 size={14} /><span>{dossier.missingFields.length ? 'À compléter' : 'Informations'}</span></button> : null}</div>
    <ul id={registerId} className="rd-document-register" aria-label={`Documents : ${dossierCategories.find(item => item.id === category)?.label}`}>
      {visibleRows.map((row) => {
        if (row.kind === 'PLATFORM_RECEIPT') return <li className="rd-document-row" data-kind="PLATFORM_RECEIPT" key={row.kind}>
          <span className="rd-document-icon" aria-hidden="true"><FileCheck2 size={21} strokeWidth={1.35} /></span>
          <div className="rd-document-description"><span className="rd-document-name">Justificatif MediLink</span><span className="rd-status is-ready"><span />Émis après règlement</span></div>
          <div className="rd-row-actions" role="group" aria-label="Actions : justificatif MediLink"><button className="rd-row-action" disabled={disabled} aria-label="Télécharger le justificatif MediLink" onClick={() => void downloadPaymentReceipt()}><ArrowDownToLine size={14} aria-hidden="true" /><span>{busy === 'payment-receipt' ? 'Chargement…' : 'Télécharger'}</span></button><a className="rd-row-action rd-more-action" href={`/${viewer === 'candidate' ? 'app' : 'establishment'}/billing`}>Mes règlements<ArrowUpRight size={14} aria-hidden="true" /></a></div>
        </li>;
        const { kind, document } = row;
        const current = document && dossierDocumentIsCurrent(document, dossier);
        const generated = kind === 'CONTRACT' || kind === 'DECLARATION';
        const canTransmit = current && dossier.canSend;
        const needsFile = !current && dossier.canEdit;
        const action = document ? 'Actualiser' : generated ? 'Générer' : 'Ajouter';
        const generating = busy === kind;
        return <li className="rd-document-row" data-kind={kind} data-document-id={document?.id} key={document?.id || kind}>
          <span className={`rd-document-icon ${kind === 'CONTRACT' ? 'is-contract' : ''}`} aria-hidden="true">{kind === 'INSURANCE' ? <ShieldCheck size={21} strokeWidth={1.35} /> : kind === 'DECLARATION' ? <Mail size={21} strokeWidth={1.35} /> : kind === 'CONTRACT' ? <FileText size={21} strokeWidth={1.35} /> : <FileCheck2 size={21} strokeWidth={1.35} />}</span>
          <div className="rd-document-description">
            <button className="rd-document-name" disabled={disabled} onClick={() => openManage(kind, document?.id)}>{rowLabel(kind, document)}</button>
            {document && dossierKindAllowsMultiple(kind) ? <small className="rd-file-kind">{shortLabel(kind)}</small> : null}
            <span className={`rd-status ${current && document.source === 'UPLOADED' ? 'is-ready' : current ? 'is-prepared' : !document && category !== 'replacement' ? 'is-optional' : ''}`}><span />{document ? rowStatus(document) : generated ? 'À générer' : category === 'additional' ? 'Si nécessaire' : category === 'payment' ? 'À joindre selon le règlement' : 'À ajouter'}</span>
          </div>
          <div className="rd-row-actions" role="group" aria-label={`Actions : ${shortLabel(kind)}`}>
            {document ? <button className="rd-row-action" aria-label={`Télécharger ${rowActionLabel(kind, document)}`} disabled={disabled} onClick={() => void download(document)}><ArrowDownToLine size={14} aria-hidden="true" /><span>{busy === `download-${document.id}` ? 'Chargement…' : 'Télécharger'}</span></button> : null}
            {needsFile ? <button className="rd-row-action is-primary" aria-label={`${action} ${documentLabel(kind)}`} disabled={disabled} onClick={() => generated ? void generate(kind) : openUpload(kind as DossierUploadKind)}>{generated ? <FileText size={14} aria-hidden="true" /> : <Upload size={14} aria-hidden="true" />}<span>{generating ? 'Création…' : action}</span></button> : null}
            {canTransmit ? <button className="rd-row-action is-primary" aria-label={`Transmettre ${rowActionLabel(kind, document)}`} disabled={disabled} onClick={() => openSend(document)}><Send size={14} aria-hidden="true" /><span>Transmettre</span></button> : null}
            {document || dossier.canEdit ? <button className="rd-row-action rd-more-action" aria-label={`Gérer ${rowActionLabel(kind, document)}`} disabled={disabled} onClick={() => openManage(kind, document?.id)}><span>Gérer</span><ChevronRight size={13} aria-hidden="true" /></button> : <span className="rd-readonly">Non fourni</span>}
          </div>
        </li>;
      })}
    </ul>
    <div className="rd-list-add">
      {dossier.canEdit ? <button className="rd-text-button" disabled={disabled} onClick={() => openUpload('OTHER')}><Plus size={14} /> Ajouter une pièce</button> : null}
      {pageCount > 1 ? <nav className="rd-pagination" aria-label="Pages de la rubrique"><span aria-live="polite" aria-label={`Page ${currentPage + 1} sur ${pageCount}`}>{currentPage + 1} / {pageCount}</span><button className="rd-icon-button" aria-label="Documents précédents" disabled={disabled || currentPage === 0} onClick={() => changePage(currentPage - 1)}><ChevronLeft size={17} /></button><button className="rd-icon-button" aria-label="Documents suivants" disabled={disabled || currentPage === pageCount - 1} onClick={() => changePage(currentPage + 1)}><ChevronRight size={17} /></button></nav> : <span>{rows.length} document{rows.length > 1 ? 's' : ''}</span>}
    </div>
    <footer className="rd-send-strip"><Button disabled={disabled || !dossier.canSend || !availableToSend.length} onClick={() => openSend()}><Send size={16} strokeWidth={1.5} /> Transmettre le dossier <ArrowUpRight size={16} /></Button><p>Vous choisissez les pièces et le destinataire.</p></footer>
    {!dossier.canSend ? <p className="rd-service-note">L’envoi par email n’est pas disponible pour ce dossier. Les pièces restent consultables et téléchargeables.</p> : null}

    {panel ? <div className="rd-edit-panel" ref={panelRef} tabIndex={-1}>
      <div className="rd-panel-heading"><div><span className="rd-eyebrow">Dossier du remplacement</span><h3>{panel === 'manage' ? shortLabel(managedKind) : panel === 'details' ? 'Les informations convenues' : panel === 'upload' ? 'Ajouter une pièce' : 'Préparer l’envoi'}</h3></div><button className="rd-icon-button" aria-label="Fermer le formulaire" disabled={disabled} onClick={closePanel}><X size={20} /></button></div>
      {error ? <Alert type="error">{error}</Alert> : null}
      {panel === 'manage' ? <div className="rd-manage">
        {managedDocument ? <div className="rd-managed-file"><FileText size={24} strokeWidth={1.4} /><div><strong>{managedDocument.fileName}</strong><span>Version {managedDocument.version}</span><small>{managedDocument.expiresAt ? `Valable jusqu’au ${dossierDate(managedDocument.expiresAt)}` : `Ajouté le ${dossierDate(managedDocument.createdAt)}`}</small><span className={`rd-status ${managedCurrent ? 'is-prepared' : ''}`}><span />{rowStatus(managedDocument)}</span></div></div> : <p className="rd-form-note">{managedKind === 'CONTRACT' || managedKind === 'DECLARATION' ? 'Ce document sera préparé à partir des informations du remplacement.' : dossierDocumentHints[managedKind] || 'Ajoutez le justificatif délivré par votre organisme.'}</p>}
        <div className="rd-manage-actions">
          {managedDocument ? <Button variant="light" disabled={disabled} onClick={() => void preview(managedDocument)}>{managedDocument.mimeType === 'application/pdf' ? 'Voir le PDF' : 'Voir le document'} <ArrowUpRight size={15} /></Button> : null}
          {managedCurrent && dossier.canSend ? <Button disabled={disabled} onClick={() => openSend(managedDocument)}><Send size={15} /> Transmettre ce document</Button> : null}
          {dossier.canEdit && (managedKind === 'CONTRACT' || managedKind === 'DECLARATION') ? <Button variant="light" disabled={disabled} onClick={() => void generate(managedKind)}><FileText size={15} />{busy === managedKind ? 'Génération…' : managedKind === 'CONTRACT' ? contract ? 'Régénérer le contrat' : 'Générer le contrat' : 'Générer le courrier à l’Ordre'}</Button> : null}
          {dossier.canEdit ? managedKind === 'CONTRACT' ? <Button variant="light" disabled={disabled} onClick={() => openUpload('SIGNED_CONTRACT')}><Upload size={15} /> Ajouter l’exemplaire signé</Button> : managedKind !== 'DECLARATION' ? <Button variant="light" disabled={disabled} onClick={() => openUpload(managedKind as DossierUploadKind)}><Upload size={15} />{managedDocument ? dossierKindAllowsMultiple(managedKind) ? 'Ajouter une autre pièce' : 'Remplacer la pièce' : 'Ajouter la pièce'}</Button> : null : null}
        </div>
        <p className="rd-form-note">{managedKind === 'CONTRACT' ? 'Relisez le contrat avant de le signer. L’import d’un exemplaire signé ne vérifie pas les signatures.' : managedKind === 'DECLARATION' ? 'Relisez le courrier et vérifiez les modalités de dépôt de votre Conseil. Un envoi ne vaut pas autorisation.' : managedDocument ? dossierDocumentHints[managedKind] || 'Les pièces officielles sont délivrées par leur organisme émetteur.' : null}</p>
      </div> : null}
      {panel === 'details' && draft ? <form onSubmit={saveDetails}>
        <p className="rd-form-note">Ces informations alimentent vos PDF. Une modification conserve les versions précédentes et permet de générer une nouvelle version.</p>
        {editConflict ? <div className="rd-conflict"><Alert type="error">Une autre personne a modifié ce dossier. Votre saisie est encore visible ci-dessous, mais elle ne peut pas remplacer la nouvelle version.</Alert><Button type="button" variant="light" onClick={openDetails}>Recharger les informations du dossier</Button></div> : null}
        {dossier.missingFields.length ? <details className="rd-missing-fields"><summary>{dossier.missingFields.length} information{dossier.missingFields.length > 1 ? 's' : ''} à compléter ou vérifier</summary><ul>{dossier.missingFields.map((field) => <li key={field}>{field}</li>)}</ul></details> : null}
        <div className="rd-fields"><Field label="Cadre d’exercice"><Select value={draft.practiceFramework || ''} onChange={(event) => setDraft({ ...draft, practiceFramework: event.target.value as ReplacementDetails['practiceFramework'] })}><option value="">Choisir le cadre du remplacement</option><option value="INDIVIDUAL_LIBERAL">Remplacement libéral individuel d’un médecin</option></Select></Field><Field label="Statut du remplaçant"><Select value={draft.replacementKind} onChange={(event) => setDraft({ ...draft, replacementKind: event.target.value as ReplacementDetails['replacementKind'] })}><option value="DOCTOR">Médecin inscrit au Tableau</option><option value="STUDENT">Étudiant / interne avec licence</option></Select></Field></div>
        <p className="rd-form-note">Les modèles proposés couvrent le remplacement libéral individuel. Les autres cadres d’exercice nécessitent un contrat adapté.</p>
        {([
          ['Le médecin remplacé', ['holderName', 'holderRpps', 'holderOrderNumber', 'holderAddress', 'holderEmail']],
          ['Le remplaçant', draft.replacementKind === 'STUDENT' ? ['replacementName', 'replacementRpps', 'replacementAddress', 'replacementEmail', 'licenseNumber', 'licenseValidUntil'] : ['replacementName', 'replacementRpps', 'replacementOrderNumber', 'replacementAddress', 'replacementEmail']],
          ['Le remplacement', ['specialty', 'practiceAddress', 'startDate', 'endDate', 'scheduleDetails', 'retrocessionPercent', 'paymentTerms']],
          ['Le Conseil de l’Ordre', ['orderCouncilName', 'orderEmail']],
        ] as Array<[string, Array<keyof ReplacementDetails>]>).map(([title, fields]) => <fieldset className="rd-fieldset" key={title}><legend>{title}</legend><div className="rd-fields">{fields.map((key) => <Field key={key} label={dossierFieldLabels[key]}>{key === 'paymentTerms' || key === 'scheduleDetails' ? <Textarea rows={2} value={String(draft[key] ?? '')} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /> : <Input type={key === 'retrocessionPercent' ? 'number' : key.toLowerCase().includes('email') ? 'email' : ['startDate', 'endDate', 'licenseValidUntil'].includes(key) ? 'date' : 'text'} value={draft[key] ?? ''} min={key === 'retrocessionPercent' ? 0 : undefined} max={key === 'retrocessionPercent' ? 100 : undefined} step={key === 'retrocessionPercent' ? 0.01 : undefined} onChange={(event) => setDraft({ ...draft, [key]: key === 'retrocessionPercent' ? event.target.value === '' ? null : Number(event.target.value) : event.target.value })} />}</Field>)}</div></fieldset>)}
        <div className="rd-form-actions"><Button disabled={disabled || editConflict}>{busy === 'save' ? 'Enregistrement…' : 'Enregistrer les informations'}</Button><Button type="button" variant="light" disabled={disabled} onClick={closePanel}>Annuler</Button></div>
      </form> : null}
      {panel === 'upload' ? <form onSubmit={upload}><p className="rd-form-note">Cette pièce sera visible par vous et l’autre partie du remplacement.</p>{dossierDocumentHints[uploadKind] ? <p className="rd-form-note">{dossierDocumentHints[uploadKind]}</p> : null}<div className="rd-fields"><Field label="Nature de la pièce"><Select value={uploadKind} onChange={(event) => setUploadKind(event.target.value as DossierUploadKind)}>{dossierUploadKinds.map((kind) => <option key={kind} value={kind}>{documentLabel(kind)}</option>)}</Select></Field><Field label="Date de fin de validité" description="À renseigner si la pièce comporte une échéance."><Input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} /></Field></div><Field label="Fichier" description="PDF, JPEG, PNG ou WebP · 10 Mo maximum"><Input key={uploadInputKey} required type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} /></Field>{uploadKind === 'SIGNED_CONTRACT' ? <p className="rd-form-note">Importez l’exemplaire signé par les deux médecins. L’ajout du fichier ne vérifie pas les signatures.</p> : null}<div className="rd-form-actions"><Button disabled={disabled || !uploadFile}><Upload size={16} />{busy === 'upload' ? 'Transfert…' : 'Ajouter au dossier'}</Button></div></form> : null}
      {panel === 'send' ? <form onSubmit={send}><div className="rd-fields"><Field label="Destinataire"><Select value={recipientType} onChange={(event) => changeRecipient(event.target.value as DossierRecipientType)}><option value="COUNTERPART">{viewer === 'candidate' ? 'Médecin remplacé' : 'Remplaçant'}</option><option value="ORDER">Conseil départemental de l’Ordre</option><option value="CPAM">Assurance maladie (CPAM)</option><option value="OTHER">Autre destinataire</option></Select></Field><Field label="Nom du destinataire"><Input required value={recipientName} onChange={(event) => { setRecipientName(event.target.value); resetSendConfirmation(); }} /></Field><Field label="Adresse email"><Input required type="email" value={recipientEmail} onChange={(event) => { setRecipientEmail(event.target.value); resetSendConfirmation(); }} /></Field></div>
        <fieldset className="rd-fieldset"><legend>Pièces à transmettre</legend><div className="rd-send-selection">{availableToSend.map((document) => <label key={document.id}><input type="checkbox" checked={selectedIds.includes(document.id)} onChange={(event) => { setSelectedIds((current) => event.target.checked ? [...current, document.id] : current.filter((id) => id !== document.id)); resetSendConfirmation(); }} /><span><strong>{documentLabel(document.kind)}</strong><small>{document.fileName} · version {document.version}</small></span></label>)}</div></fieldset>
        <Field label="Message d’accompagnement (facultatif)" description="3 000 caractères maximum · 20 Mo de pièces jointes par envoi"><Textarea rows={3} maxLength={3000} value={sendMessage} onChange={(event) => { setSendMessage(event.target.value); resetSendConfirmation(); }} /></Field>
        <div className="rd-send-confirmation"><strong>{selectedIds.length} pièce{selectedIds.length > 1 ? 's' : ''} à envoyer à {recipientEmail || 'l’adresse à renseigner'}</strong><label><input type="checkbox" required checked={sendConfirmed} onChange={(event) => setSendConfirmed(event.target.checked)} /><span>J’ai vérifié le destinataire, les pièces sélectionnées et leur contenu.</span></label>{recipientType === 'ORDER' ? <p>Vérifiez les modalités de dépôt de ce Conseil. Un email envoyé ne vaut ni réception confirmée ni autorisation de remplacement.</p> : recipientType === 'CPAM' ? <p>Renseignez le contact indiqué par votre CPAM et vérifiez le mode de dépôt demandé. L’envoi ne vaut pas validation de votre dossier.</p> : <p>Le destinataire recevra les documents sélectionnés par email.</p>}</div>
        <div className="rd-form-actions"><Button disabled={disabled || !selectedIds.length || !sendConfirmed}><Send size={16} />{busy === 'send' ? 'Envoi…' : 'Confirmer et envoyer'}</Button></div>
      </form> : null}
    </div> : null}

    <details className="rd-history"><summary><History size={16} /> Versions et envois <span>{ready.length} pièce{ready.length > 1 ? 's' : ''} · {dossier.deliveries.length} envoi{dossier.deliveries.length > 1 ? 's' : ''}</span><ChevronRight size={16} /></summary><div className="rd-history-content"><h4>Versions des documents</h4>{ready.length ? [...ready].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((document) => <div className="rd-history-row" key={document.id}><div><strong>{documentLabel(document.kind)} · v{document.version}</strong><small>{document.fileName} · {dossierDate(document.createdAt)}{!dossierDocumentIsCurrent(document, dossier) ? ' · Version à actualiser' : ''}</small></div><button className="rd-text-button" disabled={disabled} onClick={() => void preview(document)} aria-label={`Ouvrir ${document.fileName}`}><ArrowDownToLine size={15} /> Ouvrir</button>{dossier.canEdit ? <button className="rd-text-button rd-delete" disabled={disabled} onClick={() => void remove(document)} aria-label={`Supprimer ${document.fileName}`}>Supprimer</button> : null}</div>) : <p>Aucun document ajouté pour le moment.</p>}<h4>Historique des envois</h4>{dossier.deliveries.length ? [...dossier.deliveries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((delivery) => <div className="rd-history-row" key={delivery.id}><div><strong>{delivery.recipientEmail}</strong><small>{delivery.documentIds.length} pièce{delivery.documentIds.length > 1 ? 's' : ''} · {dossierDate(delivery.sentAt || delivery.createdAt)} · {dossierRecipientLabels[delivery.recipientType]}</small></div><span className={`rd-status ${delivery.status === 'SENT' ? 'is-ready' : ''}`}>{delivery.status === 'SENT' ? 'Envoyé' : delivery.status === 'FAILED' ? 'Échec de l’envoi' : 'En cours'}</span></div>) : <p>Aucun envoi pour le moment.</p>}<button className="rd-text-button" disabled={disabled} onClick={() => void run('reload', async () => { await refresh(); })}>Actualiser l’historique</button></div></details>
  </section>;
}
