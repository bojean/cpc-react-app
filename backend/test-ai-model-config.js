/**
 * Tests for AI Model Configuration Utility
 * Run with: node test-ai-model-config.js
 */

const {
  detectModelFamily,
  filterParametersForModel,
  createSafeAPIConfig,
  isParameterSupported,
  getUnsupportedParamsWarning
} = require('./ai-model-config');

console.log('=== AI Model Config Utility Tests ===\n');

// Test 1: Model family detection
console.log('Test 1: Model Family Detection');
console.log('  o1-mini ->', detectModelFamily('o1-mini'));
console.log('  gpt-4 ->', detectModelFamily('gpt-4'));
console.log('  gpt-3.5-turbo ->', detectModelFamily('gpt-3.5-turbo'));
console.log('  o1-preview ->', detectModelFamily('o1-preview'));
console.log('');

// Test 2: Parameter filtering for different models
console.log('Test 2: Parameter Filtering');
const testParams = {
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 1000,
  frequency_penalty: 0.5,
  presence_penalty: 0.5
};

console.log('  Original params:', JSON.stringify(testParams, null, 2));
console.log('\n  Filtered for gpt-4:');
console.log('  ', JSON.stringify(filterParametersForModel(testParams, 'gpt-4'), null, 2));

console.log('\n  Filtered for o1-mini:');
console.log('  ', JSON.stringify(filterParametersForModel(testParams, 'o1-mini'), null, 2));
console.log('');

// Test 3: Safe API configuration
console.log('Test 3: Safe API Configuration');
const safeConfig1 = createSafeAPIConfig({
  model: 'gpt-4',
  parameters: testParams
});
console.log('  GPT-4 config:', JSON.stringify(safeConfig1, null, 2));

const safeConfig2 = createSafeAPIConfig({
  model: 'o1-mini',
  parameters: testParams
});
console.log('\n  o1-mini config:', JSON.stringify(safeConfig2, null, 2));
console.log('');

// Test 4: Parameter support checking
console.log('Test 4: Parameter Support Checking');
console.log('  top_p supported by gpt-4?', isParameterSupported('top_p', 'gpt-4'));
console.log('  top_p supported by o1-mini?', isParameterSupported('top_p', 'o1-mini'));
console.log('  max_tokens supported by gpt-4?', isParameterSupported('max_tokens', 'gpt-4'));
console.log('  max_completion_tokens supported by o1-mini?', isParameterSupported('max_completion_tokens', 'o1-mini'));
console.log('');

// Test 5: Warning messages
console.log('Test 5: Warning Messages');
const unsupportedForO1 = ['temperature', 'top_p', 'frequency_penalty'];
const warning = getUnsupportedParamsWarning(unsupportedForO1, 'o1-mini');
console.log('  Warning:', warning);
console.log('');

// Test 6: Edge cases
console.log('Test 6: Edge Cases');
console.log('  Empty params for gpt-4:', JSON.stringify(filterParametersForModel({}, 'gpt-4'), null, 2));
console.log('  Undefined model:', detectModelFamily(undefined));
console.log('  Unknown model:', detectModelFamily('unknown-model-xyz'));
console.log('');

console.log('=== All tests completed ===');
