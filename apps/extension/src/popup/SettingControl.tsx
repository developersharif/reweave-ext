import type { Setting, SettingValue } from '@reskin/schema';
import { useEffect, useRef, useState } from 'react';
import { formatRange } from './view';

interface Props {
  setting: Setting;
  value: SettingValue | undefined;
  onChange: (value: SettingValue) => void;
}

/** Slider drags are sent at most this often (extension-architecture §5). */
const RANGE_DEBOUNCE_MS = 120;
const HEX = /^#[0-9a-fA-F]{6}$/;

/** One control generated from a manifest setting (template-schema.md §5). */
export function SettingControl({ setting, value, onChange }: Props) {
  const id = `setting-${setting.id}`;
  const hint = setting.description ? <p className="hint">{setting.description}</p> : null;

  switch (setting.type) {
    case 'boolean':
      return (
        <div className="setting setting-boolean">
          <label htmlFor={id}>
            <input
              id={id}
              type="checkbox"
              checked={value === true}
              onChange={(e) => onChange(e.currentTarget.checked)}
            />
            {setting.label}
          </label>
          {hint}
        </div>
      );
    case 'select':
    case 'font':
      return (
        <div className="setting">
          <label htmlFor={id}>{setting.label}</label>
          <select
            id={id}
            value={String(value ?? setting.default)}
            onChange={(e) => onChange(e.currentTarget.value)}
          >
            {setting.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {hint}
        </div>
      );
    case 'range':
      return (
        <RangeControl setting={setting} value={value} onChange={onChange} hint={hint} id={id} />
      );
    case 'color': {
      const current = typeof value === 'string' ? value : setting.default;
      return (
        <div className="setting">
          <label htmlFor={id}>{setting.label}</label>
          <input
            id={id}
            type="color"
            value={HEX.test(current) ? current : '#000000'}
            onChange={(e) => onChange(e.currentTarget.value)}
          />
          {hint}
        </div>
      );
    }
  }
}

function RangeControl({
  setting,
  value,
  onChange,
  hint,
  id,
}: Props & { setting: Extract<Setting, { type: 'range' }>; hint: React.ReactNode; id: string }) {
  const [local, setLocal] = useState(typeof value === 'number' ? value : setting.default);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (typeof value === 'number') setLocal(value);
  }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="setting">
      <label htmlFor={id}>
        {setting.label}
        <output htmlFor={id}>{formatRange(local, setting.unit)}</output>
      </label>
      <input
        id={id}
        type="range"
        min={setting.min}
        max={setting.max}
        step={setting.step}
        value={local}
        onChange={(e) => {
          const next = Number(e.currentTarget.value);
          setLocal(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => onChange(next), RANGE_DEBOUNCE_MS);
        }}
      />
      {hint}
    </div>
  );
}
