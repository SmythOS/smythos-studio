import axios from 'axios';
import fs from 'fs';
import path from 'path';

import config from '../../config';
import SmythFS from '../../services/SmythFS.class';
import { getM2MToken } from '../../services/logto-helper';
import { isSmythStaff } from '../../utils';

const smythFS = new SmythFS();

export async function readAgentTemplates(req) {
  const templatesPath = path.join(config.env.DATA_PATH, 'templates/agents');
  try {
    //list .smyth files from templates/agents directory and return an object with file names and contents
    const templates = {};

    let files = await smythFS.readDirectory(templatesPath);
    files = files.filter((file) => file.endsWith('.smyth'));

    for (const file of files) {
      const filePath = path.join(templatesPath, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      let jsonContents = null;

      try {
        jsonContents = JSON.parse(fileContents);
      } catch (error) {
        console.log('error parsing agent template', file, error);

        // if something goes wrong parsing the file, go to the next one
        continue;
      }

      if (jsonContents) {
        if (!jsonContents.templateInfo) {
          jsonContents.templateInfo = {
            id: file.replace('.smyth', ''),
            name: jsonContents.template_name || jsonContents.name || file,
            description: jsonContents.description,
            icon: jsonContents.template_icon,
            category: '',
            color: '#000000',
            imageUrl: '',
            docLink: '',
            videoLink: '',
            valueProposition: '',
            publish: false,
          };
        }
        const publish = jsonContents?.templateInfo?.publish;

        if (publish || isSmythStaff(req._user)) {
          templates[file] = {
            template: jsonContents,
            id: jsonContents?.templateInfo?.id || file.replace('.smyth', ''),
            name:
              jsonContents?.templateInfo?.name ||
              jsonContents.template_name ||
              jsonContents.name ||
              file,
            description: jsonContents?.templateInfo?.description || jsonContents.description,
            icon: jsonContents?.templateInfo?.icon || jsonContents.template_icon,
            category: jsonContents?.templateInfo?.category || '',
            color: jsonContents?.templateInfo?.color || '#000000',
            imageUrl: jsonContents?.templateInfo?.imageUrl || '',
            docLink: jsonContents?.templateInfo?.docLink || '',
            videoLink: jsonContents?.templateInfo?.videoLink || '',
            valueProposition: jsonContents?.templateInfo?.valueProposition || '',
            publish: publish || false,
          };
        }
      }
    }

    return templates;
  } catch (error) {
    return {};
  }
}

export async function getIntegrations() {
  const integrations = [];
  try {
    const token = await getM2MToken();
    const result = await axios.get(`${config.api.SMYTH_M2M_API_URL}/app-config/collections`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const collections = result?.data?.collections || [];

    for (const col of collections) {
      const { id, name, color, icon } = col;
      const collection = {
        name,
        label: name,
        description: '',
        icon,
        color: color || '#000000',
        children: [],
      };

      const componentsResult = await axios.get(
        `${config.api.SMYTH_M2M_API_URL}/app-config/collections/${id}/components`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const components = componentsResult?.data?.components || [];
      collection.children = components.map((comp) => {
        let data: any = {};
        try {
          data = JSON.parse(comp.data);
        } catch (e) {}

        let tplColor = data.templateInfo?.color;
        if (tplColor == '#000000') tplColor = '';
        return {
          name: comp.name,
          label: data.templateInfo?.name || data.name,
          description: comp.templateInfo?.description || comp.description,
          icon: data.templateInfo?.icon || icon,
          color: tplColor || color || '#000000',
          visible: comp.visible,
          attributes: { 'smt-template-id': comp.id },
        };
      });

      integrations.push(collection);
      //if (collection.children.length > 0) integrations.push(collection);
    }

    return integrations;
  } catch (error) {
    console.log('error', error);
    return [];
  }
}
