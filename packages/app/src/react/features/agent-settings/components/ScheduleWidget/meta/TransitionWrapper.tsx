import { Transition } from '@headlessui/react';
import { ReactNode, useEffect, useState } from 'react';

type Props = {
  children: ReactNode;
};

const TransitionWrapper = (props: Props) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  return (
    <Transition
      show={show}
      enter="transform transition ease-in-out duration-500 sm:duration-700"
      enterFrom="translate-x-full"
      enterTo="translate-x-0"
      leave="transform transition ease-in-out duration-500 sm:duration-700"
      leaveFrom="translate-x-0"
      leaveTo="translate-x-full"
    >
      <div className="overflow-hidden">{props.children}</div>
    </Transition>
  );
};

export default TransitionWrapper;
