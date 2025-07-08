import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';

/**
 * Template metadata containing video and documentation links
 */
export const TEMPLATE_DATA: Record<string, { videoLink: string | null; docLink: string | null }> = {
  amazon_product_review_writer: {
    videoLink: null,
    docLink: null,
  },
  asana_tasks_manager: {
    videoLink: 'https://www.youtube.com/watch?v=jPBCl1Fy9hk',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/ops/asana-task-manager`,
  },
  azure_vision_ocr_agent: {
    videoLink: 'https://www.youtube.com/watch?v=H_7Ipun6nLI',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/dev/azure-vision`,
  },
  backlink_analysis_agent: {
    videoLink: 'https://www.youtube.com/watch?v=kIGjHSSUgjg',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/marketing/backlinks-analysis`,
  },
  bidirectional_messaging_agent: {
    videoLink: 'https://www.youtube.com/watch?v=x7b99ekK9oA',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/success/bidirectional-messaging`,
  },
  brand_agent: {
    videoLink: 'https://www.youtube.com/watch?v=3tpI32BH778',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/marketing/brand-agent`,
  },
  content_extractor: {
    videoLink: 'https://www.youtube.com/watch?v=ui9_W-JXmH8',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/marketing/content-extractor`,
  },
  content_keyphrase_analyzer: {
    videoLink: 'https://www.youtube.com/watch?v=izIPFZzETnA',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/marketing/seo-keyword-analyzer`,
  },
  content_strategy_generator: {
    videoLink: 'https://www.youtube.com/watch?v=sD2bchP-Uoo',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/marketing/content-strategy-generator`,
  },
  customer_review_analysis: {
    videoLink: 'https://www.youtube.com/watch?v=G09R9NRB37w',
    docLink: null,
  },
  document_summarizer: {
    videoLink: 'https://www.youtube.com/watch?v=I4PLRHQA8Vc',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/success/document-summarizer`,
  },
  dropbox_folder_creator: {
    videoLink: 'https://www.youtube.com/watch?v=cGlk4ONgWVU',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/dev/folder-creator-dropbox`,
  },
  email_sender: {
    videoLink: 'https://www.youtube.com/watch?v=BjuW0cOsbpo',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/sales/email-sender`,
  },
  employee_onboarding_agent: {
    videoLink: null,
    docLink: null,
  },
  file_analysis_agent: {
    videoLink: null,
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/dev/file-analysis`,
  },
  git_hub_content_manager: {
    videoLink: 'https://www.youtube.com/watch?v=HCzyC1vAd7Q',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/dev/github-content-manager`,
  },
  hubspot_contacts_manager: {
    videoLink: 'https://www.youtube.com/watch?v=zICb8AOinDg',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/sales/hubspot-contacts-manager`,
  },
  in_flow_inventory_agent: {
    videoLink: 'https://www.youtube.com/watch?v=w8FG8yaAYcE',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/ops/inflow-inventory`,
  },
  jira_service_desk_agent: {
    videoLink: null,
    docLink: null,
  },
  knowledge_base_search_with_gen_ai: {
    videoLink: null,
    docLink: null,
  },
  'kwrds.ai_seo_content_outliner': {
    videoLink: 'https://www.youtube.com/watch?v=IdakDNPxpno',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/marketing/kwrdsai-seo-content-outliner`,
  },
  lead_contacts_scraper: {
    videoLink: 'https://www.youtube.com/watch?v=RuRIS6a4ANU',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/sales/lead-contacts-scraper`,
  },
  linked_in_leads_builder: {
    videoLink: null,
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/sales/linkedin-leads-builder`,
  },
  meme_maker: {
    videoLink: 'https://www.youtube.com/watch?v=ClvdsDXI-PI',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/marketing/meme-agent`,
  },
  midjourney_agent: {
    videoLink: 'https://www.youtube.com/watch?v=uDja74GKMlc',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/dev/midjourney`,
  },
  mobile_message_sender: {
    videoLink: 'https://www.youtube.com/watch?v=j5LDedUh0_g',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/sales/mobile-message-sender`,
  },
  multimodal_thinker: {
    videoLink: 'https://www.youtube.com/watch?v=9bQwHZy-cL0',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/dev/multimodal-thinker`,
  },
  news_researcher: {
    videoLink: 'https://www.youtube.com/watch?v=SgJCK41SzJg',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/marketing/news-researcher`,
  },
  pdf_to_text_converter: {
    videoLink: 'https://www.youtube.com/watch?v=5J3OGs0VIck',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/dev/pdf-text-converter`,
  },
  press_release_agent: {
    videoLink: null,
    docLink: null,
  },
  product_description_writer: {
    videoLink: 'https://www.youtube.com/watch?v=JGzVwz-cn0M',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/marketing/product-description-writer`,
  },
  product_recommendation_agent: {
    videoLink: null,
    docLink: null,
  },
  sentiment_emotion_analyzer: {
    videoLink: 'https://www.youtube.com/watch?v=3vBinvVJZvE',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/dev/sentiment-emotion-analysis`,
  },
  content_writer: {
    videoLink: 'https://www.youtube.com/watch?v=ClKVBqY3_t8',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/marketing/seo-content-writer`,
  },
  seo_keyword_analyzer: {
    videoLink: null,
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/marketing/seo-keyword-analyzer`,
  },
  seo_keyword_researcher: {
    videoLink: 'https://www.youtube.com/watch?v=17XGx6tDRWs',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/marketing/seo-keyword-researcher`,
  },
  shopify_blog_manager: {
    videoLink: 'https://www.youtube.com/watch?v=qD4Ig_2df-g',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/marketing/shopify-blog-manager`,
  },
  text_to_audio_translator: {
    videoLink: 'https://www.youtube.com/watch?v=roQRFVEbprA',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/dev/text-audio-translator`,
  },
  transcript_analyzer: {
    videoLink: 'https://www.youtube.com/watch?v=gsRJ_46GFPw',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/success/transcript-analyzer`,
  },
  transparent_image_maker: {
    videoLink: 'https://www.youtube.com/watch?v=85LcMniv_Zw',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/dev/transparent-image-maker`,
  },
  youtube_to_seo_content_maker: {
    videoLink: 'https://www.youtube.com/watch?v=DAMe6I9nZZ8',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/marketing/youtube-to-seo-content-maker`,
  },
  zendesk_leads_manager: {
    videoLink: 'https://www.youtube.com/watch?v=z-mMICXkuX4',
    docLink: `${SMYTHOS_DOCS_URL}/agent-templates/sales/zendesk-leads-manager`,
  },
} as const;
