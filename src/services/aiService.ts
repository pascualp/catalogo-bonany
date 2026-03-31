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

    // Clean potential markdown formatting from the response
    const rawText = response.text || "{}";
    const cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanText);
    
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
      category: guessCategoryLocally(productName),
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

    // Clean potential markdown formatting from the response
    const rawText = response.text || "[]";
    const cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const results = JSON.parse(cleanText);
    
    return productNames.map((name, index) => {
      const r = results[index] || {};
      return {
        category: CATEGORIES.find(c => c.id === r.category) ? r.category : guessCategoryLocally(name),
        isLocal: r.isLocal ?? name.toLowerCase().includes("mallorca"),
        isSeasonal: r.isSeasonal ?? false,
        description: r.description || `Producto: ${name}`
      };
    });
  } catch (error) {
    console.error("Error in bulk categorization:", error);
    return productNames.map(name => ({
      category: guessCategoryLocally(name),
      isLocal: name.toLowerCase().includes("mallorca"),
      isSeasonal: false,
      description: `Producto: ${name}`
    }));
  }
}

// Local fallback logic in case AI fails or is rate-limited
function guessCategoryLocally(name: string): string {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('zumo') || nameLower.includes('jugo') || nameLower.includes('licuado') || nameLower.includes('batido')) {
    if (nameLower.includes('batido') || nameLower.includes('smoothie')) return 'batidos';
    if (nameLower.includes('licuado')) return 'licuados';
    return 'zumos-naturales';
  }
  if (nameLower.includes('patata') || nameLower.includes('papa')) return 'patatas';
  if (nameLower.includes('cebolla') || nameLower.includes('ajo') || nameLower.includes('puerro')) return 'cebollas';
  if (nameLower.includes('germinado') || nameLower.includes('brote')) return 'germinados';
  if (nameLower.includes('lechuga') || nameLower.includes('espinaca') || nameLower.includes('acelga') || nameLower.includes('rucula')) return 'lechugas';
  if (nameLower.includes('hierba') || nameLower.includes('perejil') || nameLower.includes('cilantro') || nameLower.includes('albahaca') || nameLower.includes('menta')) return 'hierbas';
  if (nameLower.includes('manzana') || nameLower.includes('pera') || nameLower.includes('naranja') || nameLower.includes('limon') || nameLower.includes('platano') || nameLower.includes('fresa') || nameLower.includes('uva') || nameLower.includes('melon') || nameLower.includes('sandia') || nameLower.includes('melocoton') || nameLower.includes('cereza') || nameLower.includes('kiwi') || nameLower.includes('mango') || nameLower.includes('aguacate')) return 'frutas';
  if (nameLower.includes('tomate') || nameLower.includes('pimiento') || nameLower.includes('pepino') || nameLower.includes('calabacin') || nameLower.includes('berenjena') || nameLower.includes('calabaza') || nameLower.includes('brocoli') || nameLower.includes('coliflor') || nameLower.includes('alcachofa') || nameLower.includes('esparrago')) return 'hortalizas';
  if (nameLower.includes('seta') || nameLower.includes('champinon') || nameLower.includes('portobello') || nameLower.includes('shiitake') || nameLower.includes('trufa')) return 'setas';
  if (nameLower.includes('zanahoria') || nameLower.includes('rabano') || nameLower.includes('remolacha') || nameLower.includes('boniato') || nameLower.includes('jengibre')) return 'raices';
  return 'otros';
}
