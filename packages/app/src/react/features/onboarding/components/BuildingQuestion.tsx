import { Spinner } from '@src/react/shared/components/ui/spinner';
import { MAX_CHAT_MESSAGE_LENGTH } from '@src/react/shared/constants';
import { useQuery } from '@tanstack/react-query';
import classNames from 'classnames';
import { ChangeEvent, useEffect, useState } from 'react';

export const BuildingQuestion = ({ setData, setIsContinueDisabled }) => {
  const [inputValue, setInputValue] = useState('');
  const MAX_CHAR_LIMIT = MAX_CHAT_MESSAGE_LENGTH;

  const queryData = useQuery({
    queryKey: ['onboard/get-building-data'],
    queryFn: async () => {
      const response = await fetch('/api/page/onboard/get-building-data');
      return response.json();
    },
    refetchOnMount: true,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setInputValue(queryData.data?.value || '');
  }, [queryData.data]);

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (event.target.value.length < MAX_CHAR_LIMIT) {
      setData({ value: event.target.value });
    }
    setInputValue(event.target.value);
  };

  useEffect(() => {
    setIsContinueDisabled(inputValue.length < 1 || inputValue.length > MAX_CHAR_LIMIT - 1);
  }, [inputValue]);

  // more descriptive name
  const charCount = inputValue.length;

  return (
    <div className="pb-0 md:pb-[60px] text-center md:px-[84px] px-0">
      {queryData.isFetching && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 w-full h-full">
          <Spinner />
        </div>
      )}
      <h1 className="w-full text-center font-medium mb-6 md:mb-6 text-2xl">
        What are you building?
      </h1>
      <textarea
        value={inputValue}
        onChange={handleInputChange}
        placeholder="I'm building an agent that will ..."
        className="w-full border-1 border-solid border-gray-300 max-h-48 h-48 rounded-md p-3 
        resize-none outline-0 focus:outline-0 focus:ring-0 focus:border-gray-500"
      />
      <div
        className={classNames('text-right font-medium text-xs tracking-wider', {
          'text-red-500': charCount > MAX_CHAR_LIMIT - 1,
          'text-gray-500': charCount <= MAX_CHAR_LIMIT - 1,
        })}
      >
        {`${charCount}/${MAX_CHAR_LIMIT}`}
      </div>
    </div>
  );
};
