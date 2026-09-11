import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Clock } from 'lucide-react';

interface CollectionTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const inputClass =
  'flex-1 px-3 py-2 border border-fergbutcher-brown-300 rounded-lg focus:ring-2 focus:ring-fergbutcher-green-500 focus:border-transparent';

const minuteOptions = ['00', '15', '30', '45'];
const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));

const toPickerParts = (value: string) => {
  if (!value) return { hour: '12', minute: '00', period: 'AM' };

  const [hours, minutes] = value.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour = hours % 12 || 12;
  const closestMinute = minuteOptions.reduce((closest, option) =>
    Math.abs(Number(option) - minutes) < Math.abs(Number(closest) - minutes) ? option : closest
  );

  return { hour: String(hour).padStart(2, '0'), minute: closestMinute, period };
};

const toValue = (hour: string, minute: string, period: string) => {
  let hours = Number(hour) % 12;
  if (period === 'PM') hours += 12;
  return `${String(hours).padStart(2, '0')}:${minute}`;
};

export default function CollectionTimePicker({ value, onChange, disabled }: CollectionTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const parts = toPickerParts(value);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const updateTime = (part: 'hour' | 'minute' | 'period', nextValue: string) => {
    const nextParts = { ...parts, [part]: nextValue };
    onChange(toValue(nextParts.hour, nextParts.minute, nextParts.period));
  };

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`${inputClass} flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className={value ? 'text-fergbutcher-black-900' : 'text-fergbutcher-brown-400'}>
          {value ? `${parts.hour}:${parts.minute} ${parts.period}` : 'Select time'}
        </span>
        <Clock className="h-4 w-4 text-fergbutcher-brown-500" />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Select collection time"
          className="absolute z-50 mt-2 w-full min-w-[220px] rounded-lg border border-fergbutcher-brown-300 bg-white p-3 shadow-lg"
        >
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs font-medium text-fergbutcher-brown-600">
              Hour
              <select
                value={parts.hour}
                onChange={event => updateTime('hour', event.target.value)}
                className="mt-1 w-full rounded border border-fergbutcher-brown-300 px-2 py-2 text-sm text-fergbutcher-black-900 focus:border-transparent focus:ring-2 focus:ring-fergbutcher-green-500"
              >
                {hourOptions.map(hour => <option key={hour} value={hour}>{hour}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-fergbutcher-brown-600">
              Minute
              <select
                value={parts.minute}
                onChange={event => updateTime('minute', event.target.value)}
                className="mt-1 w-full rounded border border-fergbutcher-brown-300 px-2 py-2 text-sm text-fergbutcher-black-900 focus:border-transparent focus:ring-2 focus:ring-fergbutcher-green-500"
              >
                {minuteOptions.map(minute => <option key={minute} value={minute}>{minute}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-fergbutcher-brown-600">
              Period
              <select
                value={parts.period}
                onChange={event => updateTime('period', event.target.value)}
                className="mt-1 w-full rounded border border-fergbutcher-brown-300 px-2 py-2 text-sm text-fergbutcher-black-900 focus:border-transparent focus:ring-2 focus:ring-fergbutcher-green-500"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </label>
          </div>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="mt-3 text-xs font-medium text-fergbutcher-brown-600 hover:text-fergbutcher-black-900"
            >
              Clear time
            </button>
          )}
        </div>
      )}
      <ChevronDown className="pointer-events-none absolute right-9 top-1/2 h-4 w-4 -translate-y-1/2 text-fergbutcher-brown-400" />
    </div>
  );
}
