interface LineResult {
  input: string;
  label: string | null;
  value: number | null;
  error: string | null;
}

/**
 * Parse a single line of calculator input
 * Supports:
 * - Bare numbers: "25" -> 25
 * - Labeled values: "food: 25" -> label="food", value=25
 * - Expressions: "25 + 10" -> value=35
 * - Labeled expressions: "total: 25 + 10" -> label="total", value=35
 * - Text only (no number): "Shopping list" -> ignored
 */
export function parseLine(line: string): LineResult {
  const trimmed = line.trim();

  if (!trimmed) {
    return { input: line, label: null, value: null, error: null };
  }

  // Check for label: value pattern
  const labelMatch = trimmed.match(/^([^:]+):\s*(.*)$/);

  let label: string | null = null;
  let expression: string;

  if (labelMatch) {
    label = labelMatch[1].trim();
    expression = labelMatch[2].trim();
  } else {
    expression = trimmed;
  }

  // If no expression after label, or expression has no numbers, return null value
  if (!expression || !/\d/.test(expression)) {
    return { input: line, label, value: null, error: null };
  }

  // Evaluate the expression (supports +, -, *, /, parentheses)
  try {
    // Sanitize: only allow numbers, operators, spaces, parentheses, decimal points
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return { input: line, label, value: null, error: null };
    }

    // Use Function for safe evaluation (no access to scope)
    const result = Function(`"use strict"; return (${expression})`)();

    if (typeof result !== "number" || !isFinite(result)) {
      return { input: line, label, value: null, error: "Invalid result" };
    }

    return { input: line, label, value: result, error: null };
  } catch {
    return { input: line, label, value: null, error: "Invalid expression" };
  }
}

/**
 * Calculate total from all lines
 */
export function calculateTotal(lines: string[]): {
  results: LineResult[];
  total: number;
} {
  const results = lines.map(parseLine);
  const total = results.reduce((sum, r) => sum + (r.value ?? 0), 0);
  return { results, total };
}

/**
 * Format number for display
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}
