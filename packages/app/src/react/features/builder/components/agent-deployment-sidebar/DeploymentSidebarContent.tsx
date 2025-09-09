import DeploymentsHistory from '@src/react/features/builder/components/agent-deployment-sidebar/DeploymentsHistory';
import DeploymentStatus from '@src/react/features/builder/components/agent-deployment-sidebar/DeploymentStatus';
import { PRIMARY_BUTTON_STYLE } from '@src/react/shared/constants/style';
import { Tooltip } from 'flowbite-react';
import { useState } from 'react';

const DeploymentSidebarContent = () => {
  const [isOpenModalBtnLoading, setIsOpenModalBtnLoading] = useState(false);

  const handleNavigation = (path) => {
    // Implement navigation logic here, e.g., using window.location
    window.location.href = path;
  };

  return (
    <div>
      <div className="h-16 flex-shrink-0 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.5604 21.75C10.8462 21.747 9.16316 21.2922 7.68084 20.4314C6.19852 19.5706 4.96933 18.3342 4.11721 16.8469C3.26509 15.3595 2.82015 13.6738 2.82723 11.9597C2.83432 10.2456 3.2932 8.56362 4.15758 7.08338C5.02197 5.60314 6.26131 4.37694 7.75069 3.52841C9.24008 2.67987 10.9268 2.23899 12.641 2.25021C14.3551 2.26143 16.0359 2.72435 17.5141 3.5923C18.9922 4.46026 20.2154 5.70256 21.0604 7.19399C21.1415 7.36498 21.155 7.56033 21.0982 7.74086C21.0413 7.9214 20.9183 8.07377 20.7538 8.1674C20.5893 8.26103 20.3955 8.28901 20.2113 8.24572C20.027 8.20243 19.8659 8.09107 19.7603 7.93399C18.7467 6.14468 17.1012 4.79859 15.1465 4.15966C13.1918 3.52074 11.0689 3.63508 9.19411 4.48026C7.31934 5.32544 5.82792 6.84049 5.01232 8.72832C4.19672 10.6161 4.11578 12.7406 4.78536 14.685C5.35829 16.3478 6.44799 17.7839 7.89526 18.7833C9.34252 19.7826 11.0715 20.293 12.8295 20.2397C14.5874 20.1864 16.2823 19.5723 17.6664 18.4871C19.0505 17.4019 20.0512 15.9025 20.5224 14.208C20.5799 14.0216 20.7079 13.865 20.879 13.7714C21.0502 13.6778 21.251 13.6545 21.439 13.7066C21.627 13.7586 21.7873 13.8819 21.886 14.0502C21.9846 14.2184 22.0138 14.4185 21.9673 14.608C21.3932 16.6603 20.1641 18.4687 18.4672 19.7579C16.7702 21.047 14.6984 21.7462 12.5673 21.749L12.5604 21.75Z"
                fill="currentColor"
              ></path>
              <path
                d="M20.6492 8.31853H17.3682C17.1693 8.31853 16.9785 8.23951 16.8379 8.09885C16.6972 7.9582 16.6182 7.76744 16.6182 7.56853C16.6182 7.36961 16.6972 7.17885 16.8379 7.0382C16.9785 6.89755 17.1693 6.81853 17.3682 6.81853H19.8992V4.26953C19.8992 4.07062 19.9782 3.87985 20.1188 3.7392C20.2595 3.59854 20.4503 3.51953 20.6492 3.51953C20.8481 3.51953 21.0389 3.59854 21.1795 3.7392C21.3202 3.87985 21.3992 4.07062 21.3992 4.26953V7.56953C21.3989 7.76827 21.3198 7.95878 21.1791 8.09921C21.0385 8.23965 20.8479 8.31853 20.6492 8.31853Z"
                fill="currentColor"
              ></path>
              <path
                d="M15.3986 15.3164C15.2637 15.3164 15.1313 15.2797 15.0156 15.2104L11.8406 13.3104C11.7291 13.244 11.6367 13.1497 11.5727 13.0368C11.5087 12.9239 11.4752 12.7962 11.4756 12.6664V8.56641C11.4756 8.36749 11.5546 8.17673 11.6953 8.03608C11.8359 7.89543 12.0267 7.81641 12.2256 7.81641C12.4245 7.81641 12.6153 7.89543 12.7559 8.03608C12.8966 8.17673 12.9756 8.36749 12.9756 8.56641V12.2394L15.7846 13.9174C15.9257 14.0016 16.0352 14.1298 16.0963 14.2823C16.1575 14.4348 16.1668 14.6032 16.123 14.7616C16.0791 14.9199 15.9845 15.0595 15.8536 15.1588C15.7228 15.2581 15.5629 15.3118 15.3986 15.3114V15.3164Z"
                fill="currentColor"
              ></path>
            </svg>
            <span className="text-xl font-semibold">Deploy</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="deploy-toggle-modal-btn"
              type="button"
              onClick={() => {
                document.getElementById('deploy-button-topbar').click();
              }}
              className={`${PRIMARY_BUTTON_STYLE} focus:outline-none font-medium rounded text-sm px-5 py-1.5 text-center`}
            >
              {isOpenModalBtnLoading && (
                <svg
                  aria-hidden="true"
                  role="status"
                  id="deploy-toggle-modal-btn-spinner"
                  className="inline w-4 h-4 me-1 text-white animate-spin"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="#E5E7EB"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentColor"
                  />
                </svg>
              )}
              Deploy
            </button>

            <Tooltip content="Close" placement="left" arrow={false}>
              <button
                type="button"
                className="close-btn text-[#757575] hover:bg-gray-100 rounded-lg p-2"
                onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar-request'))}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20.7457 3.32851C20.3552 2.93798 19.722 2.93798 19.3315 3.32851L12.0371 10.6229L4.74275 3.32851C4.35223 2.93798 3.71906 2.93798 3.32854 3.32851C2.93801 3.71903 2.93801 4.3522 3.32854 4.74272L10.6229 12.0371L3.32856 19.3314C2.93803 19.722 2.93803 20.3551 3.32856 20.7457C3.71908 21.1362 4.35225 21.1362 4.74277 20.7457L12.0371 13.4513L19.3315 20.7457C19.722 21.1362 20.3552 21.1362 20.7457 20.7457C21.1362 20.3551 21.1362 19.722 20.7457 19.3315L13.4513 12.0371L20.7457 4.74272C21.1362 4.3522 21.1362 3.71903 20.7457 3.32851Z"
                    fill="#0F0F0F"
                  />
                </svg>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 p-4">
        {/* <div id="deploy-new-updates" className="mb-4">
                    Update log coming soon
                </div> */}

        <DeploymentStatus onNavigate={handleNavigation} />
        <DeploymentsHistory />
      </div>
    </div>
  );
};

export default DeploymentSidebarContent;
