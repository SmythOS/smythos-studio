import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export const baseStyle = {
  background: '#f1f3f4',
  color: '#696969',
};
export function UnitSelector({
  unit,
  onChange: handleUnitChange,
  unitOptions,
  currentCount,
  ...htmlSelectRestProps
}: {
  unit: string;
  onChange: (unit: string) => void;
  currentCount: number;
  unitOptions: { value: string; labelSingular: string; labelPlural: string }[];
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...htmlSelectRestProps}
        value={unit}
        onChange={(e) => handleUnitChange(e.target.value)}
        style={baseStyle}
        className="appearance-none block border-none rounded pr-8 leading-tight focus:outline-none focus:bg-gray focus:border-gray-500 text-sm"
      >
        {unitOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {currentCount === 1 ? option.labelSingular : option.labelPlural}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg
          width="12"
          height="12"
          viewBox="0 0 7 4"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3.48846 3.99268L0.467366 0.468627L6.50956 0.468628L3.48846 3.99268Z"
            fill="#696969"
          />
        </svg>
      </div>
    </div>
  );
}

export function UnitNumberInput({
  count,
  onChange,
  unit,
  min,
  max,
  ...htmlInputRestProps
}: {
  count: number;
  onChange: (count: number) => void;
  unit: string;
  min: number;
  max: number;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...htmlInputRestProps}
      type="number"
      value={count}
      onChange={(e) =>
        onChange(
          Number.isNaN(parseInt(e.target.value)) ? min : Math.min(max, parseInt(e.target.value)),
        )
      }
      style={baseStyle}
      className="input-no-spinners appearance-none block w-16 border-none rounded leading-tight focus:outline-none focus:bg-gray text-sm"
    />
  );
}

export function DaySelector({
  selectedDaysIndices,
  toggleDay,
}: {
  selectedDaysIndices: number[];
  toggleDay: (index: number) => void;
}) {
  return (
    <div className="flex items-center mb-4 mt-1">
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
        <button
          key={index}
          onClick={() => toggleDay(index)}
          style={{
            ...baseStyle,
            margin: '0 2px',
            width: '35px',
            height: '35px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            cursor: 'pointer',
            backgroundColor: selectedDaysIndices.includes(index) ? '#1A73E8' : baseStyle.background,
            color: selectedDaysIndices.includes(index) ? '#FFFFFF' : baseStyle.color,
          }}
        >
          {day}
        </button>
      ))}
    </div>
  );
}

export function RadioButton({
  name,
  value,
  checked,
  onChange,
  label,
  content,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  content?: ReactNode;
}) {
  return (
    <label className="flex items-center mb-2">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="form-radio h-4 w-4"
      />
      <span className="ml-2">{label}</span>
      {content}
    </label>
  );
}
