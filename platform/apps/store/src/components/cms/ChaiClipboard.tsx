"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type ChaiBlock = {
  _id: string;
  _type: string;
  _parent?: string | null;
  styles?: string;
  content?: string;
  [k: string]: unknown;
};

type ClipboardCtx = {
  copiedBlocks: ChaiBlock[];
  copy: (blocks: ChaiBlock[]) => void;
  paste: () => ChaiBlock[] | null;
  hasCopied: boolean;
};

const ChaiClipboardContext = createContext<ClipboardCtx>({
  copiedBlocks: [],
  copy: () => {},
  paste: () => null,
  hasCopied: false,
});

export function useChaiClipboard() {
  return useContext(ChaiClipboardContext);
}

export function ChaiClipboardProvider({ children }: { children: ReactNode }) {
  const [copiedBlocks, setCopiedBlocks] = useState<ChaiBlock[]>([]);
  const copy = useCallback((blocks: ChaiBlock[]) => {
    setCopiedBlocks(JSON.parse(JSON.stringify(blocks)));
  }, []);
  const paste = useCallback(() => {
    if (copiedBlocks.length === 0) return null;
    return JSON.parse(JSON.stringify(copiedBlocks));
  }, [copiedBlocks]);
  return (
    <ChaiClipboardContext.Provider value={{ copiedBlocks, copy, paste, hasCopied: copiedBlocks.length > 0 }}>
      {children}
    </ChaiClipboardContext.Provider>
  );
}
