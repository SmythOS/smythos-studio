import React from 'react';

const GPT5_BLOG_URL =
  'https://smythos.com/developers/ai-models/gpt-5-did-openai-rebuild-intelligence-with-routing-and-reasoning/';

/**
 * Small clickable banner for the /agents page
 * Matches width of the "What agent can I help you build?" section
 */
interface AgentsBannerProps {
  onClose: () => void;
}

export function AgentsBanner({ onClose }: AgentsBannerProps) {
  const handleCloseClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <div className="w-full px-0 md:w-[80%] max-w-[808px] mx-auto mt-4 mb-8">
      <a
        href={GPT5_BLOG_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block no-underline"
        aria-label="Learn about using GPT-5 models in your agents and LLM components"
      >
        <div className="w-full p-px relative bg-gray-50 rounded-lg outline outline-1 outline-offset-[-1px] outline-gray-300">
          <div className="p-1 flex flex-col gap-1">
            <div className="p-4 bg-gradient-to-b from-white to-blue-100/80 rounded flex flex-col gap-1.5">
              <div className="flex justify-between items-center gap-4">
                <div className="px-2 py-0.5 bg-indigo-100 rounded-full flex justify-center items-center gap-1 overflow-hidden">
                  <img src="/img/icons/stars.svg" alt="New" className="w-5 h-5" />
                  <div className="text-blue-500 text-base leading-normal">New</div>
                </div>

                <div className="flex-1 text-center text-slate-900 text-lg font-medium leading-none">
                  Use the GPT-5 Models in your Agents and LLM Components
                </div>

                <button
                  type="button"
                  onClick={handleCloseClick}
                  aria-label="Dismiss banner"
                  className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/60"
                >
                  <img
                    src="/image/icons/close.svg"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      if (!img.src.includes('/img/icons/close.svg')) {
                        img.src = '/img/icons/close.svg';
                      }
                    }}
                    alt="Close"
                    className="w-5 h-5"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
}

export default AgentsBanner;
