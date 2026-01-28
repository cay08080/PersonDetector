import { GoogleGenAI, Type } from "@google/genai";
import { DetectionStatus, AnalysisResult } from "../types";

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes a base64 encoded image string to detect the presence of a person.
 */
export const analyzeImageForPerson = async (base64Image: string): Promise<AnalysisResult> => {
  try {
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `SISTEMA DE SEGURANÇA CRÍTICO.
            Analise a imagem para detectar INVASORES ou PRESENÇA HUMANA.
            
            Responda EXATAMENTE neste formato JSON:
            {
              "personDetected": boolean,
              "confidence": number,
              "description": "string"
            }
            
            Regras de Negócio:
            1. Se houver qualquer parte de um corpo humano (mesmo que parcial), "personDetected" deve ser TRUE.
            2. "description": Seja extremamente descritivo sobre a aparência da pessoa.
            3. Se a área estiver vazia, confirme que o perímetro está limpo.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personDetected: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER, description: "Certeza de 0 a 100" },
            description: { type: Type.STRING }
          },
          required: ["personDetected", "confidence", "description"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) throw new Error("Resposta vazia da IA");

    const result = JSON.parse(textOutput);
    const isReliable = result.personDetected && result.confidence > 45;

    return {
      status: isReliable ? DetectionStatus.PERSON_DETECTED : DetectionStatus.NO_PERSON,
      message: isReliable ? "ÁREA NÃO SEGURA - INVASÃO" : "ÁREA SEGURA - PERÍMETRO LIMPO",
      description: result.description,
      confidence: result.confidence,
      timestamp: Date.now()
    };

  } catch (error: any) {
    console.error("Erro na análise Gemini:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.toLowerCase().includes("429") || errorMessage.toLowerCase().includes("quota")) {
        throw new Error("QUOTA_EXCEEDED");
    }

    return {
      status: DetectionStatus.ERROR,
      message: "FALHA NO SENSOR",
      description: "Erro técnico na comunicação com a IA.",
      timestamp: Date.now()
    };
  }
};