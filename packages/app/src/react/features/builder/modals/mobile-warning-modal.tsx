import { useDeviceDetection } from '@react/features/builder/hooks/use-device-detection';
import { Alert, AlertDescription } from '@react/shared/components/ui/alert';
import { Button } from '@react/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@react/shared/components/ui/card';
import { Checkbox } from '@react/shared/components/ui/checkbox';
import { successToast, warningToast } from '@src/shared/components/toast';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import { ExternalLink, Info, Mail, Monitor, Smartphone, Tablet } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MobileHandlerProps {
  platformName?: string;
  onDismiss?: () => void;
  showDismissOption?: boolean;
}

export function MobileHandler({
  platformName = 'AI Agent Builder',
  showDismissOption = true,
}: MobileHandlerProps) {
  const { isMobile, isTablet, deviceType } = useDeviceDetection();
  const [isDismissed, setIsDismissed] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);

  const handleContinueAnyway = () => {
    if (doNotShowAgain) {
      localStorage.setItem('mobile-warning-dismissed', 'true');
    }
    setIsDismissed(true);
  };

  // Check if user has previously dismissed the warning
  useEffect(() => {
    const dismissed = localStorage.getItem('mobile-warning-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  if (!isMobile && !isTablet) return null;
  if (isDismissed) return null;

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-8 w-8 text-[#3C89F9]" />;
      case 'tablet':
        return <Tablet className="h-8 w-8 text-[#3C89F9]" />;
      default:
        return <Monitor className="h-8 w-8 text-[#3C89F9]" />;
    }
  };

  const getTitle = () => {
    return 'Mobile Experience Limited';
  };

  const getDescription = () => {
    return 'Our drag-and-drop AI agent builder works best on desktop. Mobile access is view-only.';
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">{getDeviceIcon()}</div>
          <CardTitle className="text-[18px] font-semibold text-gray-900 font-inter">
            {getTitle()}
          </CardTitle>
          <CardDescription className="text-gray-600 leading-relaxed text-[14px] font-inter font-normal">
            {getDescription()}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50 flex gap-2">
            <Info color="#1E40AF" className="h-4 w-4" />
            <AlertDescription className="text-[#1E40AF] text-[14px] font-inter font-normal">
              For the best experience, we recommend using a desktop computer with a screen width of
              at least 1024px.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button
              className="w-full bg-[#3C89F9] hover:bg-[#2B7CE9] text-white text-[14px] font-inter font-normal"
              onClick={() => {
                // Copy current URL to clipboard for easy sharing
                navigator.clipboard
                  .writeText(window.location.href)
                  .then(() => {
                    // Show a toast or temporary message
                    successToast('Link copied! Share this with your desktop device.', 'Success');
                  })
                  .catch(() => {
                    // Fallback if clipboard API fails
                    warningToast('Please manually select and copy the link.', 'Failed to copy');
                  });
              }}
            >
              <Monitor className="mr-2 h-4 w-4" />
              Copy Link for Desktop
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-[14px] font-inter font-normal rounded-lg"
              onClick={() => {
                // Create mailto link with encoded parameters
                const subject = encodeURIComponent(`${platformName} - Open on Desktop`);
                const body = encodeURIComponent(
                  `Open this link on your desktop computer: ${window.location.href}`,
                );
                const mailtoLink = `mailto:?subject=${subject}&body=${body}`;

                // For macOS, we use window.open() which is more reliable for protocol handlers
                const mailWindow = window.open(mailtoLink, '_self');

                // Fallback if window.open fails
                if (!mailWindow) {
                  window.location.href = mailtoLink;
                }
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Email Link to Myself
            </Button>

            {showDismissOption && (
              <Button
                variant="outline"
                className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-[14px] font-inter font-normal rounded-lg"
                onClick={handleContinueAnyway}
              >
                Continue Anyway
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="do-not-show-again"
              checked={doNotShowAgain}
              onCheckedChange={(checked) => setDoNotShowAgain(checked as boolean)}
              className="data-[state=checked]:bg-[#3C89F9] data-[state=checked]:border-[#3C89F9] data-[state=checked]:text-[#FFFF]"
            />
            <label
              htmlFor="do-not-show-again"
              className="text-[14px] font-inter font-normal text-gray-600 cursor-pointer"
            >
              Do not show this message again
            </label>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 font-inter font-normal">
              Need help? Visit our{' '}
              <a href={SMYTHOS_DOCS_URL} className="text-[#3C89F9] hover:underline">
                documentation
              </a>{' '}
              or{' '}
              <a href="https://discord.gg/smythos" className="text-[#3C89F9] hover:underline">
                contact support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
