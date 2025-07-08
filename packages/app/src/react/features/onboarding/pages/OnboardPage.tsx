// Deprecated: This file is no longer used. It was used to collect user data when they first signed up. This is now handled by /welcome flow.

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { Input as CustomInput } from '@src/react/shared/components/ui/input';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/react/shared/components/ui/select';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { useMutation, useQuery } from '@tanstack/react-query';

const options = [
  { label: '-- Please select --', value: 'none', disabled: true },
  { label: 'Business Owner/Executive', value: 'business' },
  { label: 'Developer/IT', value: 'dev' },
  { label: 'Marketing/Sales', value: 'sales' },
  { label: 'HR', value: 'hr' },
  { label: 'Finance', value: 'finance' },
  { label: 'Student/Other', value: 'other' },
];

type StoreDataType = {
  name: string;
  email: string;
  company?: string;
  jobtype: string;
};

export const OnboardPage = () => {
  const user = useAuthCtx();
  const { userInfo, loading } = user;

  const [error, setError] = useState('');
  const [companyName, setCompanyName] = useState<string>('');
  const [jobFunction, setJobFunction] = useState<string>('none');
  const [firstName, setFirstName] = useState<string>(userInfo.user?.name?.split?.(' ')?.[0] || '');

  const isValidJobFunction = useMemo(() => jobFunction && jobFunction !== 'none', [jobFunction]);
  // company is required if job function is not 'other'
  const isValidCompany = useMemo(
    () => isValidJobFunction && (jobFunction !== 'other' ? companyName?.length > 0 : true),
    [jobFunction, isValidJobFunction, companyName],
  );
  const hasValidValues = useMemo(
    () => firstName && isValidJobFunction && isValidCompany,
    [firstName, isValidCompany, isValidJobFunction],
  );

  // TODO: move this to a file
  const queryData = useQuery<any, any, StoreDataType>({
    queryKey: ['onboard/get-data'],
    queryFn: async () => {
      const response = await fetch('/api/page/onboard/get-data');
      return response.json();
    },
    refetchOnMount: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setFirstName(queryData.data?.name || '');
    setCompanyName(queryData.data?.company || '');
    setJobFunction(options.find((opt) => opt.label === queryData.data?.jobtype)?.value || 'none');
  }, [queryData.data]);

  useEffect(() => {
    // reset error message if all fields are filled
    if (hasValidValues && error) {
      setError('');
    }
  }, [hasValidValues, setError]);

  // TODO: move this to a file
  const storeData = useMutation({
    mutationKey: ['onboard/store-data'],
    mutationFn: async (data: StoreDataType) => {
      const response = await fetch('/api/page/onboard/store-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to store data');
      }

      return response.json();
    },
  });

  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!hasValidValues) {
        setError('Please fill in all fields.');
        return;
      }
      setError('');

      const response = await storeData.mutateAsync({
        name: firstName,
        company: companyName,
        email: userInfo.user.email,
        jobtype: options.find((o) => o.value === jobFunction)?.label,
      });

      if (response.success) {
        window.location.href = '/agents';
      } else {
        setError('Something went wrong while submitting the form. Please try again.');
      }
    },
    [userInfo.user, firstName, jobFunction, companyName, setError, hasValidValues],
  );

  return (
    <div className="bg-gray-900 font-sans text-white fixed left-0 top-0 w-[100vw] h-[100vh] flex gap-10 flex-col md:flex-row items-center justify-center">
      <div className="px-6 space-y-8 w-full md:w-1/3">
        <img src="/img/smythos/logo-with-text-light.svg" className="h-10" alt="SmythOS logo" />
        <h1 className="text-5xl font-bold bg-gradient-to-r from-[#2feabd] to-[#33b4ff] text-transparent bg-clip-text">
          Help Us Set Up Your Account
        </h1>
        <p className="text-xl">
          Please provide us with a few more details to help tailor our services to your needs.
        </p>
      </div>
      <div className="px-6">
        {loading ? (
          <div className="flex items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <form className="p-4 w-96 bg-white rounded-md space-y-4" onSubmit={onSubmit}>
            <CustomInput
              fullWidth
              value={firstName}
              label="What should we call you?"
              placeholder="Indiana Jones, Jeremy Smith"
              onChange={(event) => setFirstName(event?.target?.value)}
            />
            <div className="text-gray-700 mb-1 text-sm font-normal flex flex-col gap-1">
              <span className="text-sm">Job Function</span>
              <Select onValueChange={setJobFunction} defaultValue={jobFunction}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Please select --" />
                </SelectTrigger>
                <SelectContent>
                  {options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {jobFunction && jobFunction !== 'other' && jobFunction !== 'none' && (
              <CustomInput
                fullWidth
                label="Company name"
                value={companyName}
                placeholder="Matrix Inc."
                onChange={(event) => setCompanyName(event?.target?.value)}
              />
            )}
            <div className="flex gap-2 flex-col justify-center items-center text-center">
              {storeData.isLoading ? (
                <Spinner />
              ) : storeData.data?.success ? (
                <p className="text-green-500">You're all set! Hold on ...</p>
              ) : (
                <Button type="submit">Continue</Button>
              )}
              <small className="text-red-500">{error}</small>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
