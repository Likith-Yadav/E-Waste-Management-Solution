import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function getRecyclingAdvice(prompt: string, detectedItems: string[] = []) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const systemPrompt = `
You are analyzing these items: ${detectedItems.join(', ')}

IMPORTANT: Write your response in plain text only. Do not use any special characters, asterisks, bullet points, dashes, or markdown formatting.

Write your response in these sections using plain text and numbers only:

ITEM ANALYSIS
List the detected items and their materials on separate lines.

HANDLING INSTRUCTIONS
Write numbered steps for handling each item.

DISPOSAL METHODS
Write the disposal methods for each item on separate lines.

ENVIRONMENTAL IMPACT
Write a brief paragraph about environmental impact.

LOCAL RESOURCES
Write relevant facilities and programs on separate lines.

Question: ${prompt}

Remember: Use only plain text. No special formatting characters like asterisks, dashes, or bullet points. Use numbers for steps and line breaks for separation.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: systemPrompt }]}],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 1000,
      }
    });
    
    const response = await result.response;
    return response.text().replace(/[\*\-\•]/g, ''); // Remove any remaining special characters
  } catch (error) {
    console.error('Error getting recycling advice:', error);
    return 'Sorry, I could not generate recycling advice at this time.';
  }
}

export async function analyzeWasteHabits(items: Array<{ type: string; timestamp: number }>) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Analyze waste patterns
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

Focus on practical, achievable suggestions for reducing waste and improving recycling habits.`;

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
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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