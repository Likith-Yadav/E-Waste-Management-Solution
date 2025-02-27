import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
console.log('Loaded API Key:', GEMINI_API_KEY); // Confirm key is loaded

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function getRecyclingAdvice(prompt: string, detectedItems: string[] = []) {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const fullPrompt = `You are a helpful recycling assistant. Analyze the following items detected in an image and provide practical advice.
      ${detectedItems.length > 0 ? `\nDetected Items: ${detectedItems.join(', ')}` : 'No items detected.'}
      \nUser Question: ${prompt}
      \nProvide clear, actionable recycling or disposal advice for the detected items in plain text. Do not use Markdown (e.g., **, *, #), special characters, or formatting—return only plain text.`;

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

    const response = await result.response;
    console.log('Gemini response:', response.text());
    return response.text();
  } catch (error: any) {
    console.error('Error getting recycling advice:', error);
    if (error.message?.includes('API_KEY_INVALID')) {
      return 'Invalid API key. Please check your configuration in Google Cloud Console.';
    }
    if (error.message?.includes('API not enabled')) {
      return 'Please enable the Generative Language API in your Google Cloud Console and ensure billing is set up.';
    }
    return 'Unable to connect to AI service. Please try again later.';
  }
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