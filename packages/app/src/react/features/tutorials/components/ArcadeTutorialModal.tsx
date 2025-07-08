import React, { useEffect, useRef, useState } from 'react';



/**
 * Props for the ArcadeTutorial component
 */
interface ArcadeTutorialProps {
  /**
   * The URL of the Arcade tutorial iframe
   */
  iframeUrl: string;
  /**
   * Render prop for the trigger button
   * @param onTriggerClick - Function to be called when the trigger is clicked
   */
  renderTrigger: (onTriggerClick: () => void) => React.ReactNode;
  /**
   * Optional title for the iframe
   */
  iframeTitle?: string;
}

/**
 * ArcadeTutorial component that implements a custom trigger for the Arcade tutorial
 */
export const ArcadeTutorial: React.FC<ArcadeTutorialProps> = ({ 
  iframeUrl, 
  renderTrigger,
  iframeTitle = 'Tutorial'
}) => {
  const arcadeIframeRef = useRef<HTMLIFrameElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [iframeHeight, setIframeHeight] = useState<string>('100%');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://app.arcade.software') return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data.context === 'iframe.resize' && data.height > 0) {
          setIframeHeight(`${data.height}px`);
        }

        // Handle Arcade specific events
        if (data.event === 'arcade-popout-close') {
          setIsVisible(false);
        }
        if (data.event === 'arcade-popout-open') {
          setIsVisible(true);
        }
      } catch (e) {
        // Ignore parsing errors for non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  /**
   * Handles the click event on the tutorial trigger button
   */
  const onClickArcadeTrigger = (): void => {
    setIsVisible(true);
    const arcadeIframe = arcadeIframeRef.current;
    if (arcadeIframe?.contentWindow) {
      arcadeIframe.contentWindow.postMessage(
        { event: 'request-popout-open' },
        'https://app.arcade.software'
      );
    }
  };

  /**
   * Handles closing the tutorial
   */
  const handleClose = (): void => {
    setIsVisible(false);
  };

  return (
    <>
      {renderTrigger(onClickArcadeTrigger)}
      {isVisible && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          onClick={handleClose}
        >
          <div 
            style={{
              position: 'relative',
              width: '90%',
              maxWidth: '1200px',
              height: '90vh',
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              ref={arcadeIframeRef}
              src={iframeUrl}
              title={iframeTitle}
              frameBorder="0"
              loading="lazy"
              allowFullScreen
              allow="clipboard-write"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                colorScheme: 'light'
              }}
            />
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
};
