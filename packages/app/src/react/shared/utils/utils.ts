export function constructS3Url(key: string) {
  return `storage:${key}`;
}

export const autoDetectDSFileType = async (file: File) => {
  const { name } = file;
  const ext = name.split('.').pop().toLowerCase();

  switch (ext) {
    case 'pdf':
      return 'PDF';
    case 'xml':
      const xmlType = await getXMLType(file);
      const isSitemapData = xmlType === 'SITEMAP' || xmlType === 'SITEMAP_INDEX';
      return isSitemapData ? 'SITEMAP' : 'WEBPAGE';
    case 'html':
    case 'htm':
    case 'txt':
      return 'WEBPAGE';
    case 'doc':
    case 'docx':
      return 'WORD';
    default:
      return null;
  }
};

type XMLType = 'SITEMAP' | 'SITEMAP_INDEX' | 'OTHER';
export const getXMLType = (file: File): Promise<XMLType> => {
  if (!file) {
    return Promise.resolve('OTHER');
  }
  const reader = new FileReader();
  reader.readAsText(file);
  return new Promise((resolve, reject) => {
    reader.onload = () => {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(reader.result as string, 'text/xml');
      const root = xmlDoc.documentElement.nodeName;
      if (root === 'urlset') {
        resolve('SITEMAP');
      } else if (root === 'sitemapindex') {
        resolve('SITEMAP_INDEX');
      } else {
        resolve('OTHER');
      }
    };
  });
};

export const urlRegExp = new RegExp(
  /^((https?|ftp):\/\/)?(www.)?(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i,
);

export const validateURL = (url: string) => {
  return urlRegExp.test(url.trim());
};

export const validateDomains = (domains: string[]): boolean => {
  for (let domain of domains) {
    if (!validateURL(domain)) {
      return false;
    }
  }
  return true;
};
export const calculateCompletionPercentage = (stats) => {
  const completed = stats?.statusData?.sitemapStatus?.res?.status?.completed || 0;
  const total = stats?.statusData?.sitemapStatus?.res?.status?.total || 0;
  return Math.round((completed / total) * 100);
};

export const fetchStatusData = async (datasourceId) => {
  const statusDataResponse = await fetch(`/api/page/vectors/datasourceStatus?id=${datasourceId}`);
  const statusData = await statusDataResponse.json();
  return statusData;
};

export const fetchSitemapStatus = async (datasourceID) => {
  const sitemapStatusResponse = await fetch(`/api/page/vectors/sitemapStatus?id=${datasourceID}`);
  const sitemapData = await sitemapStatusResponse.json();
  return sitemapData;
};

export interface LocalStorageArrayRetriever {
  get: (childKey: string) => any;
  set: (childKey: string, value: any) => void;
  remove: (childKey: string) => void;
}
export const createLocalStorageArrayRetriever = (parentKey: string): LocalStorageArrayRetriever => {
  return {
    get(childKey: string) {
      const parent = localStorage.getItem(parentKey);

      if (!parent) return null;

      const parsed = JSON.parse(parent);

      return parsed[childKey] || null;
    },
    set(childKey: string, value: any) {
      const parent = localStorage.getItem(parentKey);

      if (!parent) {
        const newParent = { [childKey]: value };
        localStorage.setItem(parentKey, JSON.stringify(newParent));
      } else {
        const parsed = JSON.parse(parent);
        parsed[childKey] = value;
        localStorage.setItem(parentKey, JSON.stringify(parsed));
      }
    },

    remove(childKey: string) {
      const parent = localStorage.getItem(parentKey);

      if (!parent) return;

      const parsed = JSON.parse(parent);
      delete parsed[childKey];
      localStorage.setItem(parentKey, JSON.stringify(parsed));
    },
  };
};

/**
 * Shorthand for class names
 * Use to join classes together and to conditionally apply classes
 * @example cn('bg-red-500', { 'bg-red-500': true })
 */
export function cn(...classes: any[]): string {
  return classes.filter(Boolean).join(' ');
}

