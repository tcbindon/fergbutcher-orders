interface CollectionTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const inputClass =
  'flex-1 px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent';

export default function CollectionTimePicker({ value, onChange, disabled }: CollectionTimePickerProps) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => {
        const val = e.target.value;
        if (!val) return;
        const [h, m] = val.split(':');
        const minute = parseInt(m, 10);
        const snapped = Math.round(minute / 15) * 15 % 60;
        onChange(`${h}:${String(snapped).padStart(2, '0')}`);
      }}
      step={900}
      className={inputClass}
      disabled={disabled}
    />
  );
}
