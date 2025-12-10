/**
 * Example AI API Integration
 * 
 * This file demonstrates how to use the ai-model-config utility
 * to make safe AI API calls that work with different models.
 */

// const axios = require('axios'); // Uncomment when making real API calls
const { createSafeAPIConfig } = require('./ai-model-config');

/**
 * Example: Making a safe OpenAI API call
 * 
 * This function demonstrates how to use the utility to ensure
 * your API calls work with both older models (GPT-4, GPT-3.5)
 * and newer models (o1-series) without parameter errors.
 */
async function makeSafeAIRequest(prompt, modelName = 'gpt-4') {
  try {
    // Define your desired parameters
    // The utility will automatically filter these based on model capabilities
    const requestParams = {
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 1000,
      frequency_penalty: 0.5,
      presence_penalty: 0.5,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    };

    // Create safe configuration for the specified model
    const safeConfig = createSafeAPIConfig({
      model: modelName,
      parameters: requestParams
    });

    console.log(`Making API call with ${modelName}...`);
    console.log('Safe parameters:', JSON.stringify(safeConfig, null, 2));

    // In a real implementation, you would make the actual API call:
    // const response = await axios.post(
    //   'https://api.openai.com/v1/chat/completions',
    //   safeConfig,
    //   {
    //     headers: {
    //       'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    //       'Content-Type': 'application/json'
    //     }
    //   }
    // );
    // 
    // return response.data;

    // For demonstration purposes, we'll just return the safe config
    return {
      success: true,
      model: modelName,
      safeParameters: safeConfig,
      message: 'Configuration created successfully (API call not executed in this example)'
    };

  } catch (error) {
    console.error('Error making AI request:', error.message);
    throw error;
  }
}

/**
 * Example usage with different models
 */
async function demonstrateUsage() {
  console.log('=== AI API Integration Example ===\n');

  // Example 1: Using with GPT-4 (all parameters supported)
  console.log('Example 1: GPT-4');
  const gpt4Result = await makeSafeAIRequest('What is the weather like?', 'gpt-4');
  console.log('Result:', gpt4Result);
  console.log('');

  // Example 2: Using with o1-mini (limited parameters)
  console.log('Example 2: o1-mini');
  const o1Result = await makeSafeAIRequest('What is the weather like?', 'o1-mini');
  console.log('Result:', o1Result);
  console.log('');

  console.log('=== Key Differences ===');
  console.log('GPT-4: Includes temperature, top_p, frequency_penalty, presence_penalty, max_tokens');
  console.log('o1-mini: Only includes max_completion_tokens (converted from max_tokens)');
  console.log('\nThis prevents the "Unsupported parameter" error!');
}

// Run the demonstration
if (require.main === module) {
  demonstrateUsage()
    .then(() => {
      console.log('\n=== Demonstration Complete ===');
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = {
  makeSafeAIRequest
};
