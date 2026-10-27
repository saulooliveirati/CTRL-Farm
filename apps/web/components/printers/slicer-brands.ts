export type SlicerBrandId =
  | "bambu"
  | "creality"
  | "anycubic"
  | "flashforge"
  | "prusa"
  | "elegoo"
  | "generic";

export interface SlicerSpeedProfile {
  label: string;
  rate: number;
  icon: string;
  desc: string;
}

export interface SlicerBrandConfig {
  id: SlicerBrandId;
  name: string;
  shortName: string;
  brandName: string;
  subtitle: string;
  icon: string;
  accent: string;
  accentClass: string;
  accentBg: string;
  accentBorder: string;
  glowRing: string;
  badgeColor: string;
  buttonClass: string;
  materialSystem: string;
  defaultSlotsCount: number;
  tabs: string[];
  speedProfiles: SlicerSpeedProfile[];
  headerBadgeText: string;
  // Temas específicos da imagem
  theme: {
    containerBorder: string;
    containerBg: string;
    headerBg: string;
    cardBg: string;
    cardBorder: string;
    accentHex: string;
    donutTrack: string;
    wifiColor: string;
    defaultIp: string;
    defaultGcodeFile: string;
  };
  features: {
    hasAms: boolean;
    amsType: "ams" | "cfs" | "ace_pro" | "ifs" | "mmu3" | "generic";
    hasChamberLight: boolean;
    hasHepaFilter: boolean;
    hasAceDryer: boolean;
    hasLoadcell: boolean;
    hasAiCamera: boolean;
    hasDualFan: boolean;
    hasChamberTemp: boolean;
    jogLayout: "diamond" | "circular" | "standard";
  };
}

export function detectBrandSlicer(
  manufacturer?: string | null,
  model?: string | null,
): SlicerBrandConfig {
  const m = (manufacturer || "").toLowerCase();
  const mod = (model || "").toLowerCase();

  // Bambu Lab
  if (
    m.includes("bambu") ||
    mod.includes("bambu") ||
    mod.includes("a1") ||
    mod.includes("x1") ||
    mod.includes("p1")
  ) {
    return {
      id: "bambu",
      name: "Bambu Lab",
      shortName: "Bambu Studio",
      brandName: "Bambu Lab",
      subtitle: "Telemetria da Impressora 3D",
      icon: "🎋",
      accent: "#00ae42",
      accentClass: "text-[#00ae42]",
      accentBg: "bg-[#00ae42]",
      accentBorder: "border-[#00ae42]/50",
      glowRing: "ring-[#00ae42]",
      badgeColor: "bg-emerald-950/80 text-emerald-400 border-emerald-800",
      buttonClass:
        "border-emerald-500/60 bg-gradient-to-r from-emerald-600/25 to-emerald-500/15 text-emerald-300 hover:from-emerald-600/35 hover:to-emerald-500/25 hover:border-emerald-400",
      materialSystem: "Bambu AMS / AMS Lite Hub",
      defaultSlotsCount: 4,
      tabs: ["Telemetria", "Controles & GCODE"],
      speedProfiles: [
        { label: "Silencioso", rate: 50, icon: "🌙", desc: "50% de velocidade (Modo Silencioso)" },
        { label: "Padrão", rate: 100, icon: "⚡", desc: "100% velocidade nominal (Padrão)" },
        { label: "Esporte", rate: 124, icon: "🚀", desc: "124% alta velocidade (Modo Esporte)" },
        { label: "Insano", rate: 166, icon: "🔥", desc: "166% velocidade máxima (Ludicrous)" },
      ],
      headerBadgeText: "Bambu Lab OS",
      theme: {
        containerBorder: "border-[#064e3b]/90 shadow-[0_0_50px_rgba(0,174,66,0.15)]",
        containerBg: "bg-[#07130e]",
        headerBg: "bg-[#05100b]",
        cardBg: "bg-[#091a13]/85",
        cardBorder: "border-[#0f3424]",
        accentHex: "#00ae42",
        donutTrack: "#0d261b",
        wifiColor: "#00ae42",
        defaultIp: "192.168.1.50",
        defaultGcodeFile: "Dragon_PLA.gcode",
      },
      features: {
        hasAms: true,
        amsType: "ams",
        hasChamberLight: true,
        hasHepaFilter: false,
        hasAceDryer: false,
        hasLoadcell: false,
        hasAiCamera: true,
        hasDualFan: true,
        hasChamberTemp: true,
        jogLayout: "diamond",
      },
    };
  }

  // Flashforge
  if (
    m.includes("flashforge") ||
    mod.includes("ad5x") ||
    mod.includes("5m") ||
    mod.includes("guider") ||
    mod.includes("adventurer") ||
    mod.includes("creator")
  ) {
    return {
      id: "flashforge",
      name: "FLASHFORGE",
      shortName: "FlashPrint 5",
      brandName: "Flashforge",
      subtitle: "Telemetria da Impressora 3D",
      icon: "⚡",
      accent: "#00a2e8",
      accentClass: "text-[#00a2e8]",
      accentBg: "bg-[#00a2e8]",
      accentBorder: "border-[#00a2e8]/50",
      glowRing: "ring-[#00a2e8]",
      badgeColor: "bg-cyan-950/80 text-cyan-300 border-cyan-800",
      buttonClass:
        "border-cyan-500/60 bg-gradient-to-r from-cyan-600/25 to-cyan-500/15 text-cyan-300 hover:from-cyan-600/35 hover:to-cyan-500/25 hover:border-cyan-400",
      materialSystem: "Flashforge Multi-Material IFS",
      defaultSlotsCount: 4,
      tabs: ["Telemetria", "Controles & GCODE"],
      speedProfiles: [
        { label: "Econômico", rate: 80, icon: "🌱", desc: "80% silencioso e estável" },
        { label: "Padrão", rate: 100, icon: "⚡", desc: "100% velocidade nominal" },
        { label: "High-Speed", rate: 120, icon: "🚀", desc: "120% alta velocidade AD5X" },
        { label: "Turbo AD5X", rate: 150, icon: "🔥", desc: "150% aceleração máxima" },
      ],
      headerBadgeText: "Adventurer TCP",
      theme: {
        containerBorder: "border-[#0c4a6e]/90 shadow-[0_0_50px_rgba(0,162,232,0.15)]",
        containerBg: "bg-[#07131e]",
        headerBg: "bg-[#050f18]",
        cardBg: "bg-[#081a2b]/85",
        cardBorder: "border-[#0e304f]",
        accentHex: "#00a2e8",
        donutTrack: "#0a243d",
        wifiColor: "#00a2e8",
        defaultIp: "192.168.1.52",
        defaultGcodeFile: "Peça_Teste.gcode",
      },
      features: {
        hasAms: true,
        amsType: "ifs",
        hasChamberLight: true,
        hasHepaFilter: true,
        hasAceDryer: false,
        hasLoadcell: false,
        hasAiCamera: true,
        hasDualFan: true,
        hasChamberTemp: false,
        jogLayout: "standard",
      },
    };
  }

  // Anycubic
  if (
    m.includes("anycubic") ||
    mod.includes("kobra") ||
    mod.includes("photon") ||
    mod.includes("ace") ||
    mod.includes("vyper")
  ) {
    return {
      id: "anycubic",
      name: "ANYCUBIC",
      shortName: "Anycubic Slicer",
      brandName: "Anycubic",
      subtitle: "Telemetria da Impressora 3D",
      icon: "🔶",
      accent: "#f59e0b",
      accentClass: "text-[#f59e0b]",
      accentBg: "bg-[#f59e0b]",
      accentBorder: "border-[#f59e0b]/50",
      glowRing: "ring-[#f59e0b]",
      badgeColor: "bg-amber-950/80 text-amber-300 border-amber-800",
      buttonClass:
        "border-amber-500/60 bg-gradient-to-r from-amber-600/25 to-amber-500/15 text-amber-300 hover:from-amber-600/35 hover:to-amber-500/25 hover:border-amber-400",
      materialSystem: "Anycubic Color Engine Pro (ACE Pro)",
      defaultSlotsCount: 4,
      tabs: ["Telemetria", "Controles & GCODE"],
      speedProfiles: [
        { label: "Silencioso", rate: 60, icon: "🌙", desc: "60% baixo ruído LeviQ" },
        { label: "Padrão", rate: 100, icon: "⚡", desc: "100% velocidade nominal Kobra" },
        { label: "Ultra-Speed", rate: 150, icon: "🚀", desc: "150% aceleração máxima" },
      ],
      headerBadgeText: "Kobra OS 2.0",
      theme: {
        containerBorder: "border-[#78350f]/90 shadow-[0_0_50px_rgba(245,158,11,0.15)]",
        containerBg: "bg-[#140e06]",
        headerBg: "bg-[#0f0a04]",
        cardBg: "bg-[#1c1308]/85",
        cardBorder: "border-[#382309]",
        accentHex: "#f59e0b",
        donutTrack: "#291907",
        wifiColor: "#f59e0b",
        defaultIp: "192.168.1.53",
        defaultGcodeFile: "Miniatura.gcode",
      },
      features: {
        hasAms: true,
        amsType: "ace_pro",
        hasChamberLight: true,
        hasHepaFilter: false,
        hasAceDryer: true,
        hasLoadcell: false,
        hasAiCamera: true,
        hasDualFan: true,
        hasChamberTemp: false,
        jogLayout: "standard",
      },
    };
  }

  // Elegoo
  if (
    m.includes("elegoo") ||
    mod.includes("neptune") ||
    mod.includes("saturn") ||
    mod.includes("mars")
  ) {
    return {
      id: "elegoo",
      name: "ELEGOO",
      shortName: "Elegoo Slicer",
      brandName: "Elegoo",
      subtitle: "Telemetria da Impressora 3D",
      icon: "🌊",
      accent: "#a855f7",
      accentClass: "text-[#a855f7]",
      accentBg: "bg-[#a855f7]",
      accentBorder: "border-[#a855f7]/50",
      glowRing: "ring-[#a855f7]",
      badgeColor: "bg-purple-950/80 text-purple-300 border-purple-800",
      buttonClass:
        "border-purple-500/60 bg-gradient-to-r from-purple-600/25 to-purple-500/15 text-purple-300 hover:from-purple-600/35 hover:to-purple-500/25 hover:border-purple-400",
      materialSystem: "Sistema de Filamentos Multi-Material",
      defaultSlotsCount: 4,
      tabs: ["Telemetria", "Controles & GCODE"],
      speedProfiles: [
        { label: "50%", rate: 50, icon: "🌙", desc: "50% velocidade" },
        { label: "100%", rate: 100, icon: "⚡", desc: "100% velocidade nominal" },
        { label: "125%", rate: 125, icon: "🚀", desc: "125% velocidade" },
        { label: "150%", rate: 150, icon: "🔥", desc: "150% velocidade" },
      ],
      headerBadgeText: "Neptune OS",
      theme: {
        containerBorder: "border-[#581c87]/90 shadow-[0_0_50px_rgba(168,85,247,0.15)]",
        containerBg: "bg-[#11071c]",
        headerBg: "bg-[#0c0414]",
        cardBg: "bg-[#180a29]/85",
        cardBorder: "border-[#30104f]",
        accentHex: "#a855f7",
        donutTrack: "#230b3d",
        wifiColor: "#a855f7",
        defaultIp: "192.168.1.54",
        defaultGcodeFile: "Suporte.gcode",
      },
      features: {
        hasAms: false,
        amsType: "generic",
        hasChamberLight: true,
        hasHepaFilter: false,
        hasAceDryer: false,
        hasLoadcell: false,
        hasAiCamera: true,
        hasDualFan: true,
        hasChamberTemp: false,
        jogLayout: "standard",
      },
    };
  }

  // Creality
  if (
    m.includes("creality") ||
    mod.includes("ender") ||
    mod.includes("k1") ||
    mod.includes("halot") ||
    mod.includes("cr-")
  ) {
    return {
      id: "creality",
      name: "CREALITY",
      shortName: "Creality Print",
      brandName: "Creality",
      subtitle: "Telemetria da Impressora 3D",
      icon: "🔥",
      accent: "#ef4444",
      accentClass: "text-[#ef4444]",
      accentBg: "bg-[#ef4444]",
      accentBorder: "border-[#ef4444]/50",
      glowRing: "ring-[#ef4444]",
      badgeColor: "bg-rose-950/80 text-rose-300 border-rose-800",
      buttonClass:
        "border-rose-500/60 bg-gradient-to-r from-rose-600/25 to-rose-500/15 text-rose-300 hover:from-rose-600/35 hover:to-rose-500/25 hover:border-rose-400",
      materialSystem: "Creality CFS (Filament System)",
      defaultSlotsCount: 4,
      tabs: ["Telemetria", "Controles & GCODE"],
      speedProfiles: [
        { label: "Silencioso", rate: 50, icon: "🌙", desc: "50% de velocidade" },
        { label: "Normal", rate: 100, icon: "⚡", desc: "100% velocidade nominal" },
        { label: "Rápido", rate: 125, icon: "🚀", desc: "125% aceleração rápida" },
        { label: "Hyper Speed", rate: 150, icon: "🔥", desc: "150% até 600 mm/s" },
      ],
      headerBadgeText: "Creality OS",
      theme: {
        containerBorder: "border-[#7f1d1d]/90 shadow-[0_0_50px_rgba(239,68,68,0.15)]",
        containerBg: "bg-[#150709]",
        headerBg: "bg-[#0e0405]",
        cardBg: "bg-[#1f0a0d]/85",
        cardBorder: "border-[#3d1118]",
        accentHex: "#ef4444",
        donutTrack: "#2b0a0f",
        wifiColor: "#ef4444",
        defaultIp: "192.168.1.55",
        defaultGcodeFile: "K1_Speed_Test.gcode",
      },
      features: {
        hasAms: true,
        amsType: "cfs",
        hasChamberLight: true,
        hasHepaFilter: false,
        hasAceDryer: false,
        hasLoadcell: false,
        hasAiCamera: true,
        hasDualFan: true,
        hasChamberTemp: false,
        jogLayout: "circular",
      },
    };
  }

  // Original Prusa
  if (
    m.includes("prusa") ||
    mod.includes("mk4") ||
    mod.includes("mk3") ||
    mod.includes("xl") ||
    mod.includes("mini") ||
    mod.includes("mmu")
  ) {
    return {
      id: "prusa",
      name: "ORIGINAL PRUSA",
      shortName: "Prusa Connect",
      brandName: "Original Prusa",
      subtitle: "Telemetria da Impressora 3D",
      icon: "🟠",
      accent: "#fa6831",
      accentClass: "text-[#fa6831]",
      accentBg: "bg-[#fa6831]",
      accentBorder: "border-[#fa6831]/50",
      glowRing: "ring-[#fa6831]",
      badgeColor: "bg-orange-950/80 text-orange-300 border-orange-800",
      buttonClass:
        "border-orange-500/60 bg-gradient-to-r from-orange-600/25 to-orange-500/15 text-orange-300 hover:from-orange-600/35 hover:to-orange-500/25 hover:border-orange-400",
      materialSystem: "Original Prusa MMU3 (5 Cores)",
      defaultSlotsCount: 5,
      tabs: ["Telemetria", "Controles & GCODE"],
      speedProfiles: [
        { label: "Stealth", rate: 70, icon: "🌙", desc: "70% modo silencioso" },
        { label: "Normal", rate: 100, icon: "⚡", desc: "100% velocidade nominal" },
        { label: "Speed", rate: 130, icon: "🚀", desc: "130% Input Shaper" },
      ],
      headerBadgeText: "Prusa Buddy OS",
      theme: {
        containerBorder: "border-[#7c2d12]/90 shadow-[0_0_50px_rgba(250,104,49,0.15)]",
        containerBg: "bg-[#140b07]",
        headerBg: "bg-[#0d0704]",
        cardBg: "bg-[#1d100a]/85",
        cardBorder: "border-[#381e13]",
        accentHex: "#fa6831",
        donutTrack: "#26130b",
        wifiColor: "#fa6831",
        defaultIp: "192.168.1.56",
        defaultGcodeFile: "Prusa_Buddy.bgcode",
      },
      features: {
        hasAms: true,
        amsType: "mmu3",
        hasChamberLight: true,
        hasHepaFilter: false,
        hasAceDryer: false,
        hasLoadcell: true,
        hasAiCamera: true,
        hasDualFan: false,
        hasChamberTemp: false,
        jogLayout: "standard",
      },
    };
  }

  // Genérico / OrcaSlicer
  return {
    id: "generic",
    name: manufacturer?.toUpperCase() || "ORCASLICER",
    shortName: "OrcaSlicer",
    brandName: manufacturer || "Impressora 3D",
    subtitle: "Telemetria da Impressora 3D",
    icon: "📊",
    accent: "#10b981",
    accentClass: "text-[#10b981]",
    accentBg: "bg-[#10b981]",
    accentBorder: "border-[#10b981]/50",
    glowRing: "ring-[#10b981]",
    badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
    buttonClass:
      "border-emerald-500/50 bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 text-emerald-300 hover:from-emerald-600/30 hover:to-emerald-500/20 hover:border-emerald-400",
    materialSystem: "Sistema Multi-Material Universal",
    defaultSlotsCount: 4,
    tabs: ["Telemetria", "Controles & GCODE"],
    speedProfiles: [
      { label: "50%", rate: 50, icon: "🌙", desc: "50% velocidade" },
      { label: "100%", rate: 100, icon: "⚡", desc: "100% velocidade nominal" },
      { label: "125%", rate: 125, icon: "🚀", desc: "125% velocidade" },
      { label: "150%", rate: 150, icon: "🔥", desc: "150% velocidade" },
    ],
    headerBadgeText: "Klipper / Orca",
    theme: {
      containerBorder: "border-slate-700/90 shadow-[0_0_50px_rgba(16,185,129,0.15)]",
      containerBg: "bg-[#090d16]",
      headerBg: "bg-[#060910]",
      cardBg: "bg-[#0e1422]/85",
      cardBorder: "border-[#18233a]",
      accentHex: "#10b981",
      donutTrack: "#121d30",
      wifiColor: "#10b981",
      defaultIp: "192.168.1.99",
      defaultGcodeFile: "Modelo_Universal.gcode",
    },
    features: {
      hasAms: false,
      amsType: "generic",
      hasChamberLight: true,
      hasHepaFilter: false,
      hasAceDryer: false,
      hasLoadcell: false,
      hasAiCamera: true,
      hasDualFan: false,
      hasChamberTemp: false,
      jogLayout: "standard",
    },
  };
}
