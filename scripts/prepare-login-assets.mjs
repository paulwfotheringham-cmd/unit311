import sharp from "sharp";
import { renameSync, statSync, unlinkSync, existsSync } from "fs";

const logoSrc = "C:/Users/Usuario/Desktop/unit311central.png";
const { data, info } = await sharp(logoSrc).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const out = Buffer.alloc(data.length);
for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];
  const lum = (r + g + b) / 3;

  if (lum < 18) {
    out[i] = 0;
    out[i + 1] = 0;
    out[i + 2] = 0;
    out[i + 3] = 0;
    continue;
  }

  const isBlue = b > r + 30 && b > g + 20 && b > 80;
  if (!isBlue && lum < 90) {
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = a;
    continue;
  }
  if (!isBlue && lum < 170) {
    const t = Math.min(255, Math.round(lum * 1.6));
    out[i] = t;
    out[i + 1] = t;
    out[i + 2] = t;
    out[i + 3] = a;
    continue;
  }

  out[i] = r;
  out[i + 1] = g;
  out[i + 2] = b;
  out[i + 3] = a;
}

const tmpLogo = "public/images/unit311central-login.tmp.png";
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim({ threshold: 10 })
  .resize({ width: 1462, kernel: sharp.kernel.lanczos3 })
  .png({ compressionLevel: 9 })
  .toFile(tmpLogo);
renameSync(tmpLogo, "public/images/unit311central-login.png");

const logoMeta = await sharp("public/images/unit311central-login.png").metadata();
console.log(
  "logo",
  `${logoMeta.width}x${logoMeta.height}`,
  `${Math.round(statSync("public/images/unit311central-login.png").size / 1024)}KB`,
);

if (existsSync("public/images/login-workspace-bg.jpg")) {
  unlinkSync("public/images/login-workspace-bg.jpg");
}

await sharp("public/images/topography.png")
  .resize(3840, 2160, { fit: "cover", position: "centre", kernel: sharp.kernel.lanczos3 })
  .modulate({ brightness: 0.72, saturation: 0.65 })
  .jpeg({ quality: 90, mozjpeg: true, progressive: true })
  .toFile("public/images/login-workspace-bg.jpg");

const bg = await sharp("public/images/login-workspace-bg.jpg").metadata();
console.log(
  "bg",
  `${bg.width}x${bg.height}`,
  `${Math.round(statSync("public/images/login-workspace-bg.jpg").size / 1024)}KB`,
);
