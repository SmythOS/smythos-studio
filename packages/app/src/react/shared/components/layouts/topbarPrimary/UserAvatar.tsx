/* eslint-disable max-len */
import { Menu } from '@headlessui/react';
import { lsCache } from '@shared/Cache.class';
import { VAULT_DATA_CACHE_KEY } from '@shared/constants/general';
import { Link } from 'react-router-dom';

export const UserAvatar = ({ user, profilePages }) => {
  const handleSignOut = () => {
    lsCache.delete(VAULT_DATA_CACHE_KEY); // clear vault data from local storage
    window.location.href = '/logto/sign-out';
  };

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex text-sm rounded-full" data-qa="user-profile-button" >
        <span className="sr-only">Open user menu</span>
        {user?.avatar ? (
          <img
            className="w-[38px] h-[38px] rounded-full"
            src={user.avatar}
            alt="user photo"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/img/user_default.svg';
            }}
          />
        ) : (
          <div className="bg-uipink rounded-full w-[38px] h-[38px] flex items-center justify-center text-white font-medium text-xl">
            {(user?.name || user?.email || 'A').charAt(0).toLocaleUpperCase()}
          </div>
        )}
      </Menu.Button>

      <Menu.Items className="absolute right-0 z-50 mt-2 w-48 text-base list-none bg-white divide-y divide-gray-100 rounded-lg shadow">
        <div className="px-4 pt-3 pb-1">
          <span className="block text-sm text-gray-900">{user?.name}</span>
          <span className="block text-sm text-gray-500 truncate">{user?.email}</span>
        </div>
        <ul className="pb-2">
          {profilePages?.map((page) => (
            <Menu.Item key={page.url}>
              {({ active }) => (
                <Link
                  to={page.url}
                  reloadDocument={page.reload}
                  className={`block px-4 py-2 text-sm ${active ? 'bg-gray-100' : 'text-gray-700'}`}
                >
                  {page.name}
                </Link>
              )}
            </Menu.Item>
          ))}
          <Menu.Item>
            {({ active }) => (
              <a
                onClick={handleSignOut}
                href="#"
                className={`block px-4 py-2 text-sm ${active ? 'bg-gray-100' : 'text-gray-700'}`}
              >
                Sign Out
              </a>
            )}
          </Menu.Item>
        </ul>
      </Menu.Items>
    </Menu>
  );
};
