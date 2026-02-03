
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { DiagnosisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeCropImage = async (base64Image: string): Promise<DiagnosisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: "ACT AS AGRI-NEXUS AGENT. Analyze this crop disease. Simulate MCP (Model Context Protocol) tool calls to 'Satellite_Weather' and 'Soil_Database'. Provide a sustainability score. Output JSON." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            disease: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            description: { type: Type.STRING },
            symptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
            treatment: { type: Type.ARRAY, items: { type: Type.STRING } },
            prevention: { type: Type.ARRAY, items: { type: Type.STRING } },
            climateImpact: { type: Type.STRING },
            sustainabilityScore: { type: Type.NUMBER }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Diagnosis failed:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text.substring(0, 300) }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const getSmartChatResponse = async (message: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: message,
    config: {
      systemInstruction: "You are the Agri-Nexus AI Agent. Your goal is to help farmers maximize yield while maintaining organic sustainability. You use Vibe Coding principles to be efficient and empathetic. Always include a short 'Agent Thought' property if you were an internal process."
    }
  });
  return response.text;
};

export const getMarketIntelligence = async (cropData: any) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze market trends. Act as a financial agricultural agent. Data: ${JSON.stringify(cropData)}`,
  });
  return response.text;
};

export const generateFarmerCV = async (settings: any): Promise<any> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a professional agricultural resume/identity for a farmer at ${settings.location}. Output JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          nexusScore: { type: Type.NUMBER },
          impactMetrics: {
            type: Type.OBJECT,
            properties: {
              waterSaved: { type: Type.STRING },
              chemicalReduction: { type: Type.STRING },
              yieldBoost: { type: Type.STRING }
            }
          },
          cvDomain: { type: Type.STRING }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};
