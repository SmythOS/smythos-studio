import classNames from 'classnames';
import { CustomFlowbiteTheme, Tooltip } from 'flowbite-react';
import { isNil } from 'lodash-es';
import React from 'react';

type Props = {
  children: React.ReactNode;
  title?: string;
  addEmptyTitlePadding?: boolean;
  showOverflow?: boolean;
  isWriteAccess?: boolean;
  hasBorder?: boolean;
};

const customTheme: CustomFlowbiteTheme['tooltip'] = {
  target: 'w-full',
};

const WidgetCardChild = ({ hasBorder = true, ...props }: Props) => {
  return (
    <div className={props.isWriteAccess === false ? 'pointer-events-none' : ''}>
      {props.addEmptyTitlePadding && <span className="mt-9 block"> </span>}
      {!isNil(props.title) && <h3 className="font-semibold mb-3">{props.title}</h3>}
      <div
        className={classNames(
          'rounded-lg',
          hasBorder ? 'border border-solid border-gray-200' : '',
          props.showOverflow ? ' [&>div]:rounded-lg' : 'overflow-hidden',
        )}
      >
        {props.children}
      </div>
    </div>
  );
};

const WidgetCard = ({ hasBorder = true, ...props }: Props) => {
  return !props.isWriteAccess &&
    props.isWriteAccess !== undefined &&
    props.isWriteAccess !== null ? (
    <Tooltip
      content={'You do not have permission to make changes to this widget'}
      placement="top"
      theme={customTheme}
    >
      <WidgetCardChild hasBorder={hasBorder} {...props} />
    </Tooltip>
  ) : (
    <WidgetCardChild hasBorder={hasBorder} {...props} />
  );
};

export default WidgetCard;
