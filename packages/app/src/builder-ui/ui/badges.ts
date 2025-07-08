import {
  IconImage,
  IconAudio,
  IconVideo,
  IconDocument,
  IconSearch,
  IconReasoning,
} from '../ui/icons';

export function createBadge(label: string, classes: string = '', attrs = ''): string {
  return `<span class="smyth-badge text-[0.75em] font-medium me-2 px-1 py-0.5 rounded border border-solid inline-block align-middle text-xs h-5 ${classes}" ${attrs}>${label}</span>`;
}

export function createIconBadge(icon: string, classes: string = '', attrs = ''): string {
  return `<span class="smyth-badge text-[0.75em] font-medium me-1 rounded inline-block text-xs align-middle ${classes}" ${attrs}>${icon}</span>`;
}

export type FeatureType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'tools'
  | 'search'
  | 'image-generation'
  | 'text-to-image'
  | 'image-to-image'
  | 'image-inpainting'
  | 'image-outpainting'
  | 'reasoning';

export type ModelStatus =
  | 'new'
  | 'legacy'
  | 'limited'
  | 'deprecated'
  | 'removed'
  | 'groq'
  | 'togetherai'
  | 'xai'
  | 'smythos'
  | 'stable'
  | 'personal'
  | 'enterprise';

type BadgeConfig = {
  readonly label: string;
  readonly icon: string;
  readonly classes: string;
};

const statusBadgeConfigs: Record<ModelStatus, BadgeConfig> = {
  new: { label: 'New', icon: '', classes: 'text-smyth-emerald-400 border-smyth-emerald-400' },
  legacy: { label: 'Legacy', icon: '', classes: 'text-smyth-amber-500 border-smyth-amber-500' },
  limited: { label: 'Limited', icon: '', classes: 'text-smyth-amber-500 border-smyth-amber-500' },
  deprecated: { label: 'Deprecated', icon: '', classes: 'text-smyth-red-500 border-smyth-red-500' },
  removed: { label: 'Removed', icon: '', classes: 'text-smyth-red-500 border-smyth-red-500' },
  groq: { label: 'Groq', icon: '', classes: 'text-gray-700 border-gray-700' },
  togetherai: { label: 'TogetherAI', icon: '', classes: 'text-gray-700 border-gray-700' },
  xai: { label: 'xAI', icon: '', classes: 'text-gray-700 border-gray-700' },
  smythos: { label: 'SmythOS', icon: '', classes: 'text-gray-700 border-gray-700' },
  stable: { label: 'Stable', icon: '', classes: 'text-indigo-400 border-indigo-400' },
  personal: { label: 'Personal', icon: '', classes: 'bg-[#c0daff] text-[#235192] border-0' },
  enterprise: { label: 'Enterprise', icon: '', classes: 'bg-[#F1C5FF] text-[#772590] border-0' },
} as const;

const capabilityBadgeConfigs: Record<FeatureType, BadgeConfig> = {
  text: { label: 'Text', icon: '', classes: 'hidden' },
  image: { label: 'Image', icon: IconImage, classes: '' },
  audio: { label: 'Audio', icon: IconAudio, classes: '' },
  video: { label: 'Video', icon: IconVideo, classes: '' },
  document: { label: 'Document', icon: IconDocument, classes: '' },
  tools: { label: 'Tools', icon: '', classes: 'hidden' },
  search: { label: 'Search', icon: IconSearch, classes: '' },
  reasoning: { label: 'Reasoning', icon: IconReasoning, classes: '' },
  'image-generation': { label: 'Image Generation', icon: IconImage, classes: 'hidden' },
  'text-to-image': { label: 'Text to Image', icon: IconImage, classes: 'hidden' },
  'image-to-image': { label: 'Image to Image', icon: IconImage, classes: 'hidden' },
  'image-inpainting': { label: 'Image Inpainting', icon: IconImage, classes: 'hidden' },
  'image-outpainting': { label: 'Image Outpainting', icon: IconImage, classes: 'hidden' },
} as const;

function createBadgeFromConfig(config: BadgeConfig): string {
  return config.icon
    ? createIconBadge(config.icon, config.classes)
    : createBadge(config.label, config.classes);
}

function generateBadges<T extends string>(
  tags: readonly T[],
  configs: Record<string, BadgeConfig>,
  defaultClasses = 'text-gray-500 border-gray-500',
): string {
  if (!Array.isArray(tags)) return '';

  return tags
    .map((tag) => {
      if (typeof tag !== 'string') return '';
      const normalizedTag = tag.toLowerCase();
      const config = configs[normalizedTag];
      return config ? createBadgeFromConfig(config) : createBadge(tag, defaultClasses);
    })
    .filter(Boolean)
    .join('');
}

export function generateModelStatusBadges(tags: string[]): string {
  return generateBadges(tags, statusBadgeConfigs);
}

// We wrap the capability badges in a span for proper alignment
export function generateModelCapabilityBadges(features: string[]): string {
  return generateBadges(features, capabilityBadgeConfigs);
}

export function createLockBadge() {
  return `<span class="relative inline-flex mif-lock px-4 align-middle" style="color: #2AAD8E; font-size: 1.2em;"></span>`;
}
