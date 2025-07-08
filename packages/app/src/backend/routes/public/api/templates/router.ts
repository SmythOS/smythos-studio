import express from 'express';

import config from '../../../../config';
import { readAgentTemplates, getIntegrations } from '../../../router.utils';
import { ENTERPRISE_COLLECTION_TEMPLATE_NAMES } from '../../../../../shared/constants/general';

const router = express.Router();

router.get('/agent-templates', async (req, res) => {
  try {
    const templates = await readAgentTemplates(req);

    const templatesInfo = [];

    for (const [key, value] of Object.entries(templates)) {
      const info = (value as Record<string, any>)?.template?.templateInfo;
      const templateData = (value as Record<string, any>)?.template;

      if (info?.publish) {
        const {
          id,
          name,
          description = '',
          icon = '',
          imageUrl = '',
          docLink = '',
          videoLink = '',
          valueProposition = '',
        } = info;

        const uiServer = new URL(config.env.UI_SERVER);
        const url = new URL(`/builder?templateId=${info.id}.smyth`, uiServer).toString();

        let categories = info?.category || [];

        if (categories && typeof categories === 'string') {
          categories = categories.split(',');
        }

        // here spreading 'info' like {...info} works, but we want to make sure that all properties are present even it's undefined
        templatesInfo.push({
          id,
          name,
          description,
          icon,
          imageUrl,
          docLink,
          videoLink,
          categories,
          url,
          behavior: templateData?.behavior,
          template: templateData, // Include the full template data
          file: info?.id,
          business_only: ENTERPRISE_COLLECTION_TEMPLATE_NAMES.includes(name),
        });
      }
    }

    return res.send({ success: true, data: templatesInfo });
  } catch (error) {
    console.error('Error in getting agent-templates:', error);
    return res.send({ success: true, data: {} });
  }
});

router.get('/component-templates', async (req, res) => {
  try {
    const integrations = await getIntegrations();

    const templatesInfo = [];

    for (const integration of integrations) {
      const { children } = integration;
      templatesInfo.push(
        ...children
          .filter((child) => child?.visible)
          .map((child) => {
            const id = child.attributes['smt-template-id'];

            // remove the attributes, as we moved it to the id property
            delete child.attributes;
            delete child.visible; // don't need 'visible' property

            return {
              id,
              collectionName: integration.name,
              ...child,
            };
          }),
      );
    }

    return res.send({ success: true, data: templatesInfo });
  } catch (error) {
    return res.send({ success: true, data: {} });
  }
});

export default router;
