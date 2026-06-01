import { GoogleGenAI } from "@google/genai";

/**
 * Genera una imagen usando Gemini 2.0 Flash (image generation) con la foto
 * de la zapatilla como referencia y el prompt como instrucción de estudio.
 *
 * Retorna el buffer PNG de la imagen generada.
 */
export async function generateImage(
  apiKey: string,
  imageBuffer: Buffer,
  promptText: string
): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: imageBuffer.toString("base64"),
            },
          },
          { text: promptText },
        ],
      },
    ],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      temperature: 0.2,  // menor variabilidad → mayor consistencia de producto
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }

  throw new Error("Gemini no devolvió una imagen en la respuesta.");
}
