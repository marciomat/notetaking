"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { calculateTotal, formatNumber } from "@/lib/calculator";
import { cn } from "@/lib/utils";

interface CalculatorEditorProps {
  lines: string[];
  onUpdate: (lines: string[]) => void;
}

export function CalculatorEditor({ lines, onUpdate }: CalculatorEditorProps) {
  const [localLines, setLocalLines] = useState<string[]>(lines.length > 0 ? lines : [""]);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const isLocalUpdateRef = useRef(false);

  // Sync external changes (from CRDT sync)
  useEffect(() => {
    // Don't sync back our own changes
    if (isLocalUpdateRef.current) {
      isLocalUpdateRef.current = false;
      return;
    }
    
    const incoming = lines.length > 0 ? lines : [""];
    if (JSON.stringify(incoming) !== JSON.stringify(localLines)) {
      setLocalLines(incoming);
    }
  }, [lines]);

  const { results, total } = calculateTotal(localLines);

  const handleLineChange = useCallback(
    (index: number, value: string) => {
      const newLines = [...localLines];
      newLines[index] = value;
      setLocalLines(newLines);
      isLocalUpdateRef.current = true;
      onUpdate(newLines);
    },
    [localLines, onUpdate]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const newLines = [...localLines];
        newLines.splice(index + 1, 0, "");
        setLocalLines(newLines);
        isLocalUpdateRef.current = true;
        onUpdate(newLines);
        // Focus new line
        setTimeout(() => {
          textareaRefs.current[index + 1]?.focus();
        }, 0);
      }

      if (e.key === "Backspace" && localLines[index] === "" && index > 0) {
        e.preventDefault();
        const newLines = localLines.filter((_, i) => i !== index);
        setLocalLines(newLines);
        isLocalUpdateRef.current = true;
        onUpdate(newLines);
        // Focus previous line
        setTimeout(() => {
          textareaRefs.current[index - 1]?.focus();
        }, 0);
      }

      // Navigate with arrow keys
      if (e.key === "ArrowUp" && index > 0) {
        e.preventDefault();
        textareaRefs.current[index - 1]?.focus();
      }

      if (e.key === "ArrowDown" && index < localLines.length - 1) {
        e.preventDefault();
        textareaRefs.current[index + 1]?.focus();
      }
    },
    [localLines, onUpdate]
  );

  return (
    <div className="p-4 min-h-[200px]">
      <div className="space-y-1">
        {results.map((result, index) => (
          <div key={index} className="flex items-center gap-4">
            {/* Input */}
            <textarea
              ref={(el) => {
                textareaRefs.current[index] = el;
              }}
              value={localLines[index]}
              onChange={(e) => handleLineChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              placeholder={index === 0 ? "food: 25" : ""}
              rows={1}
              className={cn(
                "flex-1 bg-transparent resize-none outline-none",
                "text-sm font-mono leading-relaxed",
                "placeholder:text-muted-foreground/50"
              )}
            />

            {/* Result */}
            <div
              className={cn(
                "w-24 text-right text-sm font-mono tabular-nums",
                result.value !== null
                  ? "text-foreground"
                  : "text-transparent",
                result.error && "text-destructive"
              )}
            >
              {result.value !== null ? formatNumber(result.value) : "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Total</span>
        <span className="text-lg font-mono font-semibold tabular-nums">
          {formatNumber(total)}
        </span>
      </div>
    </div>
  );
}
