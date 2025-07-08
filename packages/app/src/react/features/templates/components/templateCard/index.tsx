import { getAgentFallbackDescription } from '@src/react/features/agents/components/agentCard/hooks/useAgentData';
import { EAgentSettings, TAgentSettings } from '@src/react/features/agents/types/agents.types';
import { TEMPLATE_DATA } from '@src/react/features/templates/constants/templateData';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { navigateTo } from '@src/react/shared/utils/general';
import { ENTERPRISE_COLLECTION_TEMPLATE_NAMES } from '@src/shared/constants/general';
import { EVENTS } from '@src/shared/posthog/constants/events';
import { Analytics } from '@src/shared/posthog/services/analytics';
import classNames from 'classnames';
import { Tooltip } from 'flowbite-react';
import React, { useEffect, useMemo, useState } from 'react';
import { FaFileAlt } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import './index.css';

const sizes = {
  sm: 'w-6 h-6 max-w-6 max-h-6',
  md: 'w-10 h-10 max-w-10 max-h-10',
  lg: 'w-14 h-14 max-w-14 max-h-14',
  xl: 'w-20 h-20 max-w-20 max-h-20',
  '3lg': 'w-[72px] h-[72px] max-w-[72px] max-h-[72px]',
  'template-card': 'w-6 h-10 max-w-6 max-h-10',
};

const DEFAULT_AVATAR = '/img/user_default.svg';

interface TemplateCardProps {
  data: any;
  type: 'template' | 'agent';
  suggestedTamplate?: boolean;
}

function CategoryPill({ category, handleCategoryClick }) {
  return (
    <button
      onClick={() => handleCategoryClick(category.toLowerCase())}
      className={
        'px-3 py-2 rounded-full dark:border-gray-600 text-gray-500 dark:text-white text-sm bg-gray-100  font-medium font-sans transition-colors duration-300 capitalize'
      }
    >
      {category}
    </button>
  );
}

const TemplateCard: React.FC<TemplateCardProps> = ({ data, type, suggestedTamplate = false }) => {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const isEnterpriseCollection = ENTERPRISE_COLLECTION_TEMPLATE_NAMES.includes(data?.name);
  const {
    userInfo: { subs },
    isCustomUser,
  } = useAuthCtx();
  const premiumPlans = [
    'SmythOS PRO',
    'Premium',
    'SmythOS Free',
    'SmythOS Premium',
    'SmythOS Starter',
  ];
  const isPremiumProFreeUser = premiumPlans?.includes(subs?.plan?.name || '');

  /**
   * Handles click on the card to show the template modal
   * @param {React.MouseEvent} e - The click event
   */
  const handleCardClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (suggestedTamplate) {
      Analytics.track(EVENTS.TEMPLATES_EVENTS.SUGGESTED_TEMPLATE_SELECTED, {
        jobType: data?.jobType,
        templateName: data?.name,
      });
    }
    setShowModal(true);
  };

  /**
   * Handles direct remix button click to bypass modal
   * @param {React.MouseEvent} e - The click event
   */
  const handleRemixClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Track analytics if it's a suggested template
    if (suggestedTamplate) {
      Analytics.track(EVENTS.TEMPLATES_EVENTS.SUGGESTED_TEMPLATE_SELECTED, {
        jobType: data?.jobType,
        templateName: data?.name,
      });
    }

    // Navigate directly to builder with template and behavior
    navigateTo(`/builder?templateId=${data?.file}`);
  };

  const renderIcon = (template) => {
    let { icon, color } = template;

    if (typeof icon === 'string' && (icon.startsWith('fa ') || icon.startsWith('fa-'))) {
      const style = color ? { color: color } : {};
      return <i className={`fa ${icon} text-2xl ${sizes['md']}`} style={style}></i>;
    } else {
      const container = document.createElement('div');
      container.innerHTML = icon;
      const svg = container.querySelector('svg');

      if (svg) {
        const paths = svg.querySelectorAll('path[fill]');
        let hasFill = false;

        paths.forEach((path) => {
          if (path.getAttribute('fill') && path.getAttribute('fill') !== 'none') {
            hasFill = true;
          }
        });

        if (!hasFill && color) {
          svg.setAttribute('fill', color);
        }

        icon = container.innerHTML;
      }

      return (
        <div
          className={classNames('agent-svg-icon mr-2', sizes['template-card'])}
          dangerouslySetInnerHTML={{ __html: icon }}
        />
      );
    }
  };

  const openAgentSettings = () => {
    navigate(`/agent-settings/${data.id}`);
  };

  // for getting decription of agent and template
  const agentOwner = useMemo(
    () => data?.contributors?.find((contributor) => contributor?.isCreator),
    [data?.contributors],
  );
  const userName = agentOwner?.user?.name || agentOwner?.user?.email || 'User';
  const description = data.description
    ? data.description
    : type === 'agent'
    ? getAgentFallbackDescription(userName, data?.createdAt)
    : '';

  // for getting avatar of agent
  const flatSettings = useMemo(
    () =>
      data?.aiAgentSettings?.reduce(
        (acc, setting) => ({ ...acc, [setting.key]: setting.value }),
        {},
      ) as TAgentSettings,
    [data?.aiAgentSettings],
  );
  const avatarImage = flatSettings?.[EAgentSettings.AVATAR] || DEFAULT_AVATAR;

  // New pricing plan checks strictly using TypeScript types.
  const planName: string = subs?.plan?.name ?? '';
  // For free, builder, and startup users we want to show an upgrade prompt.
  const isUpgradePlan: boolean =
    planName === 'SmythOS Free' || planName === 'Builder' || planName === 'Startup';
  // For scaleup, enterprise, or custom users we want to show an "Enterprise Collection" message.
  const isEnterprisePlan: boolean =
    planName === 'Scaleup' ||
    planName === 'Enterprise' ||
    planName === 'Enterprise T1' ||
    planName === 'Enterprise T2' ||
    planName === 'Enterprise T3' ||
    planName === 'Enterprise T4' ||
    isCustomUser;

  /**
   * Define tooltip content based on the new pricing plan logic.
   */
  let tooltipContent: JSX.Element | null = null;
  if (isUpgradePlan) {
    tooltipContent = (
      <div className="text-center min-w-[200px] text-sm">
        <Link to="/plans" className="underline underline-offset-2 font-bold">
          Upgrade
        </Link>{' '}
        to access this template.
      </div>
    );
  } else if (isEnterprisePlan) {
    tooltipContent = (
      <div className="text-center min-w-[145px] text-sm py-2">Enterprise Collection</div>
    );
  }

  // Convert template name to lookup key
  const getTemplateLookupKey = (name: string): string => {
    return name.toLowerCase().replace(/[\s-]/g, '_');
  };

  // Get template data from the constant
  const templateKey = getTemplateLookupKey(data?.name);
  const templateData = TEMPLATE_DATA[templateKey] || { videoLink: null, docLink: null };
  // Add modal component
  const TemplateModal = () => {
    // Add useEffect for keyboard event handling
    useEffect(() => {
      const handleEscapeKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowModal(false);
        }
      };

      // Add event listener when modal is shown
      document.addEventListener('keydown', handleEscapeKey);

      // Clean up event listener when modal is closed
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }, []);

    if (!showModal) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        setShowModal(false);
      }
    };

    // Extract video ID from tutorial URL
    const getVideoId = (url: string) => {
      if (!url) return null;
      const match = url.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/,
      );
      return match ? match[1] : null;
    };

    // Get video ID from templateData
    const videoId = getVideoId(templateData.videoLink);

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-xl w-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(false);
            }}
            className="absolute top-4 right-4 text-gray-500 text-xl hover:text-gray-700"
          >
            ×
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-shrink-0 w-6 h-6">
              {data?.icon ? (
                renderIcon(data)
              ) : (
                <FaFileAlt className="w-full h-full text-primary-100" />
              )}
            </div>
            <h1 className="text-[20px] leading-[20px] tracking-[0.15px] font-inter font-semibold text-[#1E1E1E]">
              {data?.name}
            </h1>
          </div>

          <p className="text-[#1E1E1E] text-base mb-6 font-inter font-normal text-base leading-[22.4px]">
            {data?.description}
          </p>

          {/* Video embed - show for all templates with videoLink */}
          {videoId && (
            <div className="relative aspect-video w-full mb-6">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title={`${data.name} tutorial video`}
                className="absolute inset-0 w-full h-full rounded-lg"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          <div className="flex justify-end space-x-3">
            {/* Learn More button - show for all templates with docLink */}
            {templateData.docLink && (
              <a
                href={templateData.docLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg border border-solid border-[#D1D1D1] text-base font-normal text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Learn More
              </a>
            )}

            {/* Video Tutorial button - show if video exists but not embedded */}
            {templateData.videoLink && !videoId && (
              <a
                href={templateData.videoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 rounded-lg border border-solid border-[#D1D1D1] text-base font-normal text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Watch Tutorial
              </a>
            )}

            <CustomButton
              isLink
              reloadDocument
              linkTo={`/builder?templateId=${data?.file}`}
              variant="tertiary" // Blue text style
              disabled={isEnterpriseCollection && isUpgradePlan}
              label="Remix"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        key={data?.id}
        onClick={type === 'agent' ? openAgentSettings : handleCardClick}
        className="bg-gray-50 p-4 border cursor-pointer h-min-[160px] rounded-lg border-solid transition duration-300 border-gray-300 hover:border-blue-500 hover:shadow-md flex flex-col justify-between"
      >
        <div className={classNames('flex justify-between mb-2', { 'gap-4': type === 'agent' })}>
          <div>
            {type === 'template' && (
              <div>
                {data?.icon ? (
                  renderIcon(data)
                ) : (
                  <FaFileAlt fontSize={24} className="text-primary-100 mr-100" />
                )}
              </div>
            )}

            {type === 'agent' && (
              <div className="self-start shrink-0">
                <img
                  className={classNames('rounded-full overflow-hidden', sizes['md'])}
                  src={avatarImage}
                  alt={data?.name || 'Avatar'}
                  onError={(e: any) => {
                    e.target.src = '/img/use_default_cropped.svg';
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <h3 className="text-base font-medium leading-none">{data?.name}</h3>
                {isEnterpriseCollection &&
                  (tooltipContent ? (
                    <Tooltip
                      content={tooltipContent}
                      trigger="hover"
                      placement="top"
                      style="dark"
                      theme={{
                        target: 'flex ml-auto template-card-tooltip-container',
                      }}
                    >
                      <button className="template-card-tooltip-button" />
                    </Tooltip>
                  ) : (
                    <div className="flex ml-auto template-card-tooltip-container">
                      <button className="template-card-tooltip-button" />
                    </div>
                  ))}
              </div>
              <p className="text-gray-500 text-sm overflow-hidden text-ellipsis h-10 line-clamp line-clamp-2">
                {description}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`flex justify-between mt-auto items-end ${
            !data?.category ? 'flex-row-reverse' : ''
          }`}
        >
          {data?.category && (
            <CategoryPill category={data?.category} handleCategoryClick={() => {}} />
          )}

          {!data?.publish && type === 'template' ? (
            <span className="w-auto bg-primary-pink text-white text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
              Not Published
            </span>
          ) : (
            <CustomButton
              isLink={type === 'agent'}
              reloadDocument={type === 'agent'}
              linkTo={type === 'agent' ? `/builder/${data.id}` : undefined}
              dataAttributes={{ 'data-test': 'edit-agent-button' }}
              handleClick={type === 'template' ? handleRemixClick : undefined}
              variant="tertiary"
              disabled={isEnterpriseCollection && isUpgradePlan}
              label={type === 'agent' ? 'Edit' : 'Remix'}
            />
          )}
        </div>
      </div>
      <TemplateModal />
    </>
  );
};
export default TemplateCard;
