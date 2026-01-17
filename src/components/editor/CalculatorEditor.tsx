"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

interface CalculatorEditorProps {
  content: string;
  onChange: (content: string) => void;
  onBlur: () => void;
  autoFocus?: boolean;
}

// Simple and safe math expression evaluator
function evaluateExpression(expr: string): number | null {
  // Remove whitespace
  const cleaned = expr.replace(/\s/g, "");
  if (!cleaned) return null;

  // Only allow numbers, operators, parentheses, and decimal points
  if (!/^[\d+\-*/().,%]+$/.test(cleaned)) return null;

  try {
    // Handle percentages: convert X% to (X/100)
    const withPercentages = cleaned.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");

    // Use Function constructor to evaluate (safer than eval for math only)
    // This is safe because we've validated the input contains only math characters
    const result = Function(`"use strict"; return (${withPercentages})`)();

    if (typeof result === "number" && isFinite(result)) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

// Extract numeric result from a line (handles various formats)
function extractLineValue(line: string): number | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Check if line contains an expression pattern
  // Look for patterns like: "label: 123", "item = 45", "thing 67.89", or just "123 + 456"

  // Try to find a mathematical expression (with operators between numbers)
  const exprMatch = trimmed.match(/-?[\d.]+\s*[+\-*/]\s*[-\d.+\-*/().\s%]+/);
  if (exprMatch) {
    return evaluateExpression(exprMatch[0]);
  }

  // Try to find the last number in the line (could be preceded by text)
  // Match patterns like "Coffee: 5.50" or "5.50" or "Item 123" or "rent: -200"
  // The negative sign must be preceded by a non-digit or start of relevant section
  const numberMatches = trimmed.match(/(?:^|[^.\d])(-?\d+(?:,\d{3})*(?:\.\d+)?)/g);
  if (numberMatches && numberMatches.length > 0) {
    // Get the last match and extract the number from it
    const lastMatch = numberMatches[numberMatches.length - 1];
    // Extract just the number (including negative sign)
    const numMatch = lastMatch.match(/-?\d+(?:,\d{3})*(?:\.\d+)?/);
    if (numMatch) {
      // Remove commas and parse
      return parseFloat(numMatch[0].replace(/,/g, ""));
    }
  }

  return null;
}

// Format number for display
function formatNumber(num: number): string {
  // Use locale formatting with up to 2 decimal places
  if (Number.isInteger(num)) {
    return num.toLocaleString();
  }
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

export function CalculatorEditor({
  content,
  onChange,
  onBlur,
  autoFocus,
}: CalculatorEditorProps) {
  const [localContent, setLocalContent] = useState(content);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with external content changes
  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  // Handle iOS keyboard visibility using visualViewport API
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleResize = () => {
      // Calculate keyboard height as difference between window height and viewport height
      const keyboardH = window.innerHeight - viewport.height;
      // Only set if keyboard is actually showing (height > 100px to avoid false positives)
      setKeyboardHeight(keyboardH > 100 ? keyboardH : 0);
    };

    viewport.addEventListener("resize", handleResize);
    viewport.addEventListener("scroll", handleResize);

    return () => {
      viewport.removeEventListener("resize", handleResize);
      viewport.removeEventListener("scroll", handleResize);
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setLocalContent(newContent);
      onChange(newContent);
    },
    [onChange]
  );

  // Parse lines and calculate values
  const { lines, lineResults, total } = useMemo(() => {
    const lines = localContent.split("\n");
    const lineResults: (number | null)[] = [];
    let total = 0;

    for (const line of lines) {
      const value = extractLineValue(line);
      lineResults.push(value);
      if (value !== null) {
        total += value;
      }
    }

    return { lines, lineResults, total };
  }, [localContent]);

  // Check if any line has a value
  const hasValues = lineResults.some((r) => r !== null);

  return (
    <div ref={containerRef} className="relative flex h-full flex-col pb-11">
      {/* Main editor area with results */}
      <div className="relative flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Text input area */}
          <div className="flex-1 overflow-auto">
            <textarea
              value={localContent}
              onChange={handleChange}
              onBlur={onBlur}
              autoFocus={autoFocus}
              className={cn(
                "h-full min-h-full w-full resize-none border-none bg-transparent p-4 font-mono text-sm shadow-none focus-visible:outline-none focus-visible:ring-0",
                "leading-7" // Match line height with results
              )}
              placeholder="Enter items one per line. Example: Lunch: 25, Coffee: 5, Bus: 3"
              style={{ lineHeight: "1.75rem" }}
            />
          </div>

          {/* Results column */}
          <div
            className={cn(
              "w-32 shrink-0 overflow-auto border-l border-border bg-muted/30 p-4 font-mono text-sm",
              "leading-7" // Match line height with textarea
            )}
            style={{ lineHeight: "1.75rem" }}
          >
            {lines.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-7 text-right",
                  lineResults[index] !== null
                    ? "text-foreground"
                    : "text-transparent"
                )}
              >
                {lineResults[index] !== null
                  ? formatNumber(lineResults[index]!)
                  : "\u00A0"}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Total bar - positions above keyboard on mobile */}
      {hasValues && (
        <div
          className={cn(
            "flex shrink-0 items-center justify-between border-t border-border bg-muted/50 px-4 py-3",
            keyboardHeight > 0 && "fixed left-0 right-0 z-50"
          )}
          style={keyboardHeight > 0 ? { bottom: `${keyboardHeight + 44}px` } : undefined}
        >
          <span className="text-sm font-medium text-muted-foreground">
            Total
          </span>
          <span className="font-mono text-lg font-semibold">
            {formatNumber(total)}
          </span>
        </div>
      )}
    </div>
  );
}
