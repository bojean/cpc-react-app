# AI Model Parameter Compatibility Fix

## Problem
The application was encountering an error: "Request Failed: 400 - Unsupported parameter: 'top_p' is not supported with this model."

This error occurs when using OpenAI's o1-series models (o1-preview, o1-mini, o3-mini) with parameters like `top_p` and `temperature` that are not supported by these models.

## Solution
This repository now includes utilities to handle AI model parameter compatibility:

### 1. Copilot Instructions (`.github/copilot-instructions.md`)
Documentation for GitHub Copilot users on proper parameter usage with different AI models.

### 2. AI Model Configuration Utility (`backend/ai-model-config.js`)
A Node.js module that provides:
- Model capability detection
- Parameter filtering based on model support
- Safe API configuration creation
- Parameter validation

## Usage

### For AI API Integrations

If you need to integrate AI API calls in this application, use the provided utility:

```javascript
const { createSafeAPIConfig } = require('./ai-model-config');

// Example: Creating a safe API call configuration
const apiConfig = createSafeAPIConfig({
  model: 'o1-mini', // or 'gpt-4', 'gpt-3.5-turbo', etc.
  parameters: {
    temperature: 0.7,      // Will be filtered out for o1 models
    top_p: 0.9,           // Will be filtered out for o1 models
    max_tokens: 1000,     // Will be converted to max_completion_tokens for o1 models
    messages: [/* your messages */]
  }
});

// apiConfig will only contain supported parameters
```

### For GitHub Copilot Workspace

If you're using GitHub Copilot Workspace or similar AI-powered tools:
1. Refer to `.github/copilot-instructions.md` for model-specific parameter guidance
2. Ensure your AI agent configuration doesn't include unsupported parameters

## Model Support Matrix

| Parameter | GPT-4 / GPT-3.5 | o1-preview / o1-mini / o3-mini |
|-----------|-----------------|--------------------------------|
| `temperature` | ✅ Supported | ❌ Not Supported (fixed at 1) |
| `top_p` | ✅ Supported | ❌ Not Supported (fixed at 1) |
| `max_tokens` | ✅ Supported | ✅ Supported (as `max_completion_tokens`) |
| `frequency_penalty` | ✅ Supported | ❌ Not Supported |
| `presence_penalty` | ✅ Supported | ❌ Not Supported |

## Testing

To test the AI model configuration utility:

```javascript
const { filterParametersForModel } = require('./backend/ai-model-config');

// Test with o1-mini model
const params = {
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 1000
};

const filtered = filterParametersForModel(params, 'o1-mini');
console.log(filtered); // { max_completion_tokens: 1000 }
```

## References

- [OpenAI o1 Series Documentation](https://platform.openai.com/docs/models/o1)
- [OpenAI API Parameters](https://platform.openai.com/docs/api-reference/chat/create)

## Contributing

When adding AI features to this application:
1. Always use the `ai-model-config.js` utility for parameter handling
2. Test with different models to ensure compatibility
3. Document any new model-specific behaviors
