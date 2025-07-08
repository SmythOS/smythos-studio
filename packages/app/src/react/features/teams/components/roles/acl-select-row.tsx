/* eslint-disable max-len */
import { FC } from 'react';

import { HandleAclChange } from '@react/features/teams/components/roles';
import { AclAccessSymbols, AclRule } from '@shared/constants/acl.constant';

// eslint-disable-next-line no-unused-vars
type Props = { data: AclRule & { key: string }; handleAclChange: (props: HandleAclChange) => void };
export const AclSelectRow: FC<Props> = (props) => {
  const aclRuleToBooleans = (aclRule: AclRule) => {
    return { canView: aclRule.access.includes('r'), canEdit: aclRule.access.includes('w') };
  };
  const aclRuleBooleans = aclRuleToBooleans(props.data);

  const handleChange = (checked: boolean, ruleSymbol: AclAccessSymbols) => {
    props.handleAclChange({ key: props.data.key, checked, ruleSymbol });
  };

  return (
    <div className="flex justify-between align-center">
      <p className="text-gray-900 dark:text-white w-32">{props.data.name ?? props.data.key}</p>

      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          value=""
          className="sr-only peer"
          checked={aclRuleBooleans.canView}
          onChange={(e) => handleChange(e.target.checked, 'r')}
        />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
        <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300" />
      </label>

      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          value=""
          className="sr-only peer"
          checked={aclRuleBooleans.canEdit}
          onChange={(e) => {
            handleChange(e.target.checked, 'w');
            if (!e.target.checked) return;
            handleChange(e.target.checked, 'r');
          }}
        />
        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
        <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300" />
      </label>
    </div>
  );
};
