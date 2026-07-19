"use client";

import { startTransition, useEffect, useState } from "react";
import { fromUrl } from "geotiff";

import type { ElevationRange } from "@/lib/elevation-colormap";

const NODATA_THRESHOLD = -1000;
const SAMPLE_SIZE = 512;

function isValidElevation(value: number) {
  return Number.isFinite(value) && value > NODATA_THRESHOLD;
}

export function useDsmElevationRange(geotiffUrl: string | null) {
  const [range, setRange] = useState<ElevationRange | null>(null);
  const [loading, setLoading] = useState(Boolean(geotiffUrl));

  useEffect(() => {
    if (!geotiffUrl) {
      startTransition(() => {
        setRange(null);
        setLoading(false);
      });
      return;
    }

    const url = geotiffUrl;
    let cancelled = false;

    async function loadRange() {
      try {
        const tiff = await fromUrl(url, { allowFullFile: false });
        const image = await tiff.getImage();
        const width = image.getWidth();
        const height = image.getHeight();
        const sampleWidth = Math.min(width, SAMPLE_SIZE);
        const sampleHeight = Math.min(height, SAMPLE_SIZE);
        const rasters = await image.readRasters({
          samples: [0],
          width: sampleWidth,
          height: sampleHeight,
          resampleMethod: "bilinear",
        });

        const values = rasters[0] as ArrayLike<number>;
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;

        for (let index = 0; index < values.length; index += 1) {
          const value = values[index];
          if (!isValidElevation(value)) continue;
          min = Math.min(min, value);
          max = Math.max(max, value);
        }

        if (!cancelled && Number.isFinite(min) && Number.isFinite(max)) {
          setRange({ min, max });
        }
      } catch {
        if (!cancelled) {
          setRange(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    startTransition(() => {
      setLoading(true);
      void loadRange();
    });

    return () => {
      cancelled = true;
    };
  }, [geotiffUrl]);

  return { range, loading };
}
