# GitHub Configuration

This directory contains configuration files for GitHub services and integrations.

## Files

### copilot-instructions.md
Documentation for GitHub Copilot configuration and model-specific requirements for GPT-5.1-Codex-Max.

### copilot-model-config.json
JSON configuration specifying supported and unsupported parameters for the GPT-5.1-Codex-Max model.

## GPT-5.1-Codex-Max Model

This repository is configured to work with GitHub Copilot's GPT-5.1-Codex-Max model.

### Key Points

1. **Unsupported Parameter**: The `top_p` parameter is NOT supported
2. **Alternative**: Use `temperature` parameter for controlling randomness
3. **Error Prevention**: Always check parameter compatibility before making API calls

### Quick Reference

Supported parameters:
- ✅ `temperature`
- ✅ `max_tokens`
- ✅ `frequency_penalty`
- ✅ `presence_penalty`

Unsupported parameters:
- ❌ `top_p`

## Error Troubleshooting

If you see this error:
```
Unsupported parameter: 'top_p' is not supported with this model.
Code: invalid_request_body
```

**Solution**: Remove the `top_p` parameter from your API request configuration.

## For Developers

If you're integrating AI services in this project:
1. Review `copilot-model-config.json` for parameter specifications
2. Do not use `top_p` parameter with GPT-5.1-Codex-Max
3. Use `temperature` instead for controlling output randomness
