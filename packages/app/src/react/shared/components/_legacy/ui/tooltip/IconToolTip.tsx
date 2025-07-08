import React from 'react';
import ToolTip from './tooltip';

interface IconToolTipProps {
  html: string;
  classes?: string;
  reCalculateOnShow?: boolean;
  arrowClasses?: string;
  iconClassName?: string;
}

const IconToolTip: React.FC<IconToolTipProps> = ({
  html,
  classes = 'w-56',
  reCalculateOnShow = true,
  iconClassName = 'w-4 h-4',
  arrowClasses = '',
}) => {
  return (
    <ToolTip
      reCalculateOnShow={reCalculateOnShow}
      classes={classes}
      arrowClasses={arrowClasses}
      html={html}
      children={
        <img
          className={iconClassName}
          onMouseEnter={(e) => (e.currentTarget.src = '/img/icons/infohover.svg')}
          onMouseLeave={(e) => (e.currentTarget.src = '/img/icons/infodefault.svg')}
          src="/img/icons/infodefault.svg"
          alt="info"
        />
      }
    />
  );
};

export default IconToolTip;
