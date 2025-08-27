import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export const baseStyle = {
  background: '#ffffff',
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
        className="py-2 px-3 border text-gray-900 rounded block w-full outline-none
          focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none
          text-sm font-normal placeholder:text-sm placeholder:font-normal box-border mb-[1px] focus:mb-0
          border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500
          appearance-none pr-8"
      >
        {unitOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {currentCount === 1 ? option.labelSingular : option.labelPlural}
          </option>
        ))}
      </select>
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
      className="py-2 px-3 border text-gray-900 rounded block w-16 outline-none
        focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none
        text-sm font-normal placeholder:text-sm placeholder:font-normal box-border mb-[1px] focus:mb-0
        border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500
        input-no-spinners appearance-none"
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
            border: selectedDaysIndices.includes(index) ? '1px solid #1A73E8' : '1px solid #E0E0E0',
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
