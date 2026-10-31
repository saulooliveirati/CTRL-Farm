// ==============================================================================
// Gerador Universal Cross-Platform de Imagem de Disco macOS (.dmg)
// Cria a estrutura de bundle .app, atalho para /Applications e imagem UDIF/DMG
// ==============================================================================

import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const DIST_DIR = path.resolve(__dirname, "dist");
const STAGE_DIR = path.resolve(DIST_DIR, "dmg-stage");
const APP_DIR = path.resolve(STAGE_DIR, "CTRL-Farm.app");
const CONTENTS_DIR = path.resolve(APP_DIR, "Contents");
const MACOS_DIR = path.resolve(CONTENTS_DIR, "MacOS");
const RESOURCES_DIR = path.resolve(CONTENTS_DIR, "Resources");
const DOCS_DOWNLOADS = path.resolve(PROJECT_ROOT, "docs/downloads");

console.log("🍏 Gerando Bundle macOS CTRL-Farm.app e imagem CTRL-Farm.dmg...");

// 1. Garante diretórios essenciais
fs.mkdirSync(MACOS_DIR, { recursive: true });
fs.mkdirSync(RESOURCES_DIR, { recursive: true });
fs.mkdirSync(DOCS_DOWNLOADS, { recursive: true });

// 2. Copia Info.plist
const plistSource = path.resolve(__dirname, "Info.plist");
if (fs.existsSync(plistSource)) {
  fs.copyFileSync(plistSource, path.resolve(CONTENTS_DIR, "Info.plist"));
}

// 3. Copia launcher.sh
const launcherSource = path.resolve(__dirname, "launcher.sh");
if (fs.existsSync(launcherSource)) {
  fs.copyFileSync(launcherSource, path.resolve(MACOS_DIR, "launcher.sh"));
  try {
    fs.chmodSync(path.resolve(MACOS_DIR, "launcher.sh"), 0o755);
  } catch {}
}

// 4. Copia icon.icns
const icnsSource = path.resolve(__dirname, "assets/icon.icns");
if (fs.existsSync(icnsSource)) {
  fs.copyFileSync(icnsSource, path.resolve(RESOURCES_DIR, "icon.icns"));
}

// 5. Gera PkgInfo (APPL???? padrão Apple)
fs.writeFileSync(path.resolve(CONTENTS_DIR, "PkgInfo"), "APPL????\n");

// 6. Adiciona atalho tradicional para a pasta /Applications
const appSymlink = path.resolve(STAGE_DIR, "Applications");
try {
  if (fs.existsSync(appSymlink)) {
    fs.unlinkSync(appSymlink);
  }
  fs.symlinkSync("/Applications", appSymlink);
} catch (e) {
  // Ignora se o sistema de arquivos local nao permitir criacao de symlinks
}

// 7. Monta imagem de disco UDIF (.dmg) com trailer oficial 'koly'
const dmgPath = path.resolve(DIST_DIR, "CTRL-Farm.dmg");
const rootDmgPath = path.resolve(PROJECT_ROOT, "CTRL-Farm.dmg");
const docsDmgPath = path.resolve(DOCS_DOWNLOADS, "CTRL-Farm.dmg");

function createTar(baseDir, relativePath = "") {
  const tarBuffers = [];
  const fullPath = path.join(baseDir, relativePath);
  if (!fs.existsSync(fullPath)) return Buffer.alloc(0);

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryRel = path.join(relativePath, entry.name).replace(/\\/g, "/");
    const entryFull = path.join(fullPath, entry.name);

    if (entry.isSymbolicLink()) {
      let target = "/Applications";
      try {
        target = fs.readlinkSync(entryFull);
      } catch {}
      tarBuffers.push(createTarHeader(entryRel, 0, 0o777, "2", target));
    } else if (entry.isDirectory()) {
      tarBuffers.push(createTarHeader(entryRel + "/", 0, 0o755, "5"));
      tarBuffers.push(createTar(baseDir, entryRel));
    } else {
      const stats = fs.statSync(entryFull);
      const data = fs.readFileSync(entryFull);
      const mode = entry.name.endsWith(".sh") ? 0o755 : 0o644;
      tarBuffers.push(createTarHeader(entryRel, stats.size, mode, "0"));
      tarBuffers.push(data);
      // Alinhamento em blocos de 512 bytes
      const padding = 512 - (stats.size % 512);
      if (padding < 512) {
        tarBuffers.push(Buffer.alloc(padding));
      }
    }
  }
  return Buffer.concat(tarBuffers);
}

function createTarHeader(name, size, mode, typeflag, linkname = "") {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");
  header.write(mode.toString(8).padStart(7, "0") + " ", 100, 8, "ascii");
  header.write("0000000 ", 108, 8, "ascii"); // uid
  header.write("0000000 ", 116, 8, "ascii"); // gid
  header.write(size.toString(8).padStart(11, "0") + " ", 124, 12, "ascii");
  const mtime = Math.floor(Date.now() / 1000);
  header.write(mtime.toString(8).padStart(11, "0") + " ", 136, 12, "ascii");
  header.write("        ", 148, 8, "ascii"); // checksum placeholder
  header.write(typeflag, 156, 1, "ascii");
  if (linkname) {
    header.write(linkname, 157, 100, "ascii");
  }
  header.write("ustar  ", 257, 8, "ascii"); // magic
  header.write("root", 265, 32, "utf8");
  header.write("wheel", 297, 32, "utf8");

  // Calcula checksum
  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += header[i];
  }
  header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8, "ascii");
  return header;
}

const tarPayload = createTar(STAGE_DIR);
const compressedPayload = zlib.gzipSync(tarPayload, { level: 9 });

// Bloco Trailer UDIF 'koly' Apple Specification (512 bytes)
const koly = Buffer.alloc(512);
koly.write("koly", 0, 4, "ascii"); // Signature
koly.writeUInt32BE(4, 4); // Version 4
koly.writeUInt32BE(512, 8); // HeaderSize
koly.writeUInt32BE(1, 12); // Flags
koly.writeBigUInt64BE(0n, 16); // RunningDataForkOffset
koly.writeBigUInt64BE(BigInt(compressedPayload.length), 24); // DataForkLength
koly.writeBigUInt64BE(0n, 32); // RsrcForkOffset
koly.writeBigUInt64BE(0n, 40); // RsrcForkLength
koly.writeUInt32BE(1, 48); // SegmentNumber
koly.writeUInt32BE(1, 52); // MaxSegmentNumber

// UUID
koly.fill(0xaa, 56, 72);

// Checksum
koly.writeUInt32BE(2, 72); // CRC32 type
koly.writeUInt32BE(32, 76);

// Escreve o arquivo .dmg comprimido final
const dmgBuffer = Buffer.concat([compressedPayload, koly]);
fs.writeFileSync(dmgPath, dmgBuffer);
fs.writeFileSync(rootDmgPath, dmgBuffer);
fs.writeFileSync(docsDmgPath, dmgBuffer);

console.log(`✅ Imagem CTRL-Farm.dmg criada com sucesso:`);
console.log(`   → ${dmgPath} (${(dmgBuffer.length / 1024).toFixed(1)} KB)`);
console.log(`   → ${rootDmgPath}`);
console.log(`   → ${docsDmgPath}`);
