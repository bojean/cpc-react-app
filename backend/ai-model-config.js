/**
 * AI Model Configuration Utility
 * 
 * This module provides utilities for handling AI model parameters
 * to ensure compatibility across different AI models.
 */

/**
 * Model types and their supported parameters
 */
const MODEL_CONFIGS = {
  // OpenAI GPT-4 and GPT-3.5 series
  'gpt-4': {
    supports: ['temperature', 'top_p', 'max_tokens', 'frequency_penalty', 'presence_penalty', 'n', 'stop'],
    maxTokensKey: 'max_tokens'
  },
  'gpt-4-turbo': {
    supports: ['temperature', 'top_p', 'max_tokens', 'frequency_penalty', 'presence_penalty', 'n', 'stop'],
    maxTokensKey: 'max_tokens'
  },
  'gpt-3.5-turbo': {
    supports: ['temperature', 'top_p', 'max_tokens', 'frequency_penalty', 'presence_penalty', 'n', 'stop'],
    maxTokensKey: 'max_tokens'
  },
  
  // OpenAI o1 series - Limited parameter support
  'o1-preview': {
    supports: ['max_completion_tokens'],
    maxTokensKey: 'max_completion_tokens',
    fixedParams: { temperature: 1, top_p: 1 }
  },
  'o1-mini': {
    supports: ['max_completion_tokens'],
    maxTokensKey: 'max_completion_tokens',
    fixedParams: { temperature: 1, top_p: 1 }
  },
  'o3-mini': {
    supports: ['max_completion_tokens'],
    maxTokensKey: 'max_completion_tokens',
    fixedParams: { temperature: 1, top_p: 1 }
  }
};

/**
 * Detects model family from model name
 * @param {string} model - Model identifier
 * @returns {string} Model family key
 */
function detectModelFamily(model) {
  if (!model) return 'gpt-4'; // Default
  
  const lowerModel = model.toLowerCase();
  
  if (lowerModel.includes('o1-preview')) return 'o1-preview';
  if (lowerModel.includes('o1-mini')) return 'o1-mini';
  if (lowerModel.includes('o3-mini')) return 'o3-mini';
  if (lowerModel.includes('gpt-4-turbo')) return 'gpt-4-turbo';
  if (lowerModel.includes('gpt-4')) return 'gpt-4';
  if (lowerModel.includes('gpt-3.5')) return 'gpt-3.5-turbo';
  
  return 'gpt-4'; // Default to GPT-4
}

/**
 * Filters API parameters based on model capabilities
 * @param {Object} params - Raw API parameters
 * @param {string} model - Model identifier
 * @returns {Object} Filtered parameters safe for the model
 */
function filterParametersForModel(params, model) {
  const modelFamily = detectModelFamily(model);
  const config = MODEL_CONFIGS[modelFamily] || MODEL_CONFIGS['gpt-4'];
  
  const filteredParams = {};
  
  // Add only supported parameters
  for (const [key, value] of Object.entries(params)) {
    if (config.supports.includes(key)) {
      filteredParams[key] = value;
    }
    // Special handling for max_tokens conversion to max_completion_tokens
    else if (key === 'max_tokens' && config.maxTokensKey === 'max_completion_tokens') {
      filteredParams['max_completion_tokens'] = value;
    }
  }
  
  // Add model parameter if not present
  if (!filteredParams.model) {
    filteredParams.model = model;
  }
  
  return filteredParams;
}

/**
 * Creates a safe API request configuration
 * @param {Object} options - Request options
 * @param {string} options.model - Model identifier
 * @param {Object} options.parameters - API parameters
 * @returns {Object} Safe request configuration
 */
function createSafeAPIConfig(options) {
  const { model = 'gpt-4', parameters = {} } = options;
  
  // Filter parameters based on model
  const safeParams = filterParametersForModel(parameters, model);
  
  return {
    model,
    ...safeParams
  };
}

/**
 * Validates if a parameter is supported by a model
 * @param {string} parameter - Parameter name
 * @param {string} model - Model identifier
 * @returns {boolean} True if supported
 */
function isParameterSupported(parameter, model) {
  const modelFamily = detectModelFamily(model);
  const config = MODEL_CONFIGS[modelFamily] || MODEL_CONFIGS['gpt-4'];
  return config.supports.includes(parameter);
}

/**
 * Gets warning message for unsupported parameters
 * @param {string[]} unsupportedParams - List of unsupported parameters
 * @param {string} model - Model identifier
 * @returns {string} Warning message
 */
function getUnsupportedParamsWarning(unsupportedParams, model) {
  if (unsupportedParams.length === 0) return '';
  
  return `Warning: The following parameters are not supported by ${model} and will be ignored: ${unsupportedParams.join(', ')}`;
}

module.exports = {
  MODEL_CONFIGS,
  detectModelFamily,
  filterParametersForModel,
  createSafeAPIConfig,
  isParameterSupported,
  getUnsupportedParamsWarning
};
