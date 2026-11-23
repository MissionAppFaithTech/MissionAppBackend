/**
 * Mascara o documento do titular para exibição pública. CPF identifica uma
 * pessoa física: só os seis dígitos do meio aparecem, no padrão usado pelo
 * governo (`***.456.789-**`). CNPJ é dado público de cadastro e quem doa por
 * transferência pode precisar dele, então sai completo e formatado.
 *
 * @param document CPF (11 dígitos) ou CNPJ (14 dígitos), só com dígitos.
 * @returns O documento mascarado (CPF) ou formatado (CNPJ); outro formato é
 * totalmente mascarado.
 * @example
 * documentMask('12345678909') // '***.456.789-**'
 * documentMask('12345678000195') // '12.345.678/0001-95'
 */
export function documentMask(document: string): string {
  if (/^\d{11}$/.test(document)) {
    return `***.${document.slice(3, 6)}.${document.slice(6, 9)}-**`
  }

  if (/^\d{14}$/.test(document)) {
    return document.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  return '*'.repeat(document.length)
}
