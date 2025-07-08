/* eslint-disable max-len */
/* eslint-disable no-unused-vars */
import classNames from 'classnames';
import { FC, FocusEvent, useEffect, useRef, useState } from 'react';
import { FaAngleDown } from 'react-icons/fa6';

type Option = { id: string; name: string };

interface AssignTeamDropdownProps {
  options: Option[];
  onChange: (value: string) => void;
  onInputChange?: (value: string) => void;
  inputValue?: string;
  useInputValue?: boolean;
  value: string;
  disabled?: boolean;
  placeholder: string;
  dropDownClasses?: string;
  onBlur?: (value: string) => void;
  isEmailDropdown?: boolean;
}

export const AssignTeamDropdown: FC<AssignTeamDropdownProps> = ({
  options = [],
  onChange,
  onInputChange,
  inputValue,
  useInputValue,
  value,
  placeholder,
  disabled,
  dropDownClasses,
  onBlur,
  isEmailDropdown,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = useState(value || '');

  const handleOptionClick = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchValue(options?.find((option) => option.id === optionId).name);
    onInputChange?.(options?.find((option) => option.id === optionId).name);
  };

  const toggleDropdown = () => setIsOpen(!isOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    if (value) {
      onChange(value);
      setSearchValue(options?.find((option) => option.id === value)?.name || '');
    }
  }, [value, options]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (onBlur) onBlur(e.target.value);
  };

  return (
    <div className="relative inline-block text-left w-full my-2" ref={dropdownRef}>
      <div>
        <input
          autoComplete="off"
          type="text"
          className={classNames(
            `
            h-9 w-full bg-white 
            border
            text-gray-900
            rounded
            block 
            outline-none
            focus:outline-none
            focus:ring-0
            focus:ring-offset-0
            focus:ring-shadow-none
            text-sm 
            font-normal
            placeholder:text-sm
            placeholder:font-normal`,
            'pl-2 pr-6 py-2',
            'border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500',
            { 'bg-gray-100': disabled },
          )}
          disabled={disabled}
          id="options-menu"
          aria-haspopup="true"
          aria-expanded="true"
          onClick={toggleDropdown}
          onChange={(e) => {
            setSearchValue(e.target.value);
            onInputChange(e.target.value);
          }}
          value={useInputValue ? inputValue : searchValue}
          // value={searchValue}
          placeholder={placeholder}
          onBlur={handleBlur}
          data-qa={isEmailDropdown ? 'create-new-space-email-dropdown' : 'role-dropdown'}
        />
        <FaAngleDown className="absolute right-2 top-[calc(50%_-_8px)] transition duration-300 pointer-events-none" />
      </div>

      {isOpen && (
        <div
          className={classNames(
            'absolute right-0 z-10 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none',
            dropDownClasses,
          )}
        >
          <div
            className="py-1"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="options-menu"
          >
            {options
              ?.filter((option) => option.name.toLowerCase().includes(searchValue.toLowerCase()))
              .concat(
                options.filter(
                  (option) => !option.name.toLowerCase().includes(searchValue.toLowerCase()),
                ),
              )
              .map((option) => (
                <button
                  key={option.id}
                  className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 text-left"
                  role="menuitem"
                  onClick={() => handleOptionClick(option.id)}
                >
                  {option.name}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
