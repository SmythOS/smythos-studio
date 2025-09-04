export const S3_DAILY_PURGE_LIFECYCLE_TAG = 'ExpirationPolicy=DeleteDaily';
export const S3_WEEKLY_PURGE_LIFECYCLE_TAG = 'ExpirationPolicy=DeleteWeekly';
export const S3_MONTHLY_PURGE_LIFECYCLE_TAG = 'ExpirationPolicy=DeleteMonthly';

export const HUBSPOT_PORTAL_ID = '20645624';

export const CUSTOM_LLM_SETTINGS_KEY = 'custom-llm';
export const SMYTH_LLM_PROVIDERS_SETTINGS_KEY = 'smyth-llm-providers';

export const DEFAULT_SMYTH_LLM_PROVIDERS_SETTINGS = {
  openai: { enabled: true },
  anthropic: { enabled: true },
  googleai: { enabled: true },
  togetherai: { enabled: true },
  groq: { enabled: true },
  xai: { enabled: true },
  perplexity: { enabled: true },
};

export const TEAM_ID_HEADER = 'x-smyth-team-id';
export const AGENT_AVATAR_AUTO_GENERATE_IMAGE_WIDTH = 512;
export const AGENT_AVATAR_AUTO_GENERATE_IMAGE_HEIGHT = 512;

/**
 * List of email domains allowed to access custom LLM features
 * regardless of team subscription status.
 */
export const CUSTOM_LLM_ALLOWED_EMAIL_DOMAINS = ['uolinc.com', 'compasso.com.br', 'avenuecode.com'];

export const SAMPLE_BINARY_SOURCES = {
  Image: [
    'https://cdn.pixabay.com/photo/2024/05/26/10/15/bird-8788491_1280.jpg',
    'https://cdn.pixabay.com/photo/2017/02/08/17/24/fantasy-2049567_640.jpg',
    'https://cdn.pixabay.com/photo/2023/10/29/13/21/waterfall-8350178_640.jpg',
    'https://cdn.pixabay.com/photo/2022/12/01/04/42/man-7628305_640.jpg',
    'https://cdn.pixabay.com/photo/2023/01/06/12/28/ninja-7701126_640.jpg',
    'https://cdn.pixabay.com/photo/2024/01/19/18/03/ai-generated-8519540_640.jpg',
    'https://cdn.pixabay.com/photo/2024/04/10/07/02/man-8687405_640.jpg',
  ],
  Binary: [
    'https://cdn.pixabay.com/photo/2022/01/27/03/06/samurai-6970968_640.png',
    'https://cdn.pixabay.com/photo/2024/05/26/10/15/bird-8788491_1280.jpg',
    'https://cdn.pixabay.com/photo/2017/02/08/17/24/fantasy-2049567_640.jpg',
    'https://cdn.pixabay.com/photo/2023/10/29/13/21/waterfall-8350178_640.jpg',
    'https://cdn.pixabay.com/photo/2022/12/01/04/42/man-7628305_640.jpg',
    'https://cdn.pixabay.com/photo/2023/01/06/12/28/ninja-7701126_640.jpg',
    'https://cdn.pixabay.com/photo/2024/01/19/18/03/ai-generated-8519540_640.jpg',
    'https://cdn.pixabay.com/photo/2024/04/10/07/02/man-8687405_640.jpg',
    'https://cdn.pixabay.com/photo/2023/10/14/04/27/ai-generated-8313922_640.png',
  ],
  Audio: [
    'https://cdn.pixabay.com/audio/2025/01/07/audio_94546afc27.mp3',
    'https://cdn.pixabay.com/audio/2024/10/23/audio_a026e7e7df.mp3',
    'https://cdn.pixabay.com/audio/2024/09/29/audio_5c67567261.mp3',
    'https://cdn.pixabay.com/audio/2024/07/30/audio_e8c15810bd.mp3',
    'https://cdn.pixabay.com/audio/2024/07/30/audio_2944d6d258.mp3',
    'https://cdn.pixabay.com/audio/2024/07/14/audio_b902ec1118.mp3',
    'https://cdn.pixabay.com/audio/2024/07/05/audio_923e4d8360.mp3',
  ],
  Video: [
    'https://cdn.pixabay.com/video/2021/09/11/88207-602915574_tiny.mp4',
    'https://cdn.pixabay.com/video/2024/11/17/241802_tiny.mp4',
    'https://cdn.pixabay.com/video/2024/11/07/240330_tiny.mp4',
    'https://cdn.pixabay.com/video/2024/09/07/230248_tiny.mp4',
    'https://cdn.pixabay.com/video/2024/10/20/237249_tiny.mp4',
    'https://cdn.pixabay.com/video/2024/06/02/214940_tiny.mp4',
    'https://cdn.pixabay.com/video/2024/09/24/233037_tiny.mp4',
  ],
};

export const WEAVER_FREE_LIMIT = {
  max: 5,
  windowMs: 24 * 60 * 60 * 1000, // 1 day window
  countKeyPrefix: 'weaver_free_limit_count:',
  startedAtKeyPrefix: 'weaver_requests_started_at:',
};
