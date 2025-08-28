import { MODELS_FOR_LEGACY_USERS } from '@/constants';

/**
 * Adapts a model name based on user plan information and model availability.
 *
 * For users without access to built-in models (free users or users without the hasBuiltinModels flag),
 * this function prefixes certain models with 'legacy/' to ensure they can still be used.
 *
 * @param {string} model - The original model name to be adapted
 * @param {Record<string, any>} planInfo - User's plan information object
 * @param {boolean} [planInfo.isDefaultPlan] - Whether the user is on the default/free plan
 * @param {Object} [planInfo.flags] - Feature flags for the user's plan
 * @param {boolean} [planInfo.flags.hasBuiltinModels] - Whether the user has access to built-in models
 * @returns {string} The adapted model name, potentially prefixed with 'legacy/' if conditions are met.
 *                   In case of any error during processing, returns the original model unchanged.
 *
 * @example
 * -- For a free user trying to use a legacy model
 * adaptModel('gpt-3.5-turbo', { isDefaultPlan: true }) // Returns 'legacy/gpt-3.5-turbo'
 * 
 * @example
 * -- For a premium user
 * adaptModel('gpt-4', { isDefaultPlan: false, flags: { hasBuiltinModels: true } }) // Returns 'gpt-4'
 */
export function adaptModel(model: string, planInfo: Record<string, any>) {
    try {
        const isFreeUser = planInfo?.isDefaultPlan;
        const hasBuiltInModels = isFreeUser || planInfo?.flags?.hasBuiltinModels;

        // If the model is listed in the legacy models array and the user doesn't have access to built-in models, prefix the model with 'legacy/' to allow the model to be used
        if (!hasBuiltInModels && MODELS_FOR_LEGACY_USERS.includes(model)) {
            return `legacy/${model}`;
        }

        return model;
    } catch {
        // Fallback: if any error occurs during processing, return the original model to ensure function never throws
        return model;
    }
}
