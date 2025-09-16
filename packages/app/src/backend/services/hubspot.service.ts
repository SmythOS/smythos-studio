import { HUBSPOT_PORTAL_ID } from '../constants';

interface FeedbackData {
  text?: string;
  emoji?: string;
}

interface HubspotField {
  name: string;
  value: string;
}

export async function submitFeedbackForm(feedbackData: FeedbackData, userEmail: string) {
  const formID = '5400499e-4ae8-433a-b0bf-6e5e5c1c261c';

  try {
    const response = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${formID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: [
            {
              name: 'feedback_text',
              value: feedbackData?.text || '',
            },
            {
              name: 'feedback_emoji',
              value: feedbackData?.emoji || 'none',
            },
            {
              name: 'email',
              value: userEmail,
            },
          ],
        }),
      },
    );

    if (!response?.ok) {
      const errorData = await response.json();
      console.error('HubSpot API Error:', errorData);
      return null;
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error submitting to HubSpot:', error?.message);
    return null;
  }
}
