"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PLATFORM_THEME_ID,
  dispatchPlatformThemeChange,
  getPlatformTheme,
  PLATFORM_THEMES,
  readPlatformThemeId,
  writePlatformThemeId,
  type PlatformThemeId,
} from "@/lib/sidebar-chrome";
import { cn } from "@/lib/utils";

export default function AppearanceSettingsWorkspace() {
  const [themeId, setThemeId] = useState<PlatformThemeId>(DEFAULT_PLATFORM_THEME_ID);

  useEffect(() => {
    setThemeId(readPlatformThemeId());
  }, []);

  function selectTheme(id: PlatformThemeId) {
    setThemeId(id);
    writePlatformThemeId(id);
    dispatchPlatformThemeChange(id);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-sm leading-relaxed text-white/55">
          Choose one of five professionally designed themes for Unit311 Central.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/45">
          Themes update the appearance of the entire platform — including backgrounds, panels,
          cards, buttons, accents, borders and navigation — while maintaining the same layout,
          functionality and navigation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLATFORM_THEMES.map((theme) => {
          const active = theme.id === themeId;
          const tokens = getPlatformTheme(theme.id);
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => selectTheme(theme.id)}
              className={cn(
                "rounded-[14px] border p-[18px] text-left transition-colors duration-150",
                active ? "ring-1 ring-offset-0" : "hover:border-white/20",
              )}
              style={
                active
                  ? {
                      borderColor: tokens.button,
                      background: `color-mix(in srgb, ${tokens.accent} 18%, transparent)`,
                      boxShadow: `0 0 0 1px ${tokens.button}`,
                    }
                  : {
                      borderColor: "var(--platform-card-border, #243347)",
                      background: "var(--platform-card, #121C2D)",
                    }
              }
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold tracking-[0.08em] text-white uppercase">
                  {theme.label}
                </p>
                {active ? (
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: tokens.accent }}
                  >
                    Active
                  </span>
                ) : null}
              </div>

              {/* Mini application chrome preview */}
              <div
                className="mt-4 overflow-hidden rounded-[10px] border"
                style={{
                  borderColor: tokens.cardBorder,
                  background: tokens.background,
                }}
              >
                <div className="flex h-[88px]">
                  <div
                    className="flex w-[34%] flex-col gap-1.5 border-r p-2"
                    style={{
                      background: tokens.sidebar,
                      borderColor: tokens.border,
                    }}
                  >
                    <span
                      className="h-2 w-[70%] rounded-sm"
                      style={{ background: tokens.accent }}
                    />
                    <span
                      className="h-5 w-full rounded-md border"
                      style={{
                        background: tokens.card,
                        borderColor: tokens.cardBorder,
                      }}
                    />
                    <span
                      className="h-5 w-full rounded-md border"
                      style={{
                        background: tokens.card,
                        borderColor: tokens.cardBorder,
                      }}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-2" style={{ background: tokens.surface }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="h-2 w-16 rounded-sm bg-white/25" />
                      <span
                        className="h-4 w-10 rounded-md"
                        style={{ background: tokens.button }}
                      />
                    </div>
                    <div className="flex flex-1 gap-1.5">
                      <span
                        className="flex-1 rounded-md border"
                        style={{
                          background: tokens.card,
                          borderColor: tokens.cardBorder,
                        }}
                      />
                      <span
                        className="flex-1 rounded-md border"
                        style={{
                          background: tokens.card,
                          borderColor: tokens.cardBorder,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-white/40">
                App · Panels · Accent · Cards
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
