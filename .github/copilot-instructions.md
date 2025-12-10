# GitHub Copilot Instructions

## AI Model Configuration

When making AI API calls, ensure compatibility with the target model:

### Supported Parameters by Model

#### OpenAI GPT-4 and GPT-3.5 Models
- `temperature`: Supported (0-2)
- `top_p`: Supported (0-1)
- `max_tokens`: Supported
- `frequency_penalty`: Supported
- `presence_penalty`: Supported

#### OpenAI o1 Series Models (o1-preview, o1-mini, o3-mini)
- `temperature`: **NOT SUPPORTED** (fixed at 1)
- `top_p`: **NOT SUPPORTED** (fixed at 1)
- `max_tokens`: Supported (renamed to `max_completion_tokens`)
- `frequency_penalty`: **NOT SUPPORTED**
- `presence_penalty`: **NOT SUPPORTED**

### Best Practices

1. Always check model capabilities before setting parameters
2. Use conditional parameter inclusion based on model type
3. Handle API errors gracefully with proper error messages

### Error Handling

If you encounter "Unsupported parameter" errors:
- Remove the unsupported parameter from the API call
- Use model-specific parameter configurations
- Fallback to default model behavior when parameters aren't supported
