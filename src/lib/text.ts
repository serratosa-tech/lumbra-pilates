/**
 * Separador « · » con espacio duro delante: el punto se queda al final de la línea
 * anterior y ninguna línea empieza por «·».
 */
export const SEP = ' · '

/** Mayúscula inicial, para el principio de una frase o un encabezado. */
export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
