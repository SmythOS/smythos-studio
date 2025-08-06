import Tooltip from '@react/shared/components/_legacy/ui/tooltip/tooltip';
import { DeleteIcon, RedoIcon } from '@react/shared/components/svgs';
import { Spinner } from '@react/shared/components/ui/spinner';

// Pending Invites Table Row Component
export const PendingInvitesTableRow = ({
  invite,
  onResend,
  onDelete,
  loading,
  deleting,
  fadeOut,
  isReadOnlyAccess,
  hasPendingInviteForEmail,
}: {
  invite: {
    id: string;
    email: string;
    role: string;
    expires: string;
    status: string;
    roleId?: number;
  };
  onResend: (invite: any) => void;
  onDelete: (id: string) => void;
  loading: boolean;
  deleting: boolean;
  fadeOut: boolean;
  isReadOnlyAccess: boolean;
  hasPendingInviteForEmail: (email: string) => boolean;
}) => {
  const canShowResend =
    !isReadOnlyAccess && invite.status === 'Expired' && !hasPendingInviteForEmail(invite.email);

  return (
    <tr
      className={`bg-white hover:bg-gray-50 border-b border-solid border-gray-200 last:border-b-0 text-base -mx-1 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <td className="px-6 h-14 font-normal">{invite.email}</td>
      <td className="px-6 h-14 font-normal">{invite.role}</td>
      <td className="px-6 h-14 font-normal">{invite.expires}</td>
      <td className="px-2 h-14 font-normal">
        {invite.status === 'Expired' ? (
          <span className="bg-red-100 text-red-500 px-2 py-1 rounded-xl text-xs">Expired</span>
        ) : invite.status === 'Accepted' ? (
          <span className="bg-green-100 text-green-600 px-2 py-1 rounded-xl text-xs">Accepted</span>
        ) : (
          <span className="bg-blue-100 text-blue-500 px-2 py-1 rounded-xl text-xs">Pending</span>
        )}
      </td>
      <td className="px-6 h-14 font-normal text-right flex items-center gap-2 justify-end">
        {canShowResend && (
          <Tooltip text="Resend" placement="top">
            <button
              className="text-gray-500 hover:text-gray-700 ml-2 mr-2 flex items-center justify-center"
              title="Resend"
              onClick={() => onResend(invite)}
              type="button"
              disabled={loading || deleting}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Spinner classes="w-4 h-4" size="sm" />
                </span>
              ) : (
                <RedoIcon className="h-4 w-4" color="#242424" />
              )}
            </button>
          </Tooltip>
        )}
        {!isReadOnlyAccess && invite.status !== 'Accepted' && (
          <Tooltip text="Delete" placement="top">
            <button
              className="text-gray-500 hover:text-gray-700 flex items-center justify-center"
              title="Delete"
              onClick={() => onDelete(invite.id)}
              type="button"
              disabled={loading || deleting}
            >
              {deleting ? (
                <span className="flex items-center justify-center">
                  <Spinner classes="w-4 h-4" size="sm" />
                </span>
              ) : (
                <DeleteIcon className="h-4 w-4" color="#242424" />
              )}
            </button>
          </Tooltip>
        )}
      </td>
    </tr>
  );
};
