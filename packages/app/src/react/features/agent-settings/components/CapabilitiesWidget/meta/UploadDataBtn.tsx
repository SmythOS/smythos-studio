import { Button as CustomButton } from '@react/shared/components/ui/newDesign/button';
import { useRef, useState } from 'react';

type Props = {
  onUpload: (data: any) => void;
};

const UploadDataBtn = ({ onUpload }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div>
      <CustomButton
        addIcon={!isUploading}
        loading={isUploading}
        disabled={isUploading}
        className="mt-4 m-auto"
        handleClick={() => {
          if (inputRef.current) {
            inputRef.current.click();
          }
        }}
      >
        Upload CSV File
      </CustomButton>
      <input
        type="file"
        accept=".csv"
        onChange={async (e) => {
          const Papa = await import('papaparse');

          const file = e.target.files[0];
          if (file) {
            setIsUploading(true);
            Papa.parse(file, {
              header: true,
              complete: (result) => {
                onUpload(result.data.map((data: any) => ({ ...data })));
                setIsUploading(false);
                if (inputRef.current) {
                  inputRef.current.value = '';
                }
              },
              error: (error) => {
                console.error(error);
                setIsUploading(false);
                if (inputRef.current) {
                  inputRef.current.value = '';
                }
              },
            });
          }
        }}
        ref={inputRef}
        className="hidden"
      />
    </div>
  );
};

export default UploadDataBtn;
