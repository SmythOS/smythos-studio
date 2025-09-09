import { Dialog, Transition } from '@headlessui/react';
import { BackButtonWithTail, CloseIcon } from '@react/shared/components/svgs';
import classNames from 'classnames';
import React, { Fragment } from 'react';

type Props = {
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  isOpen?: boolean;
  description?: string;
  panelClasses?: string;
  applyMaxWidth?: boolean;
  hideCloseIcon?: boolean;
  containerStyles?: string;
  panelWidthClasses?: string;
  panelWrapperClasses?: string;
  showOverflow?: boolean;
  onBack?: () => void;
};

const Modal = ({
  onClose,
  children,
  title,
  description,
  applyMaxWidth = true,
  containerStyles = 'px-6 pt-7 pb-7',
  isOpen = true,
  panelWrapperClasses = '',
  panelClasses = '',
  panelWidthClasses = '',
  hideCloseIcon = false,
  showOverflow = false,
  onBack,
}: Props) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClick={(e) => {
          e.stopPropagation();
        }}
        onClose={onClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className={panelWrapperClasses}>
                <Dialog.Panel
                  className={classNames(
                    'transform rounded-xl bg-white p-6 text-left align-middle shadow-xl transition-all',
                    !panelWidthClasses ? (applyMaxWidth ? 'max-w-md' : 'max-w-full') : '',
                    panelClasses,
                    panelWidthClasses ? panelWidthClasses : 'w-full',
                    !showOverflow ? 'overflow-hidden' : '',
                  )}
                >
                  <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-[#1E1E1E]">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          {onBack && (
                            <div
                              className="cursor-pointer w-8 h-8 bg-transparent rounded-lg hover:text-gray-900 hover:bg-gray-100 p-2 flex items-center justify-center"
                              onClick={onBack}
                            >
                              <BackButtonWithTail width={16} height={16} />
                            </div>
                          )}
                          <span className="text-xl font-semibold text-[#1E1E1E]">{title}</span>
                        </div>
                        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
                      </div>

                      {!hideCloseIcon && (
                        <div
                          className="cursor-pointer w-8 h-8 bg-transparent rounded-lg hover:text-gray-900 hover:bg-gray-100 p-2 flex items-center justify-center -mr-2 -mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                          }}
                        >
                          <CloseIcon width={16} height={16} />
                        </div>
                      )}
                    </div>
                  </Dialog.Title>
                  <div className="mt-2">{children}</div>
                </Dialog.Panel>
              </div>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Modal;
