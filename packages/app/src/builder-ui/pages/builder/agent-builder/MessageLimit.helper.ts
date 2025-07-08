import { Workspace } from '../../../workspace/Workspace.class';
import { PostHog } from '../../../services/posthog';
declare var workspace: Workspace;

/**
 * messageLimiter.helper.ts
 * Manages the message limit display for the Weaver chat UI
 */

/**
 * Formats a date string into the user's local timezone format
 * @param isoString - ISO date string to format
 * @returns Formatted date string in local timezone
 */
function formatLocalDate(isoString: string): string {
  if (!isoString) return '';

  try {
    const date = new Date(isoString);

    // Use the user's browser locale instead of hardcoding 'en-US'
    const userLocale = navigator.language || 'en-US';

    // Format date to "Month Day Hour:Minute AM/PM" in local timezone using the user's locale
    return date.toLocaleDateString(userLocale, {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    console.warn('Error formatting local date');
    return isoString;
  }
}

/**
 * Fetches the current user data from the API
 * @returns Promise resolving to the user data
 */
async function getWeaverData(): Promise<Record<string, any>> {
  try {
    const response = await fetch('/api/status');

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    const weaverData = data?.status?.user?.weaver || {};

    // Update the workspace userData with the new requests data
    workspace.updateWeaverData(weaverData);

    return weaverData;
  } catch {
    console.warn('Error fetching user data');
    return {};
  }
}

/**
 * Toggles the message input disabled state based on remaining message count
 * @param remainingRequests - Number of remaining user requests
 */
function updateMessageInputAvailability(remainingRequests: number): void {
  const messageInput = document.getElementById('agentMessageInput') as HTMLInputElement | null;
  const weaverSendButton = document.getElementById('agentSendButton') as HTMLButtonElement;
  const agentAttachButton = document.getElementById('agentAttachButton') as HTMLButtonElement;

  if (messageInput) {
    if (remainingRequests <= 0) {
      // Disable the input when no remaining messages
      messageInput.disabled = true;
      weaverSendButton.disabled = true;
      agentAttachButton.disabled = true;
    } else {
      // Enable the input when messages are available
      messageInput.disabled = false;
      weaverSendButton.disabled = false;
      agentAttachButton.disabled = false;
    }
  }
}

/**
 * Check and initialize message limit display for free users
 * @param userData - User data containing subscription information
 */
export function initializeMessageLimitDisplay(userData: Record<string, any>): void {
  let upgradeBar = document.getElementById('weaver-upgrade-bar');
  const remainingRequests = userData?.weaver?.requests?.remaining;

  updateMessageInputAvailability(remainingRequests);

  if (!upgradeBar) {
    upgradeBar = document.createElement('DIV');
    upgradeBar.id = 'weaver-upgrade-bar';

    upgradeBar.classList.add(
      'flex',
      'justify-between',
      'items-center',
      'absolute',
      'left-px',
      'bg-[#374151]',
      'text-white',
      'pt-1',
      'pb-2',
      'px-2',
      'rounded-t-md',
      'w-full',
    );

    const upgradeBarMessageElm = document.createElement('p');
    upgradeBarMessageElm.classList.add('text-xs');

    const nextRequestTime = userData?.weaver?.requests?.nextRequestTime || '';
    const formattedDate = formatLocalDate(nextRequestTime);

    if (remainingRequests <= 0) {
      upgradeBarMessageElm.innerHTML = `<span class="__weaver_limit_message text-xs">Out of free messages – limit resets at ${formattedDate}</span> <a href="/plans" target="_blank" class="text-[#45C9A9] __upgrade_plan_link">Upgrade Plan</a>`;
      upgradeBar.style.top = '-30px';
    } else {
      upgradeBarMessageElm.innerHTML = `<span class="__weaver_limit_message text-xs">You have <span class="__weaver_remaining_request" data-remaining-requests="${remainingRequests}">${remainingRequests}</span> message${
        remainingRequests !== 1 ? 's' : ''
      } remaining</span> <a href="/plans" target="_blank" class="text-[#45C9A9] __upgrade_plan_link">Upgrade Plan</a>`;
      upgradeBar.style.top = '-15px';
    }

    upgradeBar.appendChild(upgradeBarMessageElm);

    const msgInputWrapper = document.querySelector('.message-input-container');
    if (msgInputWrapper) {
      msgInputWrapper.prepend(upgradeBar);

      // Attach click event listener to the upgrade plan link after it's added to the DOM
      const upgradeLink = upgradeBar.querySelector('.__upgrade_plan_link');
      if (upgradeLink) {
        upgradeLink.addEventListener('click', (event) => {
          event.preventDefault();
          PostHog.track('upgrade_click', {
            page_url: '/builder',
            source: 'weaver limit reached',
          });
          window.open('/plans', '_blank');
        });
      }
    }
  }
}

/**
 * Update remaining requests count after sending a message
 * @param userData - User data containing request limit information
 */
export async function updateRemainingRequestsCount(userData: Record<string, any>): Promise<void> {
  try {
    // Get the latest user data directly from the API
    const weaverData = await getWeaverData();
    const remainingRequests = weaverData?.requests?.remaining || 0;
    const nextRequestTime = weaverData?.requests?.nextRequestTime;
    const remainingRequestsElm = document.querySelector('.__weaver_remaining_request');
    const limitMessageElm = document.querySelector('.__weaver_limit_message');

    if (!limitMessageElm) return;

    // Disable the message input when out of messages
    updateMessageInputAvailability(remainingRequests);

    if (remainingRequests <= 0) {
      // User has no remaining requests
      if (nextRequestTime) {
        PostHog.track('weaver_limit_reached');
        const formattedDate = formatLocalDate(nextRequestTime);
        limitMessageElm.innerHTML = `Out of free messages – limit resets at ${formattedDate}`;

        const upgradeBar = document.getElementById('weaver-upgrade-bar');
        if (upgradeBar) {
          upgradeBar.style.top = '-30px';
        }
      }
    } else if (remainingRequestsElm) {
      // Update the remaining count
      remainingRequestsElm.textContent = remainingRequests.toString();
      remainingRequestsElm.setAttribute('data-remaining-requests', remainingRequests.toString());
    }
  } catch {
    console.warn('Error fetching user data');
  }
}
