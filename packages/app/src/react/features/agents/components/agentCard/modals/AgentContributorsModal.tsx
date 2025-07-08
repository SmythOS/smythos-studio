import Modal from '@react/shared/components/ui/modals/Modal';
import { AgentContributor } from '../types';

interface AgentContributorsModalProps {
  isOpen: boolean;
  contributors: AgentContributor[];
  onClose: () => void;
}

/**
 * Modal component for displaying agent contributors
 */
export function AgentContributorsModal({
  isOpen,
  contributors,
  onClose,
}: AgentContributorsModalProps) {
  return (
    <Modal
      applyMaxWidth={false}
      isOpen={isOpen}
      onClose={onClose}
      title="Agent Contributors"
    >
      <div className="mt-6 space-y-6">
        {contributors.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No contributors found</p>
        ) : (
          contributors.map((contributor) => (
            <div className="flex items-center space-x-2" key={contributor.user.id}>
              {/* User Avatar */}
              {contributor.user?.avatar ? (
                <img
                  src={contributor.user.avatar}
                  alt={contributor.user.name || contributor.user.email}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center">
                  <svg
                    focusable="false"
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="w-4 h-4 fill-gray-600"
                    data-testid="PersonIcon"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}

              {/* User Information */}
              <div className="flex-1">
                <p className="text-sm font-medium tracking-tight text-gray-900 dark:text-white">
                  {contributor.user.name || contributor.user.email}
                  {contributor.isCreator && (
                    <span className="ml-2 text-blue-600 font-semibold">(Creator)</span>
                  )}
                </p>
                {contributor.user.name && contributor.user.email && (
                  <p className="text-xs text-gray-500">{contributor.user.email}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
} 