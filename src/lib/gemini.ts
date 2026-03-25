import { GoogleGenAI } from "@google/genai";
import { Product } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getSmartResponse = async (prompt: string, products: Product[]) => {
  const model = "gemini-3.1-pro-preview";
  
  const catalogContext = products.map(p => `- ${p.name} (${p.category}): ${p.description || 'Sin descripción'}`).join('\n');

  const systemInstruction = `Eres el Asistente Inteligente de "Fruites Bonany", una frutería y verdulería de alta calidad en Mallorca.
Tu objetivo es ayudar a los clientes a:
1. Sugerir recetas creativas usando los productos disponibles en nuestro catálogo.
2. Responder preguntas sobre productos de temporada en Mallorca.
3. Informar sobre beneficios para la salud de nuestras frutas, verduras y zumos.
4. Ayudar a planificar compras saludables.

Contexto del catálogo actual:
${catalogContext}

Responde de forma amable, profesional y cercana. Usa emojis relacionados con frutas y verduras. Si el usuario pregunta por algo que no está en el catálogo, menciónalo amablemente pero intenta sugerir una alternativa que sí tengamos.
`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    return response.text || "Lo siento, no he podido procesar tu solicitud en este momento. 🍎";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Ups, parece que mi cerebro vegetal se ha quedado en blanco. ¿Podrías intentarlo de nuevo? 🥦";
  }
};
