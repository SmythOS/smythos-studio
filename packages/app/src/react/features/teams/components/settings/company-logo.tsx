import { ChangeEvent, FC, RefObject } from 'react';
import { FiUpload } from 'react-icons/fi';

import { Spinner } from '@react/shared/components/ui/spinner';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';

interface CompanyLogoProps {
  canUseWhiteLabel: boolean;
  logo: string;
  teamsAccess: { write: boolean };
  fileInputRef: RefObject<HTMLInputElement>;
  handleLogoChange: (event: ChangeEvent<HTMLInputElement>) => void; // eslint-disable-line no-unused-vars
  isUploadingLogo: boolean;
}

export const CompanyLogo: FC<CompanyLogoProps> = (props) => {
  const { canUseWhiteLabel, logo, teamsAccess, fileInputRef, handleLogoChange, isUploadingLogo } =
    props;

  return (
    <div className="my-8 border border-solid border-gray-200 rounded-lg overflow-hidden">
      <h3 className="text-xl font-medium bg-gray-50 px-8 py-4">Company Branding</h3>

      <div className="flex items-center justify-between gap-4 px-8 py-4">
        {canUseWhiteLabel ? (
          <>
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center overflow-hidden">
              {logo ? (
                <div className="w-full h-full border border-solid border-gray-300 p-1.5 rounded-lg">
                  <img src={logo} alt="Company logo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-full h-full border border-solid border-gray-300 p-1.5 rounded-lg">
                  <div className="w-full h-full bg-gray-200 rounded-md" />
                </div>
              )}
            </div>
            {teamsAccess.write ? (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white hover:bg-gray-50 rounded-lg 
                        border border-solid border-[#757575]  flex items-center gap-2"
                  disabled={isUploadingLogo}
                >
                  {isUploadingLogo ? <Spinner classes="w-4 h-4" /> : <FiUpload color="#404040" />}
                  <span className="text-gray-600">Change logo</span>
                </button>
              </>
            ) : null}
          </>
        ) : (
          <div className="text-gray-600">
            To access space customization and{' '}
            <a
              href={`${SMYTHOS_DOCS_URL}/account-management/spaces-management/#branding-your-space`}
              target="_blank"
              className="text-blue-500 hover:underline"
            >
              whitelabeling
            </a>{' '}
            features,{' '}
            <a href="/plans" className="text-blue-500 hover:underline">
              upgrade
            </a>{' '}
            to Scaleup or Enterprise license.
          </div>
        )}
      </div>
    </div>
  );
};
