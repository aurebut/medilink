'use client';

import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Alert, Button, Field, Input, Select } from '@/components/ui';
import { dossierPaymentMethods, type DossierFeeEntry, type DossierPeriod } from '@/lib/replacement-dossier';

const moneyKeys = ['feesCents', 'supplementsCents', 'patientReceiptsCents', 'thirdPartyReceiptsCents'] as const;
type MoneyKey = typeof moneyKeys[number];
type EntryDraft = Omit<DossierFeeEntry, MoneyKey | 'actCount'> & Record<MoneyKey | 'actCount', string>;
const money = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const toDraft = (entry: DossierFeeEntry): EntryDraft => ({ ...entry, actCount: String(entry.actCount),
  feesCents: (entry.feesCents / 100).toFixed(2), supplementsCents: (entry.supplementsCents / 100).toFixed(2),
  patientReceiptsCents: (entry.patientReceiptsCents / 100).toFixed(2), thirdPartyReceiptsCents: (entry.thirdPartyReceiptsCents / 100).toFixed(2) });

export function DossierReceiptsForm({ entries, startDate, periods, busy, conflict, onSave }: {
  entries: DossierFeeEntry[]; startDate: string; periods: DossierPeriod[]; busy: boolean; conflict: boolean;
  onSave: (entries: DossierFeeEntry[]) => Promise<void>;
}) {
  const empty = (): EntryDraft => ({ date: startDate, actCount: '1', feesCents: '', supplementsCents: '0',
    patientReceiptsCents: '0', thirdPartyReceiptsCents: '0', paymentMethod: 'OTHER' });
  const [rows, setRows] = useState<EntryDraft[]>(entries.length ? entries.map(toDraft) : [empty()]);
  const [error, setError] = useState<string | null>(null);
  const amounts = rows.map(row => Object.fromEntries(moneyKeys.map(key => [key, Math.round(Number(row[key]) * 100)])) as Record<MoneyKey, number>);
  const total = amounts.reduce((sum, row) => sum + row.feesCents + row.supplementsCents, 0);
  const received = amounts.reduce((sum, row) => sum + row.patientReceiptsCents + row.thirdPartyReceiptsCents, 0);
  function update(index: number, patch: Partial<EntryDraft>) {
    setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
    setError(null);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (rows.some(row => !periods.some(period => row.date >= period.startDate && row.date <= period.endDate))) {
      setError('Chaque date des actes doit appartenir à une période effective du remplacement. Vérifiez les dates ou les périodes du dossier.');
      return;
    }
    if (rows.some((row, index) => moneyKeys.some(key => !/^(?:\d+)(?:\.\d{1,2})?$/.test(row[key]))
      || !/^\d+$/.test(row.actCount) || Number(row.actCount) < 1
      || amounts[index].patientReceiptsCents + amounts[index].thirdPartyReceiptsCents > amounts[index].feesCents + amounts[index].supplementsCents)) {
      setError('Vérifiez les montants, le nombre d’actes et les encaissements de chaque ligne. Les montants acceptent au plus deux décimales.');
      return;
    }
    await onSave(rows.map((row, index) => ({ ...row, ...amounts[index], actCount: Number(row.actCount) })));
  }
  return <form onSubmit={submit}>
    <p className="rd-form-note">Reprenez les recettes du cabinet, par journée et mode de paiement ou par acte. Les dates doivent appartenir aux périodes du remplacement. Conservez les noms et identifiants des patients hors de ce dossier partagé.</p>
    {error ? <Alert type="error">{error}</Alert> : null}
    <div className="rd-receipts">
      {rows.map((row, index) => <fieldset className="rd-fieldset rd-receipt-entry" key={index}>
        <legend>Ligne {index + 1}</legend>
        <div className="rd-fields rd-receipt-fields">
          <Field label={`Date des actes ${index + 1}`}><Input required type="date" value={row.date} onChange={event => update(index, { date: event.target.value })} /></Field>
          <Field label={`Nombre d’actes ${index + 1}`}><Input required type="number" min={1} max={10000} step={1} value={row.actCount} onChange={event => update(index, { actCount: event.target.value })} /></Field>
          {([
            ['feesCents', 'Honoraires (€)'], ['supplementsCents', 'Suppléments (€)'],
            ['patientReceiptsCents', 'Encaissé patient (€)'], ['thirdPartyReceiptsCents', 'Encaissé NOEMIE / tiers (€)'],
          ] as const).map(([key, label]) => <Field key={key} label={`${label} ${index + 1}`}><Input required type="number" min={0} max={10000000} step="0.01" value={row[key]} onChange={event => update(index, { [key]: event.target.value })} /></Field>)}
          <Field label={`Mode de règlement patient ${index + 1}`}><Select value={row.paymentMethod} onChange={event => update(index, { paymentMethod: event.target.value as DossierFeeEntry['paymentMethod'] })}>{Object.entries(dossierPaymentMethods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
          <div className="rd-receipt-balance"><span>Solde à percevoir</span><strong>{money(amounts[index].feesCents + amounts[index].supplementsCents - amounts[index].patientReceiptsCents - amounts[index].thirdPartyReceiptsCents)}</strong></div>
        </div>
        {rows.length > 1 ? <button type="button" className="rd-text-button rd-delete" disabled={busy} onClick={() => setRows(current => current.filter((_, rowIndex) => rowIndex !== index))}>Retirer la ligne {index + 1}</button> : null}
      </fieldset>)}
    </div>
    <Button type="button" variant="light" disabled={busy || rows.length >= 200} onClick={() => setRows(current => [...current, empty()])}><Plus size={15} /> Ajouter une ligne de recettes</Button>
    <dl className="rd-receipt-totals"><div><dt>Honoraires et suppléments</dt><dd>{money(total)}</dd></div><div><dt>Encaissements déclarés</dt><dd>{money(received)}</dd></div><div><dt>Solde à percevoir</dt><dd>{money(total - received)}</dd></div></dl>
    <p className="rd-form-note">Le PDF présentera ces totaux et la rétrocession convenue. Il ne constitue pas un justificatif de paiement. La saisie des recettes ne modifie pas le règlement enregistré dans votre comptabilité.</p>
    <div className="rd-form-actions"><Button disabled={busy || conflict}>{busy ? 'Préparation…' : 'Enregistrer et générer le récapitulatif'}</Button></div>
  </form>;
}
