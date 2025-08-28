import { Dialog, Transition } from '@headlessui/react';
import classNames from 'classnames';
import React, { Fragment } from 'react';
import { IoClose } from 'react-icons/io5';

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
                      <div>
                        <span className="mb-1">{title}</span>
                        {description && <p className="text-sm text-gray-500">{description}</p>}
                      </div>

                      {!hideCloseIcon && (
                        <IoClose
                          className="cursor-pointer"
                          size={22}
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                          }}
                        />
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
