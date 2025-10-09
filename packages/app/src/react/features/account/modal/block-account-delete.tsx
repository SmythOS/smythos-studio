import { Button } from '@react/shared/components/ui/button';
import { DeleteAccountType } from '@src/react/features/account/enum';
import { Alert, AlertDescription } from '@src/react/shared/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@src/react/shared/components/ui/card';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import { AlertCircle, Crown, Info, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Props = {
  handleToggle: (open: boolean) => void;
  deleteAccRequirement: {
    title: string;
    type: DeleteAccountType;
    bool: boolean;
    error: string;
    isLoading?: boolean;
    steps?: string[];
  };
};

/**
 * Helper function to check if a string contains HTML content
 */
const containsHTML = (str: string): boolean => {
  return /<[a-z][\s\S]*>/i.test(str);
};

/**
 * Helper function to render a step based on its content type
 */
const renderStep = (step: string, index: number): JSX.Element => {
  if (containsHTML(step)) {
    return (
      <li
        key={index}
        dangerouslySetInnerHTML={{ __html: step }}
        className="[&_a]:text-[#3C89F9] [&_a]:hover:underline"
      />
    );
  }
  return <li key={index}>{step}</li>;
};

const renderDescription = (description: string) => {
  if (containsHTML(description)) {
    return (
      <CardDescription
        className="text-gray-600 leading-relaxed text-[14px] font-inter font-normal [&_a]:text-[#3C89F9] [&_a]:hover:underline"
        dangerouslySetInnerHTML={{ __html: description }}
      ></CardDescription>
    );
  }
  return (
    <CardDescription className="text-gray-600 leading-relaxed text-[14px] font-inter font-normal">
      {description}
    </CardDescription>
  );
};

export default function BlockAccountDeleteModal({ handleToggle, deleteAccRequirement }: Props) {
  const navigate = useNavigate();

  const handleManageTeamMembers = () => {
    handleClose();
    navigate('/teams/members');
  };

  const handleManageSubscription = () => {
    handleClose();
    navigate('/my-plan');
  };

  const handleClose = () => {
    handleToggle(false);
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-[29rem] mx-auto shadow-2xl border-0 bg-white">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-7 w-7 text-red-400" />
          </div>
          <CardTitle className="text-[18px] font-semibold text-gray-900 font-inter">
            {deleteAccRequirement.title}
          </CardTitle>
          {/* Render the error message */}
          {renderDescription(deleteAccRequirement.error)}
        </CardHeader>

        <CardContent className="space-y-4">
          {deleteAccRequirement?.steps?.length && (
            <Alert className="border-blue-200 bg-blue-50 flex gap-2">
              <Info color="#1E40AF" className="h-4 w-4" />
              <AlertDescription className="text-[#1E40AF] text-[14px] font-inter font-normal">
                <strong>Next steps:</strong>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  {deleteAccRequirement.steps.map((step, index) => renderStep(step, index))}
                </ol>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {/* Show this button to all types except USER_HAS_SUBSCRIPTION */}
            {[
              DeleteAccountType.USER_HAS_TEAM_MEMBERS,
              DeleteAccountType.USER_HAS_TEAM_MEMBERS_AND_SUBSCRIPTION,
              DeleteAccountType.IS_NOT_TEAM_OWNER,
            ].includes(deleteAccRequirement.type) && (
              <Button
                className="w-full bg-[#3C89F9] hover:bg-[#2B7CE9] text-white text-[14px] font-inter font-normal"
                onClick={handleManageTeamMembers}
              >
                <Users className="w-4 h-4 mr-2" />
                {DeleteAccountType.IS_NOT_TEAM_OWNER === deleteAccRequirement.type
                  ? 'View'
                  : 'Manage'}{' '}
                Team Members
              </Button>
            )}

            {[DeleteAccountType.USER_HAS_SUBSCRIPTION].includes(deleteAccRequirement.type) && (
              <Button
                className="w-full bg-[#3C89F9] hover:bg-[#2B7CE9] text-white text-[14px] font-inter font-normal"
                onClick={handleManageSubscription}
              >
                <Crown className="w-4 h-4 mr-2" />
                Manage Subscription
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-[14px] font-inter font-normal rounded-lg"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 font-inter font-normal">
              Need help? Visit our{' '}
              <a href={SMYTHOS_DOCS_URL} className="text-[#3C89F9] hover:underline" target="_blank" rel="noopener noreferrer">
                documentation
              </a>{' '}
              or{' '}
              <a href="https://discord.gg/smythos" className="text-[#3C89F9] hover:underline" target="_blank" rel="noopener noreferrer">
                contact support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
