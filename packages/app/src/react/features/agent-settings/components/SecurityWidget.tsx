import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import { useAgentSettingsCtx } from '@react/features/agent-settings/contexts/agent-settings.context';
import classNames from 'classnames';
import { useState } from 'react';

type Props = {};

const SecurityWidget = (props: Props) => {
  const { agentQuery, teamRolesQuery } = useAgentSettingsCtx();

  const [isEditingRoles, setIsEditingRoles] = useState(false);

  // ! TEMP until we have the real data
  const [enabledRolesIds, setEnabledRolesIds] = useState<number[]>([590]);
  const [uncommitedRolesIds, setUncommitedRolesIds] = useState<number[]>([]);

  const handleItemToggle = async ({ role, active }) => {
    if (active) {
      setUncommitedRolesIds((prev) => [...prev, role.id as unknown as number]);
    } else {
      setUncommitedRolesIds((prev) => prev.filter((id) => id !== role.id));
    }
  };

  function handleStartEditing(): void {
    if (!teamRolesQuery.isSuccess) return;
    // start the template with the current enabled roles
    setUncommitedRolesIds(enabledRolesIds);
    setIsEditingRoles(true);
  }

  async function handleSubmit() {
    // stimulate the api call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setEnabledRolesIds(uncommitedRolesIds);
    setUncommitedRolesIds([]);
    setIsEditingRoles(false);
  }

  function handleDiscardChanges() {
    setUncommitedRolesIds([]);
    setIsEditingRoles(false);
  }

  return (
    <WidgetCard title="Security">
      <div className="bg-white p-4 ">
        <div className="flex justify-between items-center flex-col">
          <div className="w-full">
            <h3 className="font-semibold mb-1">Managers</h3>
            <p className="text-sm text-gray-500">Who is your agent allowed to speak with?</p>
          </div>

          <div className="w-full mt-6">
            {teamRolesQuery.isSuccess && (
              <div className="flex gap-2 flex-wrap w-full">
                {isEditingRoles &&
                  teamRolesQuery.data?.roles.map((role) => (
                    <TeamRoleItem
                      role={role}
                      onItemToggle={handleItemToggle}
                      initialActive={uncommitedRolesIds.includes(role.id as unknown as number)}
                      key={role.id}
                    />
                  ))}

                {!isEditingRoles &&
                  teamRolesQuery.data?.roles
                    .filter((role) => enabledRolesIds.includes(role.id as unknown as number))
                    .map((role) => (
                      <TeamRoleItem
                        role={role}
                        onItemToggle={handleItemToggle}
                        initialActive={false}
                        key={role.id}
                      />
                    ))}
              </div>
            )}

            {teamRolesQuery.isLoading && (
              <div className="flex gap-2 flex-wrap w-full">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-7 bg-gray-200 rounded-md dark:bg-gray-700 w-20"
                  ></div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end w-full mt-4">
            {!isEditingRoles && (
              <button
                type="button"
                onClick={handleStartEditing}
                className="bg-transparent flex items-center "
                disabled={false}
              >
                <img src="/img/icons/Edit-blue.svg" className="w-4 h-4" />
                <p className="ml-2 text-primary-500">Edit</p>
              </button>
            )}

            {isEditingRoles && (
              <>
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  className="mt-4  bg-transparent font-semibold"
                  disabled={false}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  className="mt-4 bg-transparent font-semibold text-primary-500 ml-5"
                  disabled={false}
                >
                  Save
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
};

function TeamRoleItem({ role, onItemToggle, initialActive: active }) {
  return (
    <button
      key={role.id}
      onClick={async () => {
        await onItemToggle({ role, active: !active });
        // setActive((prev) => !prev);
      }}
      className={classNames(
        `cursor-pointer ${active ? 'text-white' : ''} whitespace-nowrap`,
        active ? 'bg-blue-500' : 'bg-[#EBEBEF]',
        'rounded-md px-3 py-1 text-sm font-semibold',
      )}
    >
      {role.name}
    </button>
  );
}

export default SecurityWidget;
