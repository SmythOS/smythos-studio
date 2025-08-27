import React from 'react';

interface ThinkingMessageProps {
  message: string;
  avatar?: string;
}

// Custom CSS for smooth blinking animation (like the image)
const blinkAnimation = `
  @keyframes smoothBlink {
    0% { opacity: 1; }
    50% { opacity: 0.3; }
    100% { opacity: 1; }
  }
  .smooth-blink-text {
    animation: smoothBlink 1.5s ease-in-out infinite;
    color: #6b7280;
    font-weight: 500;
  }
`;

const ThinkingMessage: React.FC<ThinkingMessageProps> = ({ message, avatar }) => {
  return (
    <>
      <style>{blinkAnimation}</style>
      {/* White rectangular bubble like the image */}

      <div className="flex items-center gap-3">
        {/* Avatar inside the bubble */}
        <div className="flex-shrink-0">
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {avatar ? (
              <img src={avatar} alt="AI Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">AI</span>
              </div>
            )}
          </div>
        </div>

        {/* Message text inside the bubble */}
        <div className="flex-1">
          <span className="text-sm text-gray-500 font-medium smooth-blink-text">{message}</span>
        </div>
      </div>
    </>
  );
};

export { ThinkingMessage };
