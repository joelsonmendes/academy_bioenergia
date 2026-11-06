import React, {useId, useState} from 'react';
import {fields} from './model';
import {useApp} from './store';

export function LabParameterField({id, value, onValue, slider = true}: {
  id: string; value: number; onValue: (value: number) => void; slider?: boolean;
}) {
  const {t} = useApp();
  const field = fields[id];
  const label = t(field.label);
  const [draft, setDraft] = useState<string | null>(null);
  const candidate = draft === null ? value : Number(draft);
  const invalid = draft === '' || !Number.isFinite(candidate) || candidate < field.min || candidate > field.max;
  const inputId = useId();

  return (
    <div className="lab3d-field">
      <label htmlFor={inputId}>{label}</label>
      <div className="lab3d-number">
        <input id={inputId} type="number" inputMode="decimal" min={field.min} max={field.max} step={field.step}
          value={draft ?? String(value)} aria-invalid={invalid || undefined}
          onChange={event => {
            const raw = event.target.value;
            const next = event.target.valueAsNumber;
            setDraft(raw);
            if (Number.isFinite(next) && next >= field.min && next <= field.max) onValue(next);
          }}
          onBlur={() => setDraft(null)}/>
        <span>{field.unit}</span>
      </div>
      {slider && <input type="range" min={field.min} max={field.max} step={field.step}
        value={value} aria-label={label} onChange={event => {
          setDraft(null);
          onValue(Number(event.target.value));
        }}/>}
    </div>
  );
}
