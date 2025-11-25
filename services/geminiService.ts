import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult, RepairPriority } from "../types";

const modelId = "gemini-2.5-flash";

// Helper to safely get the API Key without triggering secret scanning
const getAPIKey = () => {
  // Accessing import.meta.env.VITE_API_KEY directly allows Vite to only bundle this specific value
  // and exclude other secrets (like VITE_DATABASE_URL) from the client bundle.
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.VITE_API_KEY || '';
  }
  return '';
};

const getAI = () => {
  const apiKey = getAPIKey();
  if (!apiKey) {
    console.warn("Missing VITE_API_KEY. AI features will not work.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeDamageImage = async (
  imageBase64: string,
  userDescription: string,
  unitContext: string
): Promise<AIAnalysisResult> => {
  try {
    const ai = getAI();
    const prompt = `
      You are an expert heavy-duty vehicle mechanic AI. 
      Analyze the provided image of a ${unitContext} and the user's description: "${userDescription}".
      
      1. Identify visible damage.
      2. Assess the severity and assign a priority (LOW, MEDIUM, HIGH, CRITICAL).
      3. Suggest specific repair actions or parts needed.
      
      If the image is unclear or not relevant, rely on the description but note the ambiguity.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", // Assuming JPEG for simplicity
              data: imageBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            damageSummary: { type: Type.STRING },
            estimatedPriority: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
            suggestedActions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          },
          required: ["damageSummary", "estimatedPriority", "suggestedActions"]
        }
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    // Validate and fallback mapping
    const priorityMap: Record<string, RepairPriority> = {
      'LOW': RepairPriority.LOW,
      'MEDIUM': RepairPriority.MEDIUM,
      'HIGH': RepairPriority.HIGH,
      'CRITICAL': RepairPriority.CRITICAL
    };

    return {
      damageSummary: result.damageSummary || "Analysis complete.",
      estimatedPriority: priorityMap[result.estimatedPriority] || RepairPriority.MEDIUM,
      suggestedActions: result.suggestedActions || ["Inspect physically"]
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze damage report.");
  }
};

export const summarizeReports = async (reports: string[]): Promise<string> => {
  if (reports.length === 0) return "No reports to summarize.";

  try {
    const ai = getAI();
    const prompt = `Summarize the following damage reports into a concise maintenance plan:\n${reports.join('\n')}`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Summary Error:", error);
    return "Error generating summary.";
  }
};