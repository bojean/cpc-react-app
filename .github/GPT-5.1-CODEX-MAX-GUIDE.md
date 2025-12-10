# GPT-5.1-Codex-Max Integration Guide

## Problem Statement

The GPT-5.1-Codex-Max model from OpenAI does not support the `top_p` parameter, which was causing the following error:

```
Request Failed: 400 {"error":{"message":"Unsupported parameter: 'top_p' is not supported with this model.","code":"invalid_request_body"}}
```

## Solution

This repository now includes comprehensive configuration and documentation for GitHub Copilot's GPT-5.1-Codex-Max model.

### Files Added

#### 1. `.copilot-settings.json` (Root Level)
Quick reference configuration file at the repository root for easy access.

**Purpose**: Provides immediate visibility of model settings
**Usage**: Reference this file when configuring AI integrations

#### 2. `.github/copilot-model-config.json`
Detailed machine-readable configuration with full parameter specifications.

**Purpose**: Complete technical specification of supported/unsupported parameters
**Usage**: Parse this file programmatically in tools and scripts

#### 3. `.github/copilot-instructions.md`
Human-readable documentation for developers.

**Purpose**: Quick reference guide for common tasks and troubleshooting
**Usage**: Read when encountering model-related errors

#### 4. `.github/README.md`
Comprehensive GitHub configuration guide.

**Purpose**: Central documentation hub for all GitHub-related settings
**Usage**: Starting point for understanding repository configuration

#### 5. `README.md` (Updated)
Main project README with AI model compatibility section.

**Purpose**: Project overview including AI integration details
**Usage**: Entry point for new contributors

## Key Configuration Details

### Supported Parameters

| Parameter | Type | Range | Default | Description |
|-----------|------|-------|---------|-------------|
| `temperature` | number | 0-2 | 0.7 | Controls randomness in responses |
| `max_tokens` | integer | 1-8192 | 2048 | Maximum tokens to generate |
| `frequency_penalty` | number | -2 to 2 | 0 | Penalizes frequent tokens |
| `presence_penalty` | number | -2 to 2 | 0 | Penalizes existing tokens |

### Unsupported Parameters

- **`top_p`** - Nucleus sampling parameter (NOT supported)

### Alternative to top_p

Instead of using `top_p` for controlling output diversity:
- Use the `temperature` parameter
- Higher temperature (e.g., 0.8-1.5) = more random/creative
- Lower temperature (e.g., 0.3-0.7) = more focused/deterministic

## Error Prevention

### Before Making API Calls

1. Check that `top_p` is not in your parameter list
2. Verify all parameters are in the supported list
3. Use default values if unsure

### If Error Occurs

```json
{
  "error": {
    "message": "Unsupported parameter: 'top_p' is not supported with this model.",
    "code": "invalid_request_body"
  }
}
```

**Solution**: Remove `top_p` from your request and use `temperature` instead.

## Example Configuration

### ✅ Correct Configuration

```json
{
  "model": "gpt-5.1-codex-max",
  "temperature": 0.7,
  "max_tokens": 2048,
  "frequency_penalty": 0,
  "presence_penalty": 0
}
```

### ❌ Incorrect Configuration

```json
{
  "model": "gpt-5.1-codex-max",
  "temperature": 0.7,
  "top_p": 0.9,  // ❌ This will cause an error!
  "max_tokens": 2048
}
```

## Integration Guidelines

### For Developers

1. Always reference `.github/copilot-model-config.json` for current specifications
2. Never hardcode `top_p` in API calls
3. Use temperature for controlling randomness
4. Test with default parameters first

### For CI/CD Pipelines

1. Validate API configurations against `copilot-model-config.json`
2. Add linting rules to prevent `top_p` usage
3. Include model compatibility checks in pre-commit hooks

### For New Contributors

1. Read `README.md` for project overview
2. Review `.github/copilot-instructions.md` for quick reference
3. Check `.copilot-settings.json` for current model settings

## Testing

To test if your configuration is correct:

1. Ensure no `top_p` parameter is present
2. Verify all parameters match the supported list
3. Use the example configuration above as a template
4. Monitor API responses for any parameter-related errors

## Troubleshooting

### Common Issues

**Issue**: Getting 400 Bad Request errors
**Solution**: Check if you're using `top_p` parameter

**Issue**: Unexpected model behavior
**Solution**: Review parameter values against specifications in `copilot-model-config.json`

**Issue**: Configuration not being applied
**Solution**: Verify configuration file is in correct location and properly formatted JSON

## Additional Resources

- OpenAI API Documentation: https://platform.openai.com/docs/api-reference
- GitHub Copilot Documentation: https://docs.github.com/en/copilot
- Model-specific documentation: See `.github/copilot-model-config.json`

## Version History

- v1.0.0 (2025-12-10): Initial configuration for GPT-5.1-Codex-Max model
  - Added comprehensive documentation
  - Created machine-readable and human-readable configs
  - Documented unsupported `top_p` parameter

## Support

For issues or questions:
1. Check this guide first
2. Review `.github/copilot-instructions.md`
3. Open an issue in the repository
4. Tag issues with `ai-integration` label
