/* eslint-disable max-len */
import classNames from 'classnames';
import { ReactNode } from 'react';

import { CloseIcon } from '@react/shared/components/svgs';
import { Button } from '@react/shared/components/ui/newDesign/button';

type Props = {
  onClose: () => void;
  label: string;
  handleConfirm: () => void;
  handleCancel?: () => void;
  message: string;
  lowMsg?: string;
  hideCancel?: boolean;
  cancelLabel?: string;
  confirmBtnClasses?: string;
  cancelBtnClasses?: string;
  children?: ReactNode;
  isLoading?: boolean;
};

const ConfirmModal = (props: Props) => {
  return (
    <div
      id="confirmDialogModal"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center w-full h-screen bg-black bg-opacity-50 p-4 overflow-x-hidden overflow-y-auto"
      onClick={props.onClose}
    >
      <div
        className="relative w-full max-w-2xl p-4 bg-white rounded-lg shadow dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex flex-wrap justify-between items-start p-4 border-b dark:border-gray-600">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">{props.message}</h3>
          {props?.lowMsg && (
            <p className={classNames('text-sm text-gray-900', { 'pt-4': props.message })}>
              {props.lowMsg}
            </p>
          )}
          <button
            type="button"
            className="absolute right-4 inline-flex items-center justify-center w-8 h-8 ml-auto text-sm text-gray-400 bg-transparent rounded-lg hover:text-gray-900 hover:bg-gray-200 dark:hover:bg-gray-600 dark:hover:text-white"
            onClick={props.onClose}
          >
            <CloseIcon />
          </button>
        </div>

        {props.children && props.children}

        {/* Code snippet textarea */}
        <div className="px-6 pt-2 pb-4">
          {/* <p className="mb-4 text-sm text-gray-900">{props.message}</p> */}
          <div className="flex justify-end items-center flex-row gap-2">
            {props.handleCancel && (
              <Button
                variant={'secondary'}
                className={classNames('mr-2', props.cancelBtnClasses, {
                  hidden: props.hideCancel,
                })}
                handleClick={props.handleCancel}
              >
                {props.cancelLabel || 'Cancel'}
              </Button>
            )}
            <Button handleClick={props.handleConfirm} loading={props.isLoading}>
              {props.label || 'Confirm'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
