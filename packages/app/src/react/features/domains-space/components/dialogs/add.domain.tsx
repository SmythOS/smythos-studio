import { useMutation } from '@tanstack/react-query';
import { Dispatch, FC, SetStateAction, useState } from 'react';
import { IoArrowBack } from 'react-icons/io5';

import { domainAPI } from '@react/features/domains-space/clients';
import { Input } from '@react/shared/components/ui/input';
import Modal from '@react/shared/components/ui/modals/Modal';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { extractError } from '@react/shared/utils/errors';

interface AddDomainComponent {
  onClose?: () => void;
  setDomainData?: Dispatch<SetStateAction<any[]>>;
}

const modalStepTitles = ['Enter your subdomain', 'Verify your domain'];

export const AddDomain: FC<AddDomainComponent> = ({ onClose, setDomainData }) => {
  const [currStepTitle, setCurrStepTitle] = useState(modalStepTitles[0]);

  return (
    <Modal onClose={onClose} title={currStepTitle} panelClasses="lg:min-w-[48vw] md:min-w-[48vw]">
      <AddDomainContent
        setCurrStepTitle={setCurrStepTitle}
        onClose={onClose}
        setDomainData={setDomainData}
      />
    </Modal>
  );
};

interface AddDomainContentComponent {
  setCurrStepTitle?: Dispatch<SetStateAction<string>>;
  onClose?: () => void;
  setDomainData?: Dispatch<SetStateAction<any[]>>;
  onDomainCreation?: (domainName: any) => void;
}

export const AddDomainContent: FC<AddDomainContentComponent> = ({
  setCurrStepTitle = () => {},
  onClose = () => {},
  setDomainData = () => {},
  onDomainCreation = (domainName: string) => {},
}) => {
  const [domainInput, setInputValue] = useState('');
  const [domainVerificationErr, setDomainVerificationErr] = useState<string | null>(null);
  const [domainVerificationSuccess, setDomainVerificationSuccess] = useState(false);
  const [targetHost, setHost] = useState(null);

  const hostMutation = useMutation({
    mutationFn: domainAPI.getHost,
    onSuccess: (data) => {
      setHost(data.host);
      setCurrStepTitle(modalStepTitles[1]);
    },
  });

  const domainVerificationMutation = useMutation({
    mutationFn: domainAPI.verifyDomain,
    mutationKey: ['verifyDomain'],
    onSuccess: () => setDomainVerificationSuccess(true),
  });

  const createDomain = useMutation({ mutationFn: domainAPI.postDomain });

  const handleDomainChange = (value: string) => {
    const regex = /^(www\.)?([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const sanitizedValue: string = value.replace(/^(http:\/\/|https:\/\/)/, '').trim();
    const validDomain = regex.test(sanitizedValue);

    if (validDomain) {
      const domainParts = sanitizedValue.split('.');
      // check if it is not a subdomain, if so, tell user to enter a subdomain
      if (domainParts.length < 3) {
        setDomainVerificationErr(
          'Enter a valid subdomain, using subdomains allows you to host multiple agents on the same top domain.',
        );
      } else setDomainVerificationErr(null);
    } else setDomainVerificationErr('Please enter a valid domain.');

    setInputValue(value);
    return;
  };

  const handleDomainChoiceSubmit = async () => {
    if (domainVerificationErr) return;
    await hostMutation.mutateAsync(domainInput);
  };

  const resetModal = () => {
    setHost(null);
    setDomainVerificationSuccess(false);
    setCurrStepTitle(modalStepTitles[0]);
    setDomainVerificationErr(null);
    setDomainVerificationSuccess(false);
    domainVerificationMutation.reset();
    hostMutation.reset();
    createDomain.reset();
  };

  const handleDomainSubmission = async () => {
    if (createDomain.isLoading) return;
    const res = await createDomain.mutateAsync({ name: domainInput });
    const json = await res.json();
    setDomainData((prevDomainData) => [json.domain, ...prevDomainData]);
    onDomainCreation(domainInput);
    onClose();
  };

  return (
    <div className="pt-5">
      {targetHost && (
        <div className="flex items-center cursor-pointer pt-2 pb-2 min-w-fit" onClick={resetModal}>
          <IoArrowBack className="mr-1" />
          <span>Back</span>
        </div>
      )}

      {!targetHost && (
        <div>
          <div className="flex items-center w-full py-3">
            <Input
              value={domainInput}
              onChange={(event) => handleDomainChange(event.target.value)}
              fullWidth
              placeholder="Ex: smyth.mydomain.com"
            />
            <Button
              handleClick={handleDomainChoiceSubmit}
              disabled={
                hostMutation.isLoading ||
                domainVerificationMutation.isLoading ||
                Boolean(domainVerificationErr) ||
                !domainInput?.trim()
              }
              className="mt-1 ml-2 "
              label="Next"
              loading={hostMutation.isLoading}
            />
          </div>
          {domainVerificationErr && (
            <p className="m-0 pt-1 text-red-600 text-sm">{domainVerificationErr}</p>
          )}
          {hostMutation.isError && (
            <p className="m-0 pt-1 text-red-600 text-sm" id="error">
              {extractError(hostMutation.error) || 'Something went wrong'}
            </p>
          )}
        </div>
      )}

      {targetHost && (
        <div>
          <p className="py-4">Create a CNAME record with the following values then click verify.</p>
          <div className="border secondary-grey border-solid rounded-md border-[#DFDFDF] p-3">
            <div>
              <span className="font-bold">Host: </span>
              <span id="hostValue" className="break-all">
                {' '}
                {domainInput}
              </span>
            </div>
            <div className="pt-2">
              <span className="font-bold">Target:</span>
              <span className="break-all"> {hostMutation.data?.host}</span>
            </div>
          </div>

          <p className="mt-4">
            <span className=" font-semibold">Note:</span> It may take up to 24 hours for the changes
            to take effect because of DNS propagation.
          </p>

          {!domainVerificationSuccess && (
            <Button
              handleClick={() => domainVerificationMutation.mutate(domainInput)}
              className="mt-4 bg-v2-blue"
              label="Verify"
              loading={domainVerificationMutation.isLoading}
              fullWidth
            />
          )}

          {domainVerificationMutation.isSuccess && (
            <p className="success-text mt-2 text-center">Domain verified successfully ✅</p>
          )}
          {domainVerificationMutation.isError && (
            <p className="m-0 pt-1 text-red-600 text-sm mt-2" id="error">
              {extractError(domainVerificationMutation.error) || 'Something went wrong'}
            </p>
          )}

          {domainVerificationSuccess && (
            <Button
              handleClick={handleDomainSubmission}
              className="mt-4 bg-v2-blue"
              label="Add Domain"
              disabled={!domainVerificationMutation.isSuccess || createDomain.isLoading}
              loading={createDomain.isLoading}
              fullWidth
            />
          )}

          {createDomain.isError && (
            <div className="pt-2 text-red-600 text-sm">
              {extractError(createDomain.error) || 'Something went wrong'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
