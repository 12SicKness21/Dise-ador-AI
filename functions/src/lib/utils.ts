/**
 * Convierte un nombre de prompt en un slug seguro para Storage.
 * "MODELO DE PIE" → "modelo_de_pie"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
