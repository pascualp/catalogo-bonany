import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { CATEGORIES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CategorizationResult {
  category: string;
  isLocal: boolean;
  isSeasonal: boolean;
  description: string;
}

export async function categorizeProduct(productName: string): Promise<CategorizationResult> {
  const model = "gemini-3-flash-preview";
  
  const categoriesList = CATEGORIES.map(c => `${c.id} (${c.name})`).join(", ");
  
  const prompt = `Actúa como un experto en logística y alimentación para una frutería gourmet en Mallorca. 
  Analiza el siguiente nombre de producto y clasifícalo con precisión extrema.
  
  Producto: "${productName}"
  
  Categorías disponibles (ID y Nombre): ${categoriesList}
  
  REGLAS DE CLASIFICACIÓN:
  1. CATEGORÍA: Elige el ID de la categoría más específica. Si es una fruta, usa 'frutas'. Si es un zumo, usa 'zumos-naturales'.
  2. LOCAL (isLocal): Marca true si el producto es originario de Mallorca o Baleares. Ejemplos: Sobrasada, Ensaimada, Patata de Sa Pobla, Tomate de Ramellet, Aceite de Mallorca, Quelitas.
  3. TEMPORADA (isSeasonal): Marca true si el producto es típico de la temporada actual (Primavera/Marzo en el Mediterráneo). Ejemplos: Alcachofas, Habas, Guisantes, Fresas, Nísperos, Espárragos.
  4. DESCRIPCIÓN: Genera una descripción gourmet, corta (máx 20 palabras) y que resalte la frescura o el origen.
  
  Responde estrictamente en formato JSON.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "ID de la categoría" },
            isLocal: { type: Type.BOOLEAN, description: "¿Es producto de Mallorca?" },
            isSeasonal: { type: Type.BOOLEAN, description: "¿Es de temporada?" },
            description: { type: Type.STRING, description: "Descripción atractiva" }
          },
          required: ["category", "isLocal", "isSeasonal", "description"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    // Validate category exists
    const validCategory = CATEGORIES.find(c => c.id === result.category);
    if (!validCategory) {
      result.category = "otros";
    }
    
    return result as CategorizationResult;
  } catch (error) {
    console.error("Error categorizing product with AI:", error);
    // Fallback logic if AI fails
    return {
      category: "otros",
      isLocal: productName.toLowerCase().includes("mallorca"),
      isSeasonal: false,
      description: `Producto: ${productName}`
    };
  }
}

export async function categorizeProductsBulk(productNames: string[]): Promise<CategorizationResult[]> {
  const model = "gemini-3-flash-preview";
  const categoriesList = CATEGORIES.map(c => `${c.id} (${c.name})`).join(", ");
  
  const prompt = `Actúa como un experto en logística de alimentación. Analiza esta lista de productos y clasifícalos con precisión.
  
  Productos a procesar: ${JSON.stringify(productNames)}
  
  Categorías disponibles: ${categoriesList}
  
  REGLAS:
  - Clasifica cada producto en la categoría correcta.
  - Identifica productos locales de Mallorca (isLocal).
  - Identifica productos de temporada actual (isSeasonal).
  - Crea descripciones sugerentes y gourmet.
  
  Responde con un array de objetos JSON manteniendo el orden exacto de la lista recibida.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              isLocal: { type: Type.BOOLEAN },
              isSeasonal: { type: Type.BOOLEAN },
              description: { type: Type.STRING }
            },
            required: ["category", "isLocal", "isSeasonal", "description"]
          }
        }
      }
    });

    const results = JSON.parse(response.text || "[]");
    return results.map((r: any) => ({
      ...r,
      category: CATEGORIES.find(c => c.id === r.category) ? r.category : "otros"
    }));
  } catch (error) {
    console.error("Error in bulk categorization:", error);
    return productNames.map(name => ({
      category: "otros",
      isLocal: name.toLowerCase().includes("mallorca"),
      isSeasonal: false,
      description: `Producto: ${name}`
    }));
  }
}
