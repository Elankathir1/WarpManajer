
import { GoogleGenAI, Type } from "@google/genai";
import { CodeFile, UpdateResponse } from "../types";

// Always initialize with named parameter and use process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const updateCodeFiles = async (
  files: CodeFile[],
  instructions: string
): Promise<UpdateResponse> => {
  // Using gemini-3-pro-preview for complex coding tasks
  const model = 'gemini-3-pro-preview';
  
  const filesContext = files
    .map(f => `FILE: ${f.name}\nCONTENT:\n${f.content}`)
    .join('\n\n---\n\n');

  const prompt = `
    You are a world-class senior frontend engineer. 
    Below is the current source code of a web application and specific instructions for updates.
    
    CURRENT CODE:
    ${filesContext}
    
    UPDATE INSTRUCTIONS:
    ${instructions}
    
    YOUR TASK:
    1. Analyze the current code.
    2. Apply the requested updates or refactors.
    3. Ensure the code is functional, clean, and follows modern React and Tailwind best practices.
    4. Provide the updated content for the modified files.
  `;

  // Always use ai.models.generateContent with both model name and prompt
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          updatedFiles: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                filename: { type: Type.STRING },
                content: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ["filename", "content", "explanation"]
            }
          },
          summary: { type: Type.STRING }
        },
        required: ["updatedFiles", "summary"]
      },
      // Using thinking budget for better reasoning in code generation
      thinkingConfig: { thinkingBudget: 16000 }
    },
  });

  try {
    // Access response.text property directly
    const data = JSON.parse(response.text || '{}');
    return data as UpdateResponse;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("The AI returned an invalid response format.");
  }
};
