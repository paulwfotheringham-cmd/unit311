"use client";

import { useEffect, type ReactNode } from "react";
import {
  applyPlatformTheme,
  PLATFORM_THEME_EVENT,
  readPlatformThemeId,
  SIDEBAR_THEME_EVENT,
} from "@/lib/sidebar-chrome";

/**
 * Applies the selected platform theme to CSS variables on documentElement
 * so the entire application chrome adopts the theme immediately.
 */
export default function PlatformThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyPlatformTheme(readPlatformThemeId());

    const onTheme = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      applyPlatformTheme(detail);
    };

    window.addEventListener(PLATFORM_THEME_EVENT, onTheme);
    window.addEventListener(SIDEBAR_THEME_EVENT, onTheme);
    return () => {
      window.removeEventListener(PLATFORM_THEME_EVENT, onTheme);
      window.removeEventListener(SIDEBAR_THEME_EVENT, onTheme);
    };
  }, []);

  return children;
}
