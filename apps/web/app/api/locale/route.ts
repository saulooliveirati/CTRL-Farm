import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SUPPORTED_LOCALES = ["pt-BR", "en", "es", "fr", "de"];

function getCandidatePaths(): string[] {
  const paths: string[] = [];
  const cwd = process.cwd();

  // 1. Diretório do projeto
  paths.push(path.join(cwd, "ctrlfarm.config.json"));
  paths.push(path.join(cwd, "..", "..", "ctrlfarm.config.json"));

  // 2. LocalAppData no Windows
  if (process.env.LOCALAPPDATA) {
    paths.push(path.join(process.env.LOCALAPPDATA, "CTRL-Farm", "ctrlfarm.config.json"));
  }

  // 3. UserProfile
  if (process.env.USERPROFILE) {
    paths.push(
      path.join(process.env.USERPROFILE, "AppData", "Local", "CTRL-Farm", "ctrlfarm.config.json")
    );
  }

  return paths;
}

export async function GET() {
  try {
    const candidatePaths = getCandidatePaths();
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, "utf-8");
        const json = JSON.parse(raw);
        if (json.locale && SUPPORTED_LOCALES.includes(json.locale)) {
          return NextResponse.json({ locale: json.locale });
        }
      }
    }
  } catch (err) {
    // Ignora erro e devolve padrão
  }

  return NextResponse.json({ locale: "pt-BR" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { locale } = body;

    if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
    }

    const candidatePaths = getCandidatePaths();
    for (const p of candidatePaths) {
      try {
        let currentData: Record<string, any> = {};
        if (fs.existsSync(p)) {
          try {
            currentData = JSON.parse(fs.readFileSync(p, "utf-8"));
          } catch {}
        } else {
          const dir = path.dirname(p);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        }

        currentData.locale = locale;
        currentData.language = locale.split("-")[0];
        currentData.updatedAt = new Date().toISOString();

        fs.writeFileSync(p, JSON.stringify(currentData, null, 2), "utf-8");
      } catch {}
    }

    return NextResponse.json({ success: true, locale });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
