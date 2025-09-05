import { CloseIcon } from '@react/shared/components/svgs';
import { Button } from '@react/shared/components/ui/newDesign/button';
import { useRef } from 'react';
import { FaCircleInfo, FaCopy } from 'react-icons/fa6';
type Props = {
  onClose: () => void;
  domain: string;
  embodimentData?: EmbodimentData; // New prop for embodiment data
};

type EmbodimentData = {
  properties: {
    introMessage: string; // Define the type for introMessage
    // Add other properties as needed
    isFullScreen?: boolean;
    allowFileAttachments?: boolean;
  };
};

const ChatbotCodeSnippetModal = (props: Props) => {
  const isFullScreen = props.embodimentData?.properties?.isFullScreen;
  const allowFileAttachments = props.embodimentData?.properties?.allowFileAttachments;
  const isUsingFullScreen = Boolean(isFullScreen);
  function getFullDomain(domain) {
    // Check if the domain already includes http:// or https://
    if (!/^https?:\/\//i.test(domain)) {
      // Assume HTTPS by default
      return `https://${domain}`;
    }
    return domain;
  }

  const chatbotContainer = `
  <div id="smythos-chatbot-container"></div>
  <!-- Chatbot Container: You can place it anywhere you want and style it as needed -->
  `;

  const codeSnippet = `${isUsingFullScreen ? chatbotContainer : ''}
    <script src="${getFullDomain(props.domain)}/static/embodiment/chatBot/chatbot-v2.js"></script>
    <script>
        ChatBot.init({
            domain: '${props.domain}',
            isChatOnly: ${isUsingFullScreen},
            ${isUsingFullScreen ? 'containerId: "smythos-chatbot-container",' : ''}
            allowAttachments: ${allowFileAttachments},
            // ... additional settings ...
            introMessage: '${
              props.embodimentData && props.embodimentData.properties
                ? props.embodimentData.properties?.introMessage
                : 'Hello, how can I assist you today?'
            }',
            // ... colors settings go here ...
        });
    </script>`;

  const textareaRef = useRef(null);

  const handleCopyClick = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
      navigator.clipboard.writeText(codeSnippet);
    }
  };

  return (
    <div
      id="chatbotCodeModal"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center w-full h-screen bg-black bg-opacity-50 p-4 overflow-x-hidden overflow-y-auto"
      onClick={props.onClose}
    >
      <div
        className="relative w-full max-w-2xl p-4 bg-white rounded-lg shadow dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex justify-between items-start p-2 border-b dark:border-gray-600">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Chatbot Integration Snippet
          </h3>
          <button
            type="button"
            className="inline-flex items-center justify-center w-8 h-8 ml-auto text-sm text-gray-400 bg-transparent rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white -mr-2"
            onClick={props.onClose}
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>

        {/* Code snippet textarea */}
        <div className="px-2 pt-2 pb-4">
          {!isFullScreen ? (
            <p className="mb-4 text-sm text-gray-900 flex gap-2 items-center">
              <FaCircleInfo className="min-w-4" /> Copy and paste this snippet into your website
              before the closing <code> &lt;/body&gt; </code> tag.
            </p>
          ) : (
            <p className="mb-4 text-sm text-gray-900 flex gap-2 items-center">
              <FaCircleInfo /> Place this snippet inside a container DOM element, and the chatbot
              will occupy the full available space within it.
            </p>
          )}
          <textarea
            ref={textareaRef}
            readOnly
            className="w-full h-auto resize p-3 mb-4 text-sm text-gray-700 bg-gray-100 rounded dark:bg-gray-900 dark:text-white border-none"
            rows={12}
            value={codeSnippet}
            onClick={(e) => {
              const target = e.target as HTMLInputElement;
              target.select();
            }}
          />

          <Button
            variant="primary"
            handleClick={handleCopyClick}
            label="Copy"
            addIcon={true}
            Icon={<FaCopy className="mr-2" />}
            className="w-[100px] rounded-lg ml-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default ChatbotCodeSnippetModal;
