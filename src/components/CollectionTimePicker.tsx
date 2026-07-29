interface CollectionTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const inputClass =
  'flex-1 px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent';

function to24(h12: number, isPm: boolean): number {
  if (isPm) return h12 === 12 ? 12 : h12 + 12;
  return h12 === 12 ? 0 : h12;
}

function from24(h24: number): { h12: number; isPm: boolean } {
  return { h12: h24 % 12 === 0 ? 12 : h24 % 12, isPm: h24 >= 12 };
}

export default function CollectionTimePicker({ value, onChange, disabled }: CollectionTimePickerProps) {
  const parts = value ? value.split(':') : null;
  const h24 = parts ? parseInt(parts[0], 10) : null;
  const minute = parts ? parts[1] : '';
  const { h12, isPm } = h24 !== null ? from24(h24) : { h12: 0, isPm: false };

  const compose = (newH12: number | null, newMinute: string, newIsPm: boolean) => {
    if (newH12 === null || newH12 === 0) return '';
    return `${String(to24(newH12, newIsPm)).padStart(2, '0')}:${newMinute || '00'}`;
  };

  return (
    <div className="flex space-x-2">
      <select
        value={h24 !== null ? String(h12) : ''}
        onChange={(e) => {
          const newH12 = e.target.value ? parseInt(e.target.value, 10) : null;
          onChange(compose(newH12, minute || '00', isPm));
        }}
        className={inputClass}
        disabled={disabled}
      >
        <option value="">Hour</option>
        {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <select
        value={minute}
        onChange={(e) => {
          if (h24 === null) return;
          onChange(compose(h12, e.target.value, isPm));
        }}
        className={inputClass}
        disabled={disabled}
      >
        <option value="">Min</option>
        {['00', '15', '30', '45'].map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select
        value={h24 !== null ? (isPm ? 'PM' : 'AM') : ''}
        onChange={(e) => {
          if (h24 === null) return;
          onChange(compose(h12, minute || '00', e.target.value === 'PM'));
        }}
        className={inputClass}
        disabled={disabled}
      >
        <option value="">AM/PM</option>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
