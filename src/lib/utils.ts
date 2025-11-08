import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Cleans markdown formatting from text to ensure plain text output
 * @param text - Text that may contain markdown formatting
 * @returns Clean plain text without markdown symbols
 */
export function cleanMarkdownFormatting(text: string): string {
  if (!text) return text;
  
  return text
    // Remove bold formatting (**text** or __text__)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    
    // Remove italic formatting (*text* or _text_)
    .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '$1')
    .replace(/(?<!_)_(?!_)([^_]+)_(?!_)/g, '$1')
    
    // Remove headers (# ## ### etc.)
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    
    // Remove list formatting (- * +)
    .replace(/^\s*[-*+]\s+/gm, '')
    
    // Remove numbered lists (1. 2. etc.)
    .replace(/^\s*\d+\.\s+/gm, '')
    
    // Remove links [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    
    // Remove code formatting (`text` or ```text```)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    
    // Remove extra whitespace and normalize line breaks
    .replace(/\n\s*\n/g, '\n')
    .trim();
}
