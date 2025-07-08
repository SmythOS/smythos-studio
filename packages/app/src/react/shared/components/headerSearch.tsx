import { ChangeEvent, FC, ReactNode } from 'react';

import { Input } from '@react/shared/components/ui/input';
import { Button } from '@react/shared/components/ui/newDesign/button';

interface HeaderSearchComponent {
  label?: string;
  search?: boolean;
  addIcon?: boolean;
  placeholder?: string;
  isButtonHidden?: boolean;
  handleClick?: () => void;
  isReadOnlyAccess?: boolean;
  btnAttributes?: { [key: string]: string };
  handleChange?: (e: ChangeEvent<HTMLInputElement>) => void; // eslint-disable-line no-unused-vars
  BtnComponent?: ReactNode;
  leftComponent?: ReactNode;
}

const HeaderSearch: FC<HeaderSearchComponent> = ({
  search,
  placeholder,
  addIcon,
  label,
  isReadOnlyAccess,
  isButtonHidden,
  handleClick,
  handleChange,
  btnAttributes,
  BtnComponent,
  leftComponent,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
      {/* Render the left side component (e.g. verification badge, title, etc) */}
      {leftComponent}

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 ml-auto">
        <div className="w-full sm:w-auto">
          <Input
            isSearch={search}
            placeholder={placeholder}
            onChange={handleChange}
            className="w-full"
          />
        </div>
        {!isReadOnlyAccess && !isButtonHidden && (
          <div className="w-full sm:w-auto">
            {BtnComponent ? (
              BtnComponent
            ) : (
              <Button
                dataAttributes={btnAttributes}
                handleClick={handleClick}
                addIcon={addIcon}
                label={label}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderSearch;
