'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowDownToLine, ArrowUpRight, Check, ChevronRight, FileCheck2, FileText, FolderOpen, History, Mail, Plus, Send, Settings2, ShieldCheck, Upload, X } from 'lucide-react';
import { api, apiFetch, ApiError, isMockStorageUrl, openDocumentPreviewWindow, showDocumentInPreview } from '@/lib/api';
import { errorMessage } from '@/lib/user-facing';
import { currentDossierDocument, dossierDate, dossierDocumentIsCurrent, dossierDocumentLabels, dossierFieldLabels, type DossierDocument, type DossierDocumentKind, type DossierUploadKind, type ReplacementDetails, type ReplacementDossierData } from '@/lib/replacement-dossier';
import { Alert, Button, Field, Input, Select, Textarea } from '@/components/ui';

type UploadResponse = { documentId: string; uploadUrl: string; method: string; headers: Record<string, string> };
type Panel = 'details' | 'upload' | 'send' | null;

export function ReplacementDossier({ applicationId, viewer }: { applicationId: string; viewer: 'candidate' | 'establishment' }) {
  const path = `/applications/${applicationId}/dossier`;
  const [dossier, setDossier] = useState<ReplacementDossierData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [draft, setDraft] = useState<ReplacementDetails | null>(null);
  const [editConflict, setEditConflict] = useState(false);
  const [uploadKind, setUploadKind] = useState<DossierUploadKind>('SIGNED_CONTRACT');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [expiry, setExpiry] = useState('');
  const [recipientType, setRecipientType] = useState<'COUNTERPART' | 'ORDER'>('COUNTERPART');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendMessage, setSendMessage] = useState('');
  const [sendConfirmed, setSendConfirmed] = useState(false);
  const idempotency = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setDossier(null); setPanel(null); setError(null); setNotice(null);
    void api.reload<ReplacementDossierData>(path).then((data) => { if (active) setDossier(data); }).catch((cause) => { if (active) setError(errorMessage(cause)); });
    return () => { active = false; };
  }, [path]);

  useEffect(() => {
    if (panel) { panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); panelRef.current?.focus({ preventScroll: true }); }
  }, [panel]);

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

  function openDetails() { if (!dossier) return; setDraft({ ...dossier.details }); setEditConflict(false); setPanel('details'); setError(null); }
  function openUpload(kind: DossierUploadKind) { setUploadKind(kind); setUploadFile(null); setUploadInputKey((value) => value + 1); setExpiry(''); setPanel('upload'); setError(null); }

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

  async function saveDetails(event: FormEvent) {
    event.preventDefault();
    if (!dossier || !draft || editConflict) return;
    if (draft.endDate && draft.startDate && draft.endDate < draft.startDate) { setError('Le dernier jour doit être égal ou postérieur au premier jour.'); return; }
    await run('save', async () => {
      await apiFetch(path, { method: 'PUT', body: { revision: dossier.revision, details: draft }, invalidateCache: false });
      await refresh(); setPanel(null); setNotice('Informations enregistrées. Les documents déjà générés restent disponibles dans l’historique.');
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
      await refresh(); setPanel(null); setNotice('La pièce a été ajoutée au dossier partagé.');
    });
  }

  function changeRecipient(type: 'COUNTERPART' | 'ORDER') {
    if (!dossier) return;
    setRecipientType(type);
    setRecipientName(type === 'ORDER' ? dossier.details.orderCouncilName : viewer === 'candidate' ? dossier.details.holderName : dossier.details.replacementName);
    setRecipientEmail(type === 'ORDER' ? dossier.details.orderEmail : viewer === 'candidate' ? dossier.details.holderEmail : dossier.details.replacementEmail);
    resetSendConfirmation();
  }

  function resetSendConfirmation() { setSendConfirmed(false); idempotency.current = null; }

  function openSend() {
    if (!dossier) return;
    changeRecipient('COUNTERPART'); setSelectedIds([]); setSendMessage(''); setPanel('send'); setError(null);
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
      setPanel(null); setNotice(delivery.status === 'SENT' ? `Le dossier a été envoyé à ${recipientEmail}. L’envoi ne vaut pas validation par le destinataire.` : 'L’envoi est en cours. Son état figure dans l’historique.');
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
  const activeContract = currentSigned || contract;
  const currentContract = activeContract && dossierDocumentIsCurrent(activeContract, dossier);
  const supportingKinds: DossierDocumentKind[] = dossier.details.replacementKind === 'STUDENT' ? ['DECLARATION', 'LICENSE', 'AUTHORIZATION', 'INSURANCE'] : ['DECLARATION', 'REGISTRATION', 'INSURANCE'];
  const ready = dossier.documents.filter((document) => document.status === 'READY');
  const availableToSend = ready.filter((document) => dossierDocumentIsCurrent(document, dossier));
  const latestDelivery = [...dossier.deliveries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const disabled = Boolean(busy);
  const hasDetails = dossier.missingFields.length === 0;
  const deliveryStatus = latestDelivery?.status === 'SENT' ? 'Envoi effectué' : latestDelivery?.status === 'FAILED' ? 'Envoi à réessayer' : latestDelivery?.status === 'SENDING' ? 'Envoi en cours' : 'Transmission à préparer';
  const identity = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase() || '—';

  function documentLabel(kind: DossierDocumentKind) { return kind === 'DECLARATION' && dossier?.details.replacementKind === 'STUDENT' ? 'Demande d’autorisation à l’Ordre' : dossierDocumentLabels[kind]; }
  function rowStatus(document?: DossierDocument) {
    if (!document) return 'À ajouter';
    if (!dossierDocumentIsCurrent(document, dossier!)) return document.source === 'GENERATED' || document.kind === 'SIGNED_CONTRACT' ? 'À actualiser' : 'Validité à renouveler';
    return document.source === 'GENERATED' ? 'Prêt à relire' : 'Pièce ajoutée';
  }

  return <section className="replacement-dossier" aria-label="Dossier du remplacement" aria-busy={disabled}>
    <header className="rd-heading">
      <div><span className="rd-eyebrow">Préparer le remplacement</span><h2>Un dossier, <em>à deux.</em></h2><p>Contrat, justificatifs et courriers réunis pour votre mission.</p></div>
      <span className="rd-shared"><ShieldCheck size={16} /> Espace partagé</span>
    </header>

    <div className="rd-mission-context">
      <div className="rd-person"><span className="rd-avatar">{identity(dossier.details.holderName)}</span><div><small>Médecin remplacé</small><strong>{dossier.details.holderName || 'À renseigner'}</strong></div></div>
      <span className="rd-person-connector" aria-hidden="true">↔</span>
      <div className="rd-person"><span className="rd-avatar rd-avatar-light">{identity(dossier.details.replacementName)}</span><div><small>Remplaçant</small><strong>{dossier.details.replacementName || 'À renseigner'}</strong></div></div>
      <div className="rd-mission-dates"><strong>{dossierDate(dossier.details.startDate)} — {dossierDate(dossier.details.endDate)}</strong><span>{dossier.details.practiceAddress || 'Lieu à renseigner'}</span></div>
    </div>

    <ol className="rd-progress" aria-label="Avancement du dossier">
      <li className={hasDetails ? 'is-done' : 'is-current'}><span>{hasDetails ? <Check size={13} /> : '01'}</span><div>Informations<small>{hasDetails ? 'Renseignées' : 'À compléter'}</small></div></li>
      <li className={currentSigned ? 'is-done' : hasDetails ? 'is-current' : ''}><span>{currentSigned ? <Check size={13} /> : '02'}</span><div>Documents<small>{currentSigned ? 'Exemplaire signé ajouté' : contract ? 'Contrat à relire et signer' : 'Contrat à préparer'}</small></div></li>
      <li className={latestDelivery?.status === 'SENT' ? 'is-done' : ''}><span>{latestDelivery?.status === 'SENT' ? <Check size={13} /> : '03'}</span><div>Transmission<small>{deliveryStatus}</small></div></li>
    </ol>

    {notice ? <div role="status"><Alert type="success">{notice}</Alert></div> : null}
    {error && !panel ? <Alert type="error">{error}</Alert> : null}

    <div className="rd-contract">
      <div className="rd-contract-folio" aria-hidden="true"><span>MÉDILINK</span><FileText size={30} strokeWidth={1} /><i /><i /><b>CONTRAT</b><small>REMPLACEMENT</small></div>
      <div className="rd-contract-copy"><span className="rd-eyebrow">La pièce centrale du dossier</span><h3>Votre contrat de remplacement</h3><p>{currentSigned ? 'Votre exemplaire signé est réuni avec les pièces du remplacement.' : 'Prérempli à partir des informations convenues entre les deux médecins.'}</p><span className={`rd-status ${currentSigned ? 'is-ready' : ''}`}><span />{activeContract ? currentContract ? currentSigned ? 'Exemplaire signé ajouté' : 'À relire et signer' : 'Informations modifiées · à régénérer' : 'À générer'}{activeContract ? <small>Version {activeContract.version}</small> : null}</span></div>
      <div className="rd-contract-actions">
        {activeContract ? <Button variant="light" disabled={disabled} onClick={() => void preview(activeContract)}>Voir le PDF <ArrowUpRight size={15} /></Button> : null}
        {dossier.canEdit ? <Button disabled={disabled} onClick={() => void generate('CONTRACT')}><FileText size={16} />{busy === 'CONTRACT' ? 'Génération…' : contract ? 'Régénérer le contrat' : 'Générer le contrat'}</Button> : null}
        {dossier.canEdit ? <button className="rd-text-button" disabled={disabled} onClick={() => openUpload('SIGNED_CONTRACT')}><Upload size={14} /> Ajouter l’exemplaire signé</button> : null}
      </div>
    </div>

    <div className="rd-register-heading"><div><span className="rd-eyebrow">Les pièces qui l’accompagnent</span><h3>Tout retrouver au même endroit.</h3></div>{dossier.canEdit ? <button className="rd-text-button" disabled={disabled} onClick={openDetails}><Settings2 size={15} /> Informations du remplacement</button> : null}</div>
    <div className="rd-document-register">
      {supportingKinds.map((kind, index) => {
        const document = currentDossierDocument(dossier, kind);
        const current = document && dossierDocumentIsCurrent(document, dossier);
        return <div className="rd-document-row" key={kind}>
          <span className="rd-document-index">0{index + 1}</span><span className="rd-document-icon" aria-hidden="true">{kind === 'INSURANCE' ? <ShieldCheck size={21} strokeWidth={1.4} /> : kind === 'DECLARATION' ? <Mail size={21} strokeWidth={1.4} /> : <FileCheck2 size={21} strokeWidth={1.4} />}</span>
          <div className="rd-document-description"><strong>{documentLabel(kind)}</strong><small>{document ? `${document.source === 'GENERATED' ? `Version ${document.version} · ` : ''}${document.expiresAt ? `Valable jusqu’au ${dossierDate(document.expiresAt)}` : `Ajouté le ${dossierDate(document.createdAt)}`}` : kind === 'DECLARATION' ? 'Préparé depuis les informations du remplacement' : kind === 'AUTHORIZATION' ? 'Délivrée par le Conseil départemental' : kind === 'INSURANCE' ? 'Pour la période de remplacement' : 'Justificatif à importer'}</small></div>
          <span className={`rd-status ${current ? 'is-ready' : ''}`}><span />{document ? rowStatus(document) : kind === 'DECLARATION' ? 'À générer' : 'À ajouter'}</span>
          <div className="rd-row-actions">{document ? <button className="rd-text-button" aria-label={`Voir ${documentLabel(kind)}`} disabled={disabled} onClick={() => void preview(document)}>Voir <ArrowUpRight size={14} /></button> : null}{dossier.canEdit ? <button className="rd-icon-button" disabled={disabled} title={kind === 'DECLARATION' ? 'Générer le courrier' : `Ajouter ${documentLabel(kind)}`} aria-label={kind === 'DECLARATION' ? 'Générer le courrier à l’Ordre' : `Ajouter ${documentLabel(kind)}`} onClick={() => kind === 'DECLARATION' ? void generate('DECLARATION') : openUpload(kind as DossierUploadKind)}><Plus size={17} /></button> : null}</div>
        </div>;
      })}
    </div>

    <footer className="rd-send-strip"><div><span className="rd-send-icon"><Send size={21} strokeWidth={1.5} /></span><div><strong>Votre dossier, prêt à être transmis.</strong><p>Choisissez les pièces et leur destinataire avant l’envoi.</p></div></div><Button disabled={disabled || !dossier.canSend || !availableToSend.length} onClick={openSend}>Envoyer le dossier <ArrowUpRight size={16} /></Button></footer>
    {!dossier.canSend ? <p className="rd-service-note">L’envoi par email n’est pas disponible pour ce dossier. Les pièces restent consultables et téléchargeables.</p> : null}

    {panel ? <div className="rd-edit-panel" ref={panelRef} tabIndex={-1}>
      <div className="rd-panel-heading"><div><span className="rd-eyebrow">Dossier du remplacement</span><h3>{panel === 'details' ? 'Les informations convenues' : panel === 'upload' ? 'Ajouter une pièce' : 'Préparer l’envoi'}</h3></div><button className="rd-icon-button" aria-label="Fermer le formulaire" disabled={disabled} onClick={() => setPanel(null)}><X size={20} /></button></div>
      {error ? <Alert type="error">{error}</Alert> : null}
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
        <div className="rd-form-actions"><Button disabled={disabled || editConflict}>{busy === 'save' ? 'Enregistrement…' : 'Enregistrer les informations'}</Button><Button type="button" variant="light" disabled={disabled} onClick={() => setPanel(null)}>Annuler</Button></div>
      </form> : null}
      {panel === 'upload' ? <form onSubmit={upload}><div className="rd-fields"><Field label="Nature de la pièce"><Select value={uploadKind} onChange={(event) => setUploadKind(event.target.value as DossierUploadKind)}>{(['SIGNED_CONTRACT', 'REGISTRATION', 'LICENSE', 'AUTHORIZATION', 'INSURANCE', 'OTHER'] as DossierUploadKind[]).map((kind) => <option key={kind} value={kind}>{documentLabel(kind)}</option>)}</Select></Field><Field label="Date de fin de validité" description="À renseigner si la pièce comporte une échéance."><Input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} /></Field></div><Field label="Fichier" description="PDF, JPEG, PNG ou WebP · 10 Mo maximum"><Input key={uploadInputKey} required type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} /></Field>{uploadKind === 'SIGNED_CONTRACT' ? <p className="rd-form-note">Importez l’exemplaire signé par les deux médecins. L’ajout du fichier ne vérifie pas les signatures.</p> : null}<div className="rd-form-actions"><Button disabled={disabled || !uploadFile}><Upload size={16} />{busy === 'upload' ? 'Transfert…' : 'Ajouter au dossier'}</Button></div></form> : null}
      {panel === 'send' ? <form onSubmit={send}><div className="rd-fields"><Field label="Destinataire"><Select value={recipientType} onChange={(event) => changeRecipient(event.target.value as 'COUNTERPART' | 'ORDER')}><option value="COUNTERPART">{viewer === 'candidate' ? 'Médecin remplacé' : 'Remplaçant'}</option><option value="ORDER">Conseil départemental de l’Ordre</option></Select></Field><Field label="Nom du destinataire"><Input required value={recipientName} onChange={(event) => { setRecipientName(event.target.value); resetSendConfirmation(); }} /></Field><Field label="Adresse email"><Input required type="email" value={recipientEmail} onChange={(event) => { setRecipientEmail(event.target.value); resetSendConfirmation(); }} /></Field></div>
        <fieldset className="rd-fieldset"><legend>Pièces à transmettre</legend><div className="rd-send-selection">{availableToSend.map((document) => <label key={document.id}><input type="checkbox" checked={selectedIds.includes(document.id)} onChange={(event) => { setSelectedIds((current) => event.target.checked ? [...current, document.id] : current.filter((id) => id !== document.id)); resetSendConfirmation(); }} /><span><strong>{documentLabel(document.kind)}</strong><small>{document.fileName} · version {document.version}</small></span></label>)}</div></fieldset>
        <Field label="Message d’accompagnement (facultatif)" description="3 000 caractères maximum · 20 Mo de pièces jointes par envoi"><Textarea rows={3} maxLength={3000} value={sendMessage} onChange={(event) => { setSendMessage(event.target.value); resetSendConfirmation(); }} /></Field>
        <div className="rd-send-confirmation"><strong>{selectedIds.length} pièce{selectedIds.length > 1 ? 's' : ''} à envoyer à {recipientEmail || 'l’adresse à renseigner'}</strong><label><input type="checkbox" required checked={sendConfirmed} onChange={(event) => setSendConfirmed(event.target.checked)} /><span>J’ai vérifié le destinataire, les pièces sélectionnées et leur contenu.</span></label>{recipientType === 'ORDER' ? <p>Vérifiez les modalités de dépôt de ce Conseil. Un email envoyé ne vaut ni réception confirmée ni autorisation de remplacement.</p> : <p>Le destinataire recevra les documents sélectionnés par email.</p>}</div>
        <div className="rd-form-actions"><Button disabled={disabled || !selectedIds.length || !sendConfirmed}><Send size={16} />{busy === 'send' ? 'Envoi…' : 'Confirmer et envoyer'}</Button></div>
      </form> : null}
    </div> : null}

    <div className="rd-bottom-actions">{dossier.canEdit ? <button className="rd-text-button" disabled={disabled} onClick={() => openUpload('OTHER')}><Plus size={15} /> Ajouter une autre pièce</button> : null}<span>Les pièces officielles sont délivrées par leur organisme émetteur.</span></div>
    <details className="rd-history"><summary><History size={16} /> Versions et envois <span>{ready.length} pièce{ready.length > 1 ? 's' : ''} · {dossier.deliveries.length} envoi{dossier.deliveries.length > 1 ? 's' : ''}</span><ChevronRight size={16} /></summary><div className="rd-history-content"><h4>Versions des documents</h4>{ready.length ? [...ready].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((document) => <div className="rd-history-row" key={document.id}><div><strong>{documentLabel(document.kind)} · v{document.version}</strong><small>{document.fileName} · {dossierDate(document.createdAt)}{!dossierDocumentIsCurrent(document, dossier) ? ' · Version à actualiser' : ''}</small></div><button className="rd-text-button" disabled={disabled} onClick={() => void preview(document)} aria-label={`Ouvrir ${document.fileName}`}><ArrowDownToLine size={15} /> Ouvrir</button>{dossier.canEdit ? <button className="rd-text-button rd-delete" disabled={disabled} onClick={() => void remove(document)} aria-label={`Supprimer ${document.fileName}`}>Supprimer</button> : null}</div>) : <p>Aucun document ajouté pour le moment.</p>}<h4>Historique des envois</h4>{dossier.deliveries.length ? [...dossier.deliveries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((delivery) => <div className="rd-history-row" key={delivery.id}><div><strong>{delivery.recipientEmail}</strong><small>{delivery.documentIds.length} pièce{delivery.documentIds.length > 1 ? 's' : ''} · {dossierDate(delivery.sentAt || delivery.createdAt)} · {delivery.recipientType === 'ORDER' ? 'Conseil de l’Ordre' : 'Autre médecin'}</small></div><span className={`rd-status ${delivery.status === 'SENT' ? 'is-ready' : ''}`}>{delivery.status === 'SENT' ? 'Envoyé' : delivery.status === 'FAILED' ? 'Échec de l’envoi' : 'En cours'}</span></div>) : <p>Aucun envoi pour le moment.</p>}<button className="rd-text-button" disabled={disabled} onClick={() => void run('reload', async () => { await refresh(); })}>Actualiser l’historique</button></div></details>
  </section>;
}
