import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
console.log('Loaded API Key:', GEMINI_API_KEY); // Confirm key is loaded

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Rate limiting configuration - extremely conservative limits
const RATE_LIMIT = {
  maxRequestsPerMinute: 5, // Reduced from 10 to 5
  maxTokensPerMinute: 5000, // Reduced from 10000 to 5000
  requests: [] as number[],
  tokens: [] as number[],
  lastErrorTime: 0,
  consecutiveErrors: 0,
  requestQueue: [] as Array<() => Promise<any>>,
  isProcessingQueue: false,
};

// Helper function to clean up old requests
function cleanupOldRequests() {
  const oneMinuteAgo = Date.now() - 60000;
  RATE_LIMIT.requests = RATE_LIMIT.requests.filter(time => time > oneMinuteAgo);
  RATE_LIMIT.tokens = RATE_LIMIT.tokens.filter(time => time > oneMinuteAgo);
}

// Helper function to check rate limits
function checkRateLimits(tokenCount: number): { canProceed: boolean; waitTime: number } {
  cleanupOldRequests();
  
  // Add exponential backoff based on consecutive errors
  if (RATE_LIMIT.consecutiveErrors > 0) {
    const backoffTime = Math.min(1000 * Math.pow(2, RATE_LIMIT.consecutiveErrors), 120000); // Increased max backoff to 2 minutes
    const timeSinceLastError = Date.now() - RATE_LIMIT.lastErrorTime;
    if (timeSinceLastError < backoffTime) {
      return { canProceed: false, waitTime: backoffTime - timeSinceLastError };
    }
  }
  
  if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequestsPerMinute) {
    const oldestRequest = RATE_LIMIT.requests[0];
    const waitTime = 60000 - (Date.now() - oldestRequest);
    return { canProceed: false, waitTime };
  }
  
  if (RATE_LIMIT.tokens.length >= RATE_LIMIT.maxTokensPerMinute) {
    const oldestToken = RATE_LIMIT.tokens[0];
    const waitTime = 60000 - (Date.now() - oldestToken);
    return { canProceed: false, waitTime };
  }
  
  return { canProceed: true, waitTime: 0 };
}

// Helper function to update rate limits
function updateRateLimits(tokenCount: number) {
  const now = Date.now();
  RATE_LIMIT.requests.push(now);
  RATE_LIMIT.tokens.push(now);
  // Reset error counter on successful request
  RATE_LIMIT.consecutiveErrors = 0;
}

// Helper function to handle rate limit errors
function handleRateLimitError() {
  RATE_LIMIT.lastErrorTime = Date.now();
  RATE_LIMIT.consecutiveErrors++;
  // Cap consecutive errors at 6 to prevent excessive backoff
  RATE_LIMIT.consecutiveErrors = Math.min(RATE_LIMIT.consecutiveErrors, 6);
}

// Helper function to process the request queue
async function processQueue() {
  if (RATE_LIMIT.isProcessingQueue || RATE_LIMIT.requestQueue.length === 0) {
    return;
  }

  RATE_LIMIT.isProcessingQueue = true;
  
  while (RATE_LIMIT.requestQueue.length > 0) {
    const request = RATE_LIMIT.requestQueue[0];
    try {
      await request();
      RATE_LIMIT.requestQueue.shift(); // Remove the completed request
    } catch (error: any) {
      // If we hit a rate limit, stop processing and wait
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        handleRateLimitError();
        break;
      }
      // For other errors, remove the request and continue
      RATE_LIMIT.requestQueue.shift();
    }
    
    // Add a delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  RATE_LIMIT.isProcessingQueue = false;
}

export async function getRecyclingAdvice(prompt: string, detectedItems: string[] = []) {
  return new Promise((resolve, reject) => {
    const executeRequest = async () => {
      try {
        if (!GEMINI_API_KEY) {
          throw new Error('Gemini API key is not configured');
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const fullPrompt = `You are a helpful recycling assistant. Analyze the following items detected in an image and provide practical advice.
          ${detectedItems.length > 0 ? `\nDetected Items: ${detectedItems.join(', ')}` : 'No items detected.'}
          \nUser Question: ${prompt}
          \nProvide clear, actionable recycling or disposal advice for the detected items in plain text. Do not use Markdown (e.g., **, *, #), special characters, or formatting—return only plain text.`;

        // Estimate token count (rough estimation: 1 token ≈ 4 characters)
        const estimatedTokens = Math.ceil(fullPrompt.length / 4);
        
        // Check rate limits
        const { canProceed, waitTime } = checkRateLimits(estimatedTokens);
        if (!canProceed) {
          throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`);
        }

        console.log('Sending request to Gemini with prompt:', fullPrompt);
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.8,
            maxOutputTokens: 1000,
          },
        });

        // Update rate limits after successful request
        updateRateLimits(estimatedTokens);

        const response = await result.response;
        console.log('Gemini response:', response.text());
        resolve(response.text());
      } catch (error: any) {
        console.error('Error getting recycling advice:', error);
        
        // Handle rate limit errors
        if (error.message?.includes('429') || error.message?.includes('quota')) {
          handleRateLimitError();
          const waitTime = Math.min(1000 * Math.pow(2, RATE_LIMIT.consecutiveErrors), 120000);
          reject(new Error(`The service is currently busy. Please try again in ${Math.ceil(waitTime / 1000)} seconds.`));
          return;
        }
        
        // Handle other specific error cases
        if (error.message?.includes('API_KEY_INVALID')) {
          reject(new Error('Invalid API key. Please check your configuration in Google Cloud Console.'));
          return;
        }
        if (error.message?.includes('API not enabled')) {
          reject(new Error('Please enable the Generative Language API in your Google Cloud Console and ensure billing is set up.'));
          return;
        }
        if (error.message?.includes('Rate limit exceeded')) {
          reject(new Error(error.message));
          return;
        }
        
        reject(new Error('Unable to connect to AI service. Please try again later.'));
      }
    };

    // Add the request to the queue
    RATE_LIMIT.requestQueue.push(executeRequest);
    
    // Start processing the queue if it's not already being processed
    if (!RATE_LIMIT.isProcessingQueue) {
      processQueue();
    }
  });
}

async function listAvailableModels() {
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1/models?key=' + GEMINI_API_KEY,
      { method: 'GET' }
    );
    const data = await response.json();
    console.log('Available models:', data.models || data);
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

export async function analyzeWasteHabits(items: Array<{ type: string; timestamp: number }>) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const itemCounts = items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const analysisPrompt = `
As a Waste Analysis AI, analyze these waste disposal patterns and provide personalized recommendations:

Waste Items (last 7 days):
${Object.entries(itemCounts)
  .map(([type, count]) => `- ${type}: ${count} items`)
  .join('\n')}

Provide analysis in this format:
1. Key Patterns
2. Environmental Impact
3. Specific Recommendations
4. Sustainable Alternatives
5. Action Items

Focus on practical, achievable suggestions for reducing waste and improving recycling habits. Return the response in plain text without Markdown (e.g., **, *, #) or special characters.`;

    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error analyzing waste habits:', error);
    return 'Unable to analyze waste habits at this time.';
  }
}

export async function getDisposalGuide(itemType: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const guidePrompt = `
Provide a professional disposal guide for: ${itemType}

Material Composition:
[List main materials]

Disposal Steps:
[Numbered steps]

Safety Guidelines:
[Key safety points]

Recycling Options:
[Available recycling methods]

Environmental Considerations:
[Impact and alternatives]

Format the response in clear sections without any markdown or special characters.`;

    const result = await model.generateContent(guidePrompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error getting disposal guide:', error);
    return 'Unable to generate disposal guide at this time.';
  }
}
