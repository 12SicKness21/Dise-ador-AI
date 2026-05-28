import OpenAI, { toFile } from "openai";

/**
 * Genera una imagen usando GPT Image 1 (gpt-image-1) con la foto de la zapatilla
 * como referencia y el prompt como instrucción.
 *
 * Retorna el buffer PNG de la imagen generada.
 */
export async function generateImage(
  apiKey: string,
  imageBuffer: Buffer,
  promptText: string
): Promise<Buffer> {
  const client = new OpenAI({ apiKey });

  const imageFile = await toFile(imageBuffer, "original.jpg", {
    type: "image/jpeg",
  });

  const response = await client.images.edit({
    model: "gpt-image-1",
    image: imageFile,
    prompt: promptText,
    n: 1,
    size: "1024x1024",
  });

  const item = response.data?.[0];

  // gpt-image-1 devuelve b64_json por defecto
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }

  // Fallback: si por algún motivo devuelve URL, descargar
  if (item?.url) {
    const res = await fetch(item.url);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }

  throw new Error("OpenAI no devolvió imagen en la respuesta");
}
