'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Select } from './ui';
import type { ChoiceOption } from '@/lib/profile-options';

const OTHER_VALUE = '__OTHER__';

function optionLabel(options: ChoiceOption[], value: string) {
  return options.find((option) => option.value === value)?.label || value;
}

function splitTextChoices(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export function SingleChoiceField({
  label,
  value,
  options,
  onChange,
  required,
}: {
  label: string;
  value: string;
  options: ChoiceOption[];
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const isCustom = Boolean(value) && !options.some((option) => option.value === value);
  const [customOpen, setCustomOpen] = useState(isCustom);
  const [customValue, setCustomValue] = useState(isCustom ? value : '');

  useEffect(() => {
    const nextIsCustom = Boolean(value) && !options.some((option) => option.value === value);
    if (nextIsCustom) setCustomValue(value);
  }, [options, value]);

  function selectValue(next: string) {
    if (next === OTHER_VALUE) {
      setCustomOpen(true);
      setCustomValue(isCustom ? value : '');
      return;
    }

    onChange(next);
    setCustomOpen(false);
  }

  function applyCustomValue() {
    const next = customValue.trim();
    if (!next) return;
    onChange(next);
    setCustomOpen(false);
  }

  return (
    <div className="field">
      <span className="label">{label}</span>
      <Select required={required} value={customOpen || isCustom ? OTHER_VALUE : value} onChange={(e) => selectValue(e.target.value)}>
        <option value="">Sélectionner</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
        <option value={OTHER_VALUE}>Autre</option>
      </Select>
      {customOpen ? (
        <div className="custom-choice-row">
          <Input value={customValue} onChange={(e) => setCustomValue(e.target.value)} placeholder="Entrer un texte libre" />
          <Button type="button" variant="secondary" onClick={applyCustomValue}>Valider</Button>
        </div>
      ) : null}
      {isCustom && !customOpen ? (
        <div className="selected-custom-values">
          <button type="button" onClick={() => setCustomOpen(true)}>
            {value}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function MultiChoiceField({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: ChoiceOption[];
  onChange: (values: string[]) => void;
}) {
  const [selectedValue, setSelectedValue] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const availableOptions = options.filter((option) => !values.includes(option.value));

  function addValue(value: string) {
    if (value === OTHER_VALUE) {
      setCustomOpen(true);
      setSelectedValue('');
      return;
    }

    if (value && !values.includes(value)) onChange([...values, value]);
    setSelectedValue('');
  }

  function addCustomValue() {
    const next = customValue.trim();
    if (!next) return;
    onChange(values.includes(next) ? values : [...values, next]);
    setCustomValue('');
    setCustomOpen(false);
  }

  return (
    <div className="field">
      <span className="label">{label}</span>
      <Select value={selectedValue} onChange={(e) => addValue(e.target.value)}>
        <option value="">Ajouter une option</option>
        {availableOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        <option value={OTHER_VALUE}>Autre</option>
      </Select>
      {customOpen ? (
        <div className="custom-choice-row">
          <Input value={customValue} onChange={(e) => setCustomValue(e.target.value)} placeholder="Ajouter une réponse libre" />
          <Button type="button" variant="secondary" onClick={addCustomValue}>Ajouter</Button>
        </div>
      ) : null}
      {values.length ? (
        <div className="selected-custom-values">
          {values.map((value) => (
            <button key={value} type="button" onClick={() => onChange(values.filter((item) => item !== value))}>
              {optionLabel(options, value)} ×
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MultiChoiceTextField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ChoiceOption[];
  onChange: (value: string) => void;
}) {
  const values = splitTextChoices(value || '');

  return (
    <MultiChoiceField
      label={label}
      values={values}
      options={options}
      onChange={(nextValues) => onChange(nextValues.join(', '))}
    />
  );
}
