import fs from 'fs/promises';

export function uid() {
    return (Date.now() + Math.random()).toString(36).replace('.', '').toUpperCase();
}

export const hasKeyTemplateVar = (str: string = ''): boolean => {
    if (!str || typeof str !== 'string') return false;
    return (str?.match(/{{KEY\((.*?)\)}}/g) ?? []).length > 0;
};

export function parseTemplate(str, obj, { escapeString = true, processUnmatched = true, unmached = '' } = {}) {
    try {
        const parsed = str?.replace(/{{(.*?)}}/g, function (match, varName) {
            // if key template var, return as is
            if (hasKeyTemplateVar(match)) return match;

            let objVal = obj[varName.trim()];

            if (typeof objVal === 'object') {
                objVal = JSON.stringify(objVal);
            } else {
                if (escapeString && typeof objVal === 'string') {
                    //escape double quotes, slashes ...
                    objVal = objVal?.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
                }
            }

            // Need to consider boolean 'false' as a valid value
            // const val = objVal || match;
            const val = objVal !== undefined ? objVal : match;

            return typeof val == 'string' || typeof val == 'number' ? val : JSON.stringify(val);
        });

        //replace unmached vars with default value, make sure to ignore the key template var
        return str == parsed && processUnmatched ? parsed?.replace(/{{(?!KEY\().*?}}/g, unmached) : parsed;
    } catch (err) {
        console.log('Error on parse template: ', err);

        return str;
    }
}

export const fsExists = async (path: string) => {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
};
