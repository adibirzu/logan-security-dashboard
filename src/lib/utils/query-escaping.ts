export function escapeQueryValue(value: string): string {
  return value.replace(/'/g, "''")
}

export function createStringLiteral(value: string): string {
  return `'${escapeQueryValue(value)}'`
}

export function createContainsCall(field: string, value: string): string {
  return `contains(${field}, ${createStringLiteral(value)})`
}
