import Modal from '@react/shared/components/ui/modals/Modal';
import { AgentActivity } from '../types';

interface AgentActivityModalProps {
  isOpen: boolean;
  activities: AgentActivity[];
  onClose: () => void;
}

/**
 * Modal component for displaying agent activity/change log
 */
export function AgentActivityModal({ isOpen, activities, onClose }: AgentActivityModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change log">
      <div className="mt-6 space-y-6 min-w-[240px]">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No activity recorded</p>
        ) : (
          activities.map((activity) => (
            <div className="flex items-center space-x-2 gap-3" key={activity.createdAt}>
              {/* User Avatar */}
              {activity.user?.avatar ? (
                <img
                  src={activity.user.avatar}
                  alt={activity.user.name || activity.user.email}
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
                <p className="text-sm tracking-tight text-gray-900 dark:text-white font-semibold whitespace-nowrap text-ellipsis overflow-hidden w-full">
                  {activity.user?.name || activity.user.email}
                </p>
                <p className="text-sm font-medium tracking-tight text-gray-900 dark:text-white min-w-[100px]">
                  {activity.name}
                </p>
              </div>

              {/* Timestamp */}
              <div className="text-xs text-gray-500">
                {new Date(activity.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
} 