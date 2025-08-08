import { FC } from 'react';

import { AclSelectRow } from '@react/features/teams/components/roles';
import { AclAccessSymbols } from '@shared/constants/acl.constant';
import templateACLs from '@shared/constants/acl.constant.json';

export type HandleAclChange = { key: string; checked: boolean; ruleSymbol: AclAccessSymbols };
// eslint-disable-next-line no-unused-vars
type Props = { handleAclChange: (props: HandleAclChange) => void; currentAcls: object };
export const AclSelectForm: FC<Props> = ({ handleAclChange, currentAcls }) => {
  return (
    <div className="p-6 space-y-6 max-h-[400px] overflow-y-auto text-[#1E1E1E]">
      <div className="flex justify-between">
        <p className="font-semibold w-32">Access</p>
        <p className="font-semibold w-11">View</p>
        <p className="font-semibold w-11">Edit</p>
      </div>

      {Object.keys(currentAcls)
        .filter((aclKey) => !currentAcls[aclKey].internal && !templateACLs.page[aclKey]?.internal)
        .map((aclKey) => (
          <AclSelectRow
            key={aclKey}
            data={{ key: aclKey, ...currentAcls[aclKey] }}
            handleAclChange={handleAclChange}
          />
        ))}
    </div>
  );
};
