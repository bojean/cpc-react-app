# GitHub Copilot Configuration

## Model Compatibility

This repository is configured to work with GitHub Copilot using the GPT-5.1-Codex-Max model.

### Important Model Limitations

The GPT-5.1-Codex-Max model has specific parameter requirements:

- **`top_p` parameter is NOT supported** - Do not include this parameter in API requests
- Use alternative sampling methods if needed

### Supported Parameters

When making requests to the GPT-5.1-Codex-Max model, use only these parameters:
- `temperature` - Controls randomness in responses
- `max_tokens` - Maximum length of generated response
- `frequency_penalty` - Reduces repetition
- `presence_penalty` - Encourages topic diversity

### Error Handling

If you encounter the error:
```
Unsupported parameter: 'top_p' is not supported with this model.
```

Remove the `top_p` parameter from your API request configuration.
