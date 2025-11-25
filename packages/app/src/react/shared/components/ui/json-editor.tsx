import { ChangeEvent, FC, useEffect, useState } from 'react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  height?: string;
  error?: string | null;
}

/**
 * A simple JSON editor component with syntax validation
 * Can be upgraded to use Ace Editor or CodeMirror in the future
 */
export const JsonEditor: FC<JsonEditorProps> = ({
  value,
  onChange,
  placeholder = '{\n  "key": "value"\n}',
  disabled = false,
  height = '200px',
  error = null,
}) => {
  const [localError, setLocalError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Validate JSON if not empty
    if (newValue.trim()) {
      try {
        JSON.parse(newValue);
        setLocalError(null);
      } catch (err) {
        setLocalError((err as Error).message);
      }
    } else {
      setLocalError(null);
    }
  };

  useEffect(() => {
    // Clear local error when external error is provided
    if (error) {
      setLocalError(null);
    }
  }, [error]);

  const displayError = error || localError;

  return (
    <div className="w-full">
      <div className="relative">
        <textarea
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-3 py-2 
            border ${displayError ? 'border-red-300' : 'border-gray-300'} 
            rounded-md shadow-sm 
            focus:outline-none focus:ring-2 
            ${displayError ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'}
            disabled:bg-gray-100 disabled:cursor-not-allowed 
            font-mono text-sm
            resize-y
          `}
          style={{ 
            minHeight: height,
            tabSize: 2,
          }}
          spellCheck={false}
        />
      </div>
      {displayError && (
        <p className="mt-1 text-xs text-red-600">
          {displayError}
        </p>
      )}
    </div>
  );
};

