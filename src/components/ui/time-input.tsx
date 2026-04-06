"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { parseTimeInput } from "@/lib/utils";

interface TimeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
}

const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ className, value, onValueChange, onBlur, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, arrows, home, end
      const allowed = [
        "Backspace", "Delete", "Tab", "Escape", "Enter",
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        "Home", "End",
      ];
      if (allowed.includes(e.key)) return;

      // Allow Ctrl/Cmd+A, C, V, X
      if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) return;

      // Allow digits and colon
      if (/^[0-9:]$/.test(e.key)) return;

      // Block everything else
      e.preventDefault();
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData("text");
      // Only allow if pasted text contains only digits and colons
      if (!/^[0-9:]+$/.test(pasted)) {
        e.preventDefault();
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Filter to only digits and colon
      const filtered = e.target.value.replace(/[^0-9:]/g, "");
      onValueChange(filtered);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const val = e.target.value.trim();
      if (val) {
        const parsed = parseTimeInput(val);
        if (parsed) {
          onValueChange(parsed);
        }
        // If invalid, leave as-is so user sees their input and can correct
      }
      onBlur?.(e);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={cn(
          "flex h-7 rounded-md border border-input bg-background px-1.5 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        value={value}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onChange={handleChange}
        onBlur={handleBlur}
        maxLength={5}
        {...props}
      />
    );
  },
);
TimeInput.displayName = "TimeInput";

export { TimeInput };
