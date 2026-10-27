export type MaterialTechnology = "FDM" | "SLA";

export interface MaterialManufacturer {
  brand: string;
  country: string;
  website: string;
  contact: string;
  logoEmoji: string;
  description: string;
}

export interface MaterialProperties {
  densityGcm3: number; // g/cm³
  tensileStrengthMpa: string; // Resistência à tração
  flexuralModulusMpa: string; // Módulo de flexão
  impactStrengthKjm2: string; // Resistência ao impacto
  heatDeflectionTempC: string; // Temperatura de deflexão térmica (HDT)
  elongationAtBreak: string; // Alongamento na ruptura (%)
  hardnessShore?: string; // Dureza Shore (95A para TPU, 82D para resinas)
}

export interface PrintProfile {
  nozzleTempRangeC: string;
  recommendedNozzleTempC: number;
  bedTempRangeC: string;
  recommendedBedTempC: number;
  exposureTimeSec?: string; // Para SLA/MSLA (tempo normal de cura)
  bottomExposureTimeSec?: string; // Para SLA/MSLA (camadas de base)
  layerHeightMm: string;
  recommendedSpeedMmS?: string;
  coolingFanPercent: string;
  enclosureRequired: string;
  dryingRecommendation: string;
  recommendedSlicers: string[];
}

export interface MaterialCertifications {
  rohs: boolean;
  reach: boolean;
  fdaFoodContact: boolean;
  isoStandards: string[];
  tdsUrl: string;
  sdsUrl: string;
}

export interface MaterialItem {
  id: string;
  manufacturerBrand: string;
  name: string;
  category: "PLA" | "PETG" | "ABS" | "ASA" | "TPU" | "NYLON" | "PC" | "OTHER";
  specificType: string;
  technology: MaterialTechnology;
  defaultColorHex: string;
  defaultColorName: string;
  shelfLifeMonths: number;
  properties: MaterialProperties;
  printProfile: PrintProfile;
  certifications: MaterialCertifications;
  notes: string;
}

// ==========================================
// FABRICANTES CADASTRADOS NA BASE DE CONHECIMENTO
// ==========================================
export const MATERIAL_MANUFACTURERS: MaterialManufacturer[] = [
  {
    brand: "Genérico",
    country: "Brasil / Internacional",
    website: "https://ctrlfarm.local/docs/materials",
    contact: "suporte@ctrlfarm.com.br",
    logoEmoji: "📦",
    description:
      "Parâmetros padrão e tolerâncias universais para materiais sem marcação ou compostos genéricos de mercado.",
  },
  {
    brand: "Bambu Lab",
    country: "China / Global",
    website: "https://bambulab.com",
    contact: "support@bambulab.com",
    logoEmoji: "🎋",
    description:
      "Filamentos de alta velocidade com chip RFID integrado e calibrações oficiais para o sistema AMS.",
  },
  {
    brand: "eSUN",
    country: "China / Brasil",
    website: "https://www.esun3d.com",
    contact: "vendas@esun3d.com.br",
    logoEmoji: "☀️",
    description:
      "Pioneira global em PLA+, ePA-CF e resinas com certificações ambientais e alta consistência de diâmetro.",
  },
  {
    brand: "Polymaker",
    country: "Estados Unidos / Holanda",
    website: "https://polymaker.com",
    contact: "support@polymaker.com",
    logoEmoji: "🌿",
    description:
      "Líder em materiais técnicos de engenharia, linha ecológica PolyTerra e filamentos antichama e reforçados.",
  },
  {
    brand: "Prusament (Prusa)",
    country: "República Tcheca",
    website: "https://prusament.com",
    contact: "info@prusa3d.com",
    logoEmoji: "🟠",
    description:
      "O filamento mais preciso do mundo com tolerância de diâmetro de ±0.02 mm e QR Code com relatório de inspeção individual por carretel.",
  },
  {
    brand: "Sunlu",
    country: "China",
    website: "https://www.sunlu.com",
    contact: "sales@sunlu.com",
    logoEmoji: "🚀",
    description:
      "Excelente custo-benefício em filamentos rápidos (PLA Meta), PETG e resinas fotopolímeras padrão.",
  },
  {
    brand: "Voolt3D",
    country: "Brasil",
    website: "https://voolt3d.com.br",
    contact: "contato@voolt3d.com.br",
    logoEmoji: "⚡",
    description:
      "Fabricante brasileira conceituada de filamentos premium PLA, PETG XT e ABS de alta pureza.",
  },
  {
    brand: "3D Fila",
    country: "Brasil",
    website: "https://3dfila.com.br",
    contact: "suporte@3dfila.com.br",
    logoEmoji: "🇧🇷",
    description:
      "Tradição nacional em compostos técnicos, linha EasyFill e filamentos de engenharia.",
  },
  {
    brand: "National 3D",
    country: "Brasil",
    website: "https://national3d.com.br",
    contact: "contato@national3d.com.br",
    logoEmoji: "🟢",
    description:
      "Fabricação brasileira especializada em alta produtividade para farms de impressão 3D.",
  },
  {
    brand: "Creality",
    country: "China",
    website: "https://creality.com",
    contact: "support@creality.com",
    logoEmoji: "🐉",
    description:
      "Linha Hyper PLA de alta fluidez otimizada para impressoras CoreXY e resinas fotopolímeras.",
  },
  {
    brand: "Elegoo",
    country: "China",
    website: "https://elegoo.com",
    contact: "info@elegoo.com",
    logoEmoji: "🪐",
    description:
      "Referência mundial em resinas 8K/12K com baixa contração, rápida cura e linha lavável em água.",
  },
  {
    brand: "Anycubic",
    country: "China",
    website: "https://anycubic.com",
    contact: "support@anycubic.com",
    logoEmoji: "🧊",
    description:
      "Linha completa de resinas UV 405nm (Standard+, Tough e Plant-based) e filamentos FDM.",
  },
  {
    brand: "Siraya Tech",
    country: "Estados Unidos",
    website: "https://siraya.tech",
    contact: "support@siraya.tech",
    logoEmoji: "💎",
    description:
      "Resinas industriais de altíssima resistência (Fast ABS-Like, Blu Tough e Castable para fundição de joias).",
  },
];

// ==========================================
// BASE DE DADOS TÉCNICA DE MATERIAIS (FDM E RESINA)
// ==========================================
export const MATERIAL_DATABASE: MaterialItem[] = [
  // ------------------------------------------
  // MATERIAIS GENÉRICOS (PADRÃO UNIVERSAL)
  // ------------------------------------------
  {
    id: "gen-pla",
    manufacturerBrand: "Genérico",
    name: "PLA Genérico Universal",
    category: "PLA",
    specificType: "PLA Standard",
    technology: "FDM",
    defaultColorHex: "#18181b",
    defaultColorName: "Preto",
    shelfLifeMonths: 24,
    properties: {
      densityGcm3: 1.24,
      tensileStrengthMpa: "45 - 55 MPa",
      flexuralModulusMpa: "2400 - 2800 MPa",
      impactStrengthKjm2: "3.0 - 4.5 kJ/m²",
      heatDeflectionTempC: "55°C",
      elongationAtBreak: "5% - 7%",
    },
    printProfile: {
      nozzleTempRangeC: "195°C - 220°C",
      recommendedNozzleTempC: 210,
      bedTempRangeC: "50°C - 60°C",
      recommendedBedTempC: 55,
      layerHeightMm: "0.12 - 0.28 mm",
      recommendedSpeedMmS: "60 - 200 mm/s",
      coolingFanPercent: "100%",
      enclosureRequired: "Não recomendada (Aberta)",
      dryingRecommendation: "45°C por 4 horas (se exposto a umidade > 50%)",
      recommendedSlicers: ["Bambu Studio", "OrcaSlicer", "PrusaSlicer", "Cura"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: false,
      isoStandards: ["ISO 9001"],
      tdsUrl: "https://ctrlfarm.local/tds/generic-pla.pdf",
      sdsUrl: "https://ctrlfarm.local/sds/generic-pla.pdf",
    },
    notes: "Parâmetros médios balanceados compatíveis com qualquer marca de PLA.",
  },
  {
    id: "gen-petg",
    manufacturerBrand: "Genérico",
    name: "PETG Genérico Universal",
    category: "PETG",
    specificType: "PETG Co-poliéster",
    technology: "FDM",
    defaultColorHex: "#0284c7",
    defaultColorName: "Azul Cristal",
    shelfLifeMonths: 24,
    properties: {
      densityGcm3: 1.27,
      tensileStrengthMpa: "50 - 55 MPa",
      flexuralModulusMpa: "2100 - 2400 MPa",
      impactStrengthKjm2: "7.0 - 9.0 kJ/m²",
      heatDeflectionTempC: "70°C - 75°C",
      elongationAtBreak: "15% - 25%",
    },
    printProfile: {
      nozzleTempRangeC: "230°C - 250°C",
      recommendedNozzleTempC: 240,
      bedTempRangeC: "70°C - 85°C",
      recommendedBedTempC: 75,
      layerHeightMm: "0.12 - 0.28 mm",
      recommendedSpeedMmS: "80 - 250 mm/s",
      coolingFanPercent: "20% - 50%",
      enclosureRequired: "Opcional (Sem correntes de ar frio)",
      dryingRecommendation: "60°C por 6 horas (Higroscópico)",
      recommendedSlicers: ["OrcaSlicer", "Bambu Studio", "PrusaSlicer"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: false,
      isoStandards: ["ISO 9001"],
      tdsUrl: "https://ctrlfarm.local/tds/generic-petg.pdf",
      sdsUrl: "https://ctrlfarm.local/sds/generic-petg.pdf",
    },
    notes: "Excelente tenacidade mecânica e resistência a intempéries e raios UV.",
  },
  {
    id: "gen-abs",
    manufacturerBrand: "Genérico",
    name: "ABS Genérico Industrial",
    category: "ABS",
    specificType: "ABS Técnico",
    technology: "FDM",
    defaultColorHex: "#334155",
    defaultColorName: "Cinza Chumbo",
    shelfLifeMonths: 36,
    properties: {
      densityGcm3: 1.05,
      tensileStrengthMpa: "40 - 45 MPa",
      flexuralModulusMpa: "2000 - 2300 MPa",
      impactStrengthKjm2: "15 - 20 kJ/m²",
      heatDeflectionTempC: "85°C - 90°C",
      elongationAtBreak: "20% - 30%",
    },
    printProfile: {
      nozzleTempRangeC: "240°C - 265°C",
      recommendedNozzleTempC: 250,
      bedTempRangeC: "95°C - 110°C",
      recommendedBedTempC: 100,
      layerHeightMm: "0.12 - 0.24 mm",
      recommendedSpeedMmS: "60 - 200 mm/s",
      coolingFanPercent: "0% - 15%",
      enclosureRequired: "Obrigatória (Câmara fechada sem vento)",
      dryingRecommendation: "70°C por 4 horas",
      recommendedSlicers: ["OrcaSlicer", "Bambu Studio", "PrusaSlicer"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: false,
      isoStandards: ["ISO 9001"],
      tdsUrl: "https://ctrlfarm.local/tds/generic-abs.pdf",
      sdsUrl: "https://ctrlfarm.local/sds/generic-abs.pdf",
    },
    notes: "Resistência a impactos e aceita acabamento com vapor de acetona.",
  },
  {
    id: "gen-tpu",
    manufacturerBrand: "Genérico",
    name: "TPU Flexível 95A Genérico",
    category: "TPU",
    specificType: "TPU Shore 95A",
    technology: "FDM",
    defaultColorHex: "#ef4444",
    defaultColorName: "Vermelho Translúcido",
    shelfLifeMonths: 24,
    properties: {
      densityGcm3: 1.21,
      tensileStrengthMpa: "35 - 40 MPa",
      flexuralModulusMpa: "150 - 200 MPa",
      impactStrengthKjm2: "Sem fratura",
      heatDeflectionTempC: "60°C",
      elongationAtBreak: "450% - 550%",
      hardnessShore: "95A",
    },
    printProfile: {
      nozzleTempRangeC: "215°C - 235°C",
      recommendedNozzleTempC: 225,
      bedTempRangeC: "30°C - 50°C",
      recommendedBedTempC: 40,
      layerHeightMm: "0.16 - 0.28 mm",
      recommendedSpeedMmS: "25 - 60 mm/s (Velocidade reduzida)",
      coolingFanPercent: "80% - 100%",
      enclosureRequired: "Não recomendada",
      dryingRecommendation: "55°C por 6 horas (Extremamente higroscópico)",
      recommendedSlicers: ["OrcaSlicer", "PrusaSlicer", "Cura"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: false,
      isoStandards: ["ISO 9001"],
      tdsUrl: "https://ctrlfarm.local/tds/generic-tpu.pdf",
      sdsUrl: "https://ctrlfarm.local/sds/generic-tpu.pdf",
    },
    notes: "Flexibilidade elástica, amortecimento de vibrações e vedações técnicas.",
  },
  {
    id: "gen-resin-std",
    manufacturerBrand: "Genérico",
    name: "Resina Standard UV 405nm Genérica",
    category: "OTHER",
    specificType: "Resina Fotopolímera Standard",
    technology: "SLA",
    defaultColorHex: "#94a3b8",
    defaultColorName: "Cinza Standard",
    shelfLifeMonths: 18,
    properties: {
      densityGcm3: 1.15,
      tensileStrengthMpa: "35 - 45 MPa",
      flexuralModulusMpa: "1800 - 2200 MPa",
      impactStrengthKjm2: "15 - 20 J/m",
      heatDeflectionTempC: "65°C",
      elongationAtBreak: "8% - 12%",
      hardnessShore: "82D",
    },
    printProfile: {
      nozzleTempRangeC: "N/A",
      recommendedNozzleTempC: 0,
      bedTempRangeC: "N/A",
      recommendedBedTempC: 0,
      exposureTimeSec: "2.0s - 3.0s",
      bottomExposureTimeSec: "25s - 35s",
      layerHeightMm: "0.05 mm",
      coolingFanPercent: "N/A",
      enclosureRequired: "Ambiente ventilado (20°C - 28°C)",
      dryingRecommendation: "Lavar com IPA 99% e pós-cura UV por 3 a 5 min",
      recommendedSlicers: ["ChituBox", "Lychee Slicer", "Voxeldance Tango"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: false,
      isoStandards: ["ISO 9001"],
      tdsUrl: "https://ctrlfarm.local/tds/generic-resin.pdf",
      sdsUrl: "https://ctrlfarm.local/sds/generic-resin.pdf",
    },
    notes: "Excelente definição de detalhes para miniaturas, joias e protótipos de alta resolução.",
  },

  // ------------------------------------------
  // BAMBU LAB
  // ------------------------------------------
  {
    id: "bambu-pla-basic",
    manufacturerBrand: "Bambu Lab",
    name: "Bambu PLA Basic",
    category: "PLA",
    specificType: "PLA High-Speed",
    technology: "FDM",
    defaultColorHex: "#00ae42",
    defaultColorName: "Bambu Green",
    shelfLifeMonths: 24,
    properties: {
      densityGcm3: 1.24,
      tensileStrengthMpa: "53 ± 3 MPa",
      flexuralModulusMpa: "2730 ± 110 MPa",
      impactStrengthKjm2: "4.5 ± 0.3 kJ/m²",
      heatDeflectionTempC: "57°C",
      elongationAtBreak: "11.8 ± 1.5%",
    },
    printProfile: {
      nozzleTempRangeC: "190°C - 230°C",
      recommendedNozzleTempC: 220,
      bedTempRangeC: "35°C - 55°C",
      recommendedBedTempC: 55,
      layerHeightMm: "0.08 - 0.28 mm",
      recommendedSpeedMmS: "50 - 300 mm/s (Suporta até 500 mm/s)",
      coolingFanPercent: "100%",
      enclosureRequired: "Não recomendada (Porta/tampa entreaberta)",
      dryingRecommendation: "50°C por 6 horas em estufa",
      recommendedSlicers: ["Bambu Studio", "OrcaSlicer"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: false,
      isoStandards: ["ISO 9001", "ISO 14001"],
      tdsUrl: "https://cdn.shopify.com/s/files/1/0584/7236/6241/files/TDS_Bambu_PLA_Basic.pdf",
      sdsUrl: "https://cdn.shopify.com/s/files/1/0584/7236/6241/files/SDS_Bambu_PLA_Basic.pdf",
    },
    notes: "Chip RFID embutido para sincronização automática com o Bambu AMS.",
  },
  {
    id: "bambu-petg-cf",
    manufacturerBrand: "Bambu Lab",
    name: "Bambu PETG-CF (Fibra de Carbono)",
    category: "PETG",
    specificType: "PETG Reforçado com CF",
    technology: "FDM",
    defaultColorHex: "#1e293b",
    defaultColorName: "Dark Grey CF",
    shelfLifeMonths: 24,
    properties: {
      densityGcm3: 1.29,
      tensileStrengthMpa: "62 ± 4 MPa",
      flexuralModulusMpa: "4200 ± 180 MPa",
      impactStrengthKjm2: "8.2 ± 0.5 kJ/m²",
      heatDeflectionTempC: "74°C",
      elongationAtBreak: "4.8 ± 0.5%",
    },
    printProfile: {
      nozzleTempRangeC: "240°C - 270°C",
      recommendedNozzleTempC: 255,
      bedTempRangeC: "65°C - 80°C",
      recommendedBedTempC: 70,
      layerHeightMm: "0.12 - 0.24 mm",
      recommendedSpeedMmS: "80 - 250 mm/s",
      coolingFanPercent: "20% - 60%",
      enclosureRequired: "Fechada Passiva",
      dryingRecommendation: "65°C por 8 horas (Obrigatório secar)",
      recommendedSlicers: ["Bambu Studio", "OrcaSlicer"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: false,
      isoStandards: ["ISO 9001"],
      tdsUrl: "https://bambulab.com/tds/petg-cf",
      sdsUrl: "https://bambulab.com/sds/petg-cf",
    },
    notes: "Acabamento fosco premium sem linhas visíveis de camada. Requer bico de aço endurecido.",
  },

  // ------------------------------------------
  // ESUN
  // ------------------------------------------
  {
    id: "esun-pla-plus",
    manufacturerBrand: "eSUN",
    name: "eSUN PLA+",
    category: "PLA",
    specificType: "PLA Tenaz / Reforçado",
    technology: "FDM",
    defaultColorHex: "#ffffff",
    defaultColorName: "Branco Frio",
    shelfLifeMonths: 24,
    properties: {
      densityGcm3: 1.23,
      tensileStrengthMpa: "63 MPa",
      flexuralModulusMpa: "2600 MPa",
      impactStrengthKjm2: "6.0 kJ/m² (2x mais tenaz que PLA comum)",
      heatDeflectionTempC: "53°C",
      elongationAtBreak: "20%",
    },
    printProfile: {
      nozzleTempRangeC: "205°C - 225°C",
      recommendedNozzleTempC: 215,
      bedTempRangeC: "55°C - 65°C",
      recommendedBedTempC: 60,
      layerHeightMm: "0.10 - 0.28 mm",
      recommendedSpeedMmS: "50 - 250 mm/s",
      coolingFanPercent: "100%",
      enclosureRequired: "Não recomendada",
      dryingRecommendation: "45°C por 4 horas",
      recommendedSlicers: ["OrcaSlicer", "Bambu Studio", "PrusaSlicer", "Cura"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: true,
      isoStandards: ["ISO 9001", "ISO 14001"],
      tdsUrl: "https://www.esun3d.com/uploads/PLA-TDS.pdf",
      sdsUrl: "https://www.esun3d.com/uploads/PLA-MSDS.pdf",
    },
    notes:
      "Um dos filamentos mais populares do mundo pela alta resistência mecânica e adesão entre camadas.",
  },
  {
    id: "esun-epa-cf",
    manufacturerBrand: "eSUN",
    name: "eSUN ePA-CF (Nylon Fibra de Carbono)",
    category: "NYLON",
    specificType: "Poliamida 6/66 com 20% Carbon Fiber",
    technology: "FDM",
    defaultColorHex: "#0f172a",
    defaultColorName: "Preto Carbono",
    shelfLifeMonths: 24,
    properties: {
      densityGcm3: 1.25,
      tensileStrengthMpa: "140 MPa",
      flexuralModulusMpa: "6500 MPa",
      impactStrengthKjm2: "18 kJ/m²",
      heatDeflectionTempC: "155°C",
      elongationAtBreak: "10%",
    },
    printProfile: {
      nozzleTempRangeC: "260°C - 300°C",
      recommendedNozzleTempC: 280,
      bedTempRangeC: "80°C - 100°C",
      recommendedBedTempC: 90,
      layerHeightMm: "0.12 - 0.24 mm",
      recommendedSpeedMmS: "50 - 150 mm/s",
      coolingFanPercent: "0% - 20%",
      enclosureRequired: "Obrigatória (Ambiente fechado quente)",
      dryingRecommendation: "70°C por 8 a 12 horas (Imprimir direto da secadora)",
      recommendedSlicers: ["OrcaSlicer", "PrusaSlicer"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: false,
      isoStandards: ["ISO 9001"],
      tdsUrl: "https://www.esun3d.com/uploads/ePA-CF-TDS.pdf",
      sdsUrl: "https://www.esun3d.com/uploads/ePA-CF-MSDS.pdf",
    },
    notes: "Substituto direto de peças usinadas em alumínio, com resistência térmica até 155°C.",
  },

  // ------------------------------------------
  // POLYMAKER
  // ------------------------------------------
  {
    id: "poly-polyterra-pla",
    manufacturerBrand: "Polymaker",
    name: "Polymaker PolyTerra PLA",
    category: "PLA",
    specificType: "Bioplástico PLA Ecológico Fosco",
    technology: "FDM",
    defaultColorHex: "#3b82f6",
    defaultColorName: "Sapphire Blue",
    shelfLifeMonths: 24,
    properties: {
      densityGcm3: 1.25,
      tensileStrengthMpa: "20.9 ± 2.1 MPa",
      flexuralModulusMpa: "1800 ± 150 MPa",
      impactStrengthKjm2: "5.7 ± 0.4 kJ/m²",
      heatDeflectionTempC: "52°C",
      elongationAtBreak: "34.5%",
    },
    printProfile: {
      nozzleTempRangeC: "190°C - 230°C",
      recommendedNozzleTempC: 210,
      bedTempRangeC: "35°C - 60°C",
      recommendedBedTempC: 50,
      layerHeightMm: "0.10 - 0.30 mm",
      recommendedSpeedMmS: "60 - 250 mm/s",
      coolingFanPercent: "100%",
      enclosureRequired: "Não",
      dryingRecommendation: "45°C por 4 horas",
      recommendedSlicers: ["OrcaSlicer", "PrusaSlicer", "Bambu Studio"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: false,
      isoStandards: ["ISO 9001", "ISO 14001"],
      tdsUrl: "https://polymaker.com/tds/polyterra-pla.pdf",
      sdsUrl: "https://polymaker.com/sds/polyterra-pla.pdf",
    },
    notes:
      "Carretel 100% de papelão reciclado e acabamento fosco suave que esconde completamente as camadas.",
  },

  // ------------------------------------------
  // PRUSAMENT
  // ------------------------------------------
  {
    id: "prusa-prusament-petg",
    manufacturerBrand: "Prusament (Prusa)",
    name: "Prusament PETG",
    category: "PETG",
    specificType: "PETG de Precisão ±0.02 mm",
    technology: "FDM",
    defaultColorHex: "#f97316",
    defaultColorName: "Prusa Orange",
    shelfLifeMonths: 36,
    properties: {
      densityGcm3: 1.27,
      tensileStrengthMpa: "50 MPa",
      flexuralModulusMpa: "2150 MPa",
      impactStrengthKjm2: "8.5 kJ/m²",
      heatDeflectionTempC: "68°C",
      elongationAtBreak: "25%",
    },
    printProfile: {
      nozzleTempRangeC: "240°C - 260°C",
      recommendedNozzleTempC: 250,
      bedTempRangeC: "70°C - 90°C",
      recommendedBedTempC: 80,
      layerHeightMm: "0.05 - 0.30 mm",
      recommendedSpeedMmS: "60 - 200 mm/s",
      coolingFanPercent: "30% - 50%",
      enclosureRequired: "Não necessária",
      dryingRecommendation: "60°C por 4 horas",
      recommendedSlicers: ["PrusaSlicer", "OrcaSlicer"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: true,
      isoStandards: ["ISO 9001", "ISO 14001"],
      tdsUrl: "https://prusament.com/tds/petg.pdf",
      sdsUrl: "https://prusament.com/sds/petg.pdf",
    },
    notes:
      "Enrolamento robótico perfeito sem cruzamento de fios e controle óptico de diâmetro a laser duplo.",
  },

  // ------------------------------------------
  // VOOLT3D (BRASIL)
  // ------------------------------------------
  {
    id: "voolt-pla-premium",
    manufacturerBrand: "Voolt3D",
    name: "Voolt3D PLA Premium",
    category: "PLA",
    specificType: "PLA 100% Puro Ingeo",
    technology: "FDM",
    defaultColorHex: "#eab308",
    defaultColorName: "Amarelo Canário",
    shelfLifeMonths: 24,
    properties: {
      densityGcm3: 1.24,
      tensileStrengthMpa: "55 MPa",
      flexuralModulusMpa: "2700 MPa",
      impactStrengthKjm2: "4.0 kJ/m²",
      heatDeflectionTempC: "55°C",
      elongationAtBreak: "8%",
    },
    printProfile: {
      nozzleTempRangeC: "195°C - 225°C",
      recommendedNozzleTempC: 210,
      bedTempRangeC: "50°C - 60°C",
      recommendedBedTempC: 55,
      layerHeightMm: "0.10 - 0.28 mm",
      recommendedSpeedMmS: "50 - 200 mm/s",
      coolingFanPercent: "100%",
      enclosureRequired: "Não",
      dryingRecommendation: "45°C por 4 horas",
      recommendedSlicers: ["OrcaSlicer", "Cura", "PrusaSlicer"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: false,
      isoStandards: ["ISO 9001"],
      tdsUrl: "https://voolt3d.com.br/downloads/tds-pla.pdf",
      sdsUrl: "https://voolt3d.com.br/downloads/fispq-pla.pdf",
    },
    notes: "Fabricado no Brasil com matéria-prima Ingeo NatureWorks para fluxo suave e sem bolhas.",
  },
  {
    id: "voolt-petg-xt",
    manufacturerBrand: "Voolt3D",
    name: "Voolt3D PETG XT",
    category: "PETG",
    specificType: "PETG Co-Poliéster XT",
    technology: "FDM",
    defaultColorHex: "#06b6d4",
    defaultColorName: "Ciano Translúcido",
    shelfLifeMonths: 24,
    properties: {
      densityGcm3: 1.27,
      tensileStrengthMpa: "52 MPa",
      flexuralModulusMpa: "2300 MPa",
      impactStrengthKjm2: "8.0 kJ/m²",
      heatDeflectionTempC: "72°C",
      elongationAtBreak: "22%",
    },
    printProfile: {
      nozzleTempRangeC: "230°C - 250°C",
      recommendedNozzleTempC: 240,
      bedTempRangeC: "70°C - 80°C",
      recommendedBedTempC: 75,
      layerHeightMm: "0.12 - 0.28 mm",
      recommendedSpeedMmS: "60 - 200 mm/s",
      coolingFanPercent: "30% - 50%",
      enclosureRequired: "Não",
      dryingRecommendation: "60°C por 4 a 6 horas",
      recommendedSlicers: ["OrcaSlicer", "Bambu Studio", "PrusaSlicer"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: false,
      isoStandards: ["ISO 9001"],
      tdsUrl: "https://voolt3d.com.br/downloads/tds-petg.pdf",
      sdsUrl: "https://voolt3d.com.br/downloads/fispq-petg.pdf",
    },
    notes: "Alta transparência, brilho vítreo e ótima adesão intercamadas sem entupimento.",
  },

  // ------------------------------------------
  // ELEGOO (RESINAS SLA)
  // ------------------------------------------
  {
    id: "elegoo-std-resin-8k",
    manufacturerBrand: "Elegoo",
    name: "Elegoo Standard Resin 8K",
    category: "OTHER",
    specificType: "Resina Fotopolímera Alta Resolução 8K",
    technology: "SLA",
    defaultColorHex: "#64748b",
    defaultColorName: "Space Grey",
    shelfLifeMonths: 18,
    properties: {
      densityGcm3: 1.15,
      tensileStrengthMpa: "42 - 50 MPa",
      flexuralModulusMpa: "2000 - 2400 MPa",
      impactStrengthKjm2: "18 J/m",
      heatDeflectionTempC: "68°C",
      elongationAtBreak: "10% - 15%",
      hardnessShore: "85D",
    },
    printProfile: {
      nozzleTempRangeC: "N/A",
      recommendedNozzleTempC: 0,
      bedTempRangeC: "N/A",
      recommendedBedTempC: 0,
      exposureTimeSec: "1.8s - 2.5s (Telas Monocromáticas)",
      bottomExposureTimeSec: "20s - 30s",
      layerHeightMm: "0.03 - 0.05 mm",
      coolingFanPercent: "N/A",
      enclosureRequired: "Ambiente fechado 20°C a 25°C",
      dryingRecommendation: "Lavar 3 min com álcool isopropílico 99% e curar 2 min UV 405nm",
      recommendedSlicers: ["ChituBox", "Voxeldance Tango", "Lychee"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: false,
      isoStandards: ["ISO 9001"],
      tdsUrl: "https://elegoo.com/tds/standard-resin-8k.pdf",
      sdsUrl: "https://elegoo.com/sds/standard-resin-8k.pdf",
    },
    notes: "Pigmentos especiais ultrafinos para telas monocromáticas de alta resolução (8K a 14K).",
  },
  {
    id: "elegoo-abs-like-v2",
    manufacturerBrand: "Elegoo",
    name: "Elegoo ABS-Like Resin V2",
    category: "OTHER",
    specificType: "Resina Resistente ao Impacto (ABS-Like)",
    technology: "SLA",
    defaultColorHex: "#1e293b",
    defaultColorName: "Preto Fosco",
    shelfLifeMonths: 18,
    properties: {
      densityGcm3: 1.14,
      tensileStrengthMpa: "50 - 58 MPa",
      flexuralModulusMpa: "2200 - 2600 MPa",
      impactStrengthKjm2: "35 - 45 J/m (2.5x mais resistente à quebra)",
      heatDeflectionTempC: "72°C",
      elongationAtBreak: "25% - 30%",
      hardnessShore: "84D",
    },
    printProfile: {
      nozzleTempRangeC: "N/A",
      recommendedNozzleTempC: 0,
      bedTempRangeC: "N/A",
      recommendedBedTempC: 0,
      exposureTimeSec: "2.2s - 3.2s",
      bottomExposureTimeSec: "25s - 35s",
      layerHeightMm: "0.05 mm",
      coolingFanPercent: "N/A",
      enclosureRequired: "Ambiente ventilado",
      dryingRecommendation: "Lavagem IPA e cura UV de 5 min",
      recommendedSlicers: ["ChituBox", "Lychee"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: false,
      isoStandards: ["ISO 9001"],
      tdsUrl: "https://elegoo.com/tds/abs-like-v2.pdf",
      sdsUrl: "https://elegoo.com/sds/abs-like-v2.pdf",
    },
    notes: "Ideal para peças funcionais e dobradiças mecânicas que não quebram ao cair.",
  },

  // ------------------------------------------
  // SIRAYA TECH (RESINAS DE ENGENHARIA)
  // ------------------------------------------
  {
    id: "siraya-fast-abs",
    manufacturerBrand: "Siraya Tech",
    name: "Siraya Tech Fast (ABS-Like)",
    category: "OTHER",
    specificType: "Resina Rápida de Alta Precisão",
    technology: "SLA",
    defaultColorHex: "#475569",
    defaultColorName: "Navy Grey",
    shelfLifeMonths: 24,
    properties: {
      densityGcm3: 1.13,
      tensileStrengthMpa: "42 MPa",
      flexuralModulusMpa: "1600 MPa",
      impactStrengthKjm2: "22 J/m",
      heatDeflectionTempC: "65°C",
      elongationAtBreak: "18%",
      hardnessShore: "82D",
    },
    printProfile: {
      nozzleTempRangeC: "N/A",
      recommendedNozzleTempC: 0,
      bedTempRangeC: "N/A",
      recommendedBedTempC: 0,
      exposureTimeSec: "1.8s - 2.4s",
      bottomExposureTimeSec: "20s - 28s",
      layerHeightMm: "0.05 mm",
      coolingFanPercent: "N/A",
      enclosureRequired: "Temperatura ideal 25°C+",
      dryingRecommendation: "Lavar com álcool etílico ou IPA por 2 minutos",
      recommendedSlicers: ["ChituBox", "Lychee"],
    },
    certifications: {
      rohs: true,
      reach: true,
      fdaFoodContact: false,
      isoStandards: ["ISO 9001"],
      tdsUrl: "https://siraya.tech/pages/fast-user-guide",
      sdsUrl: "https://siraya.tech/pages/sds",
    },
    notes:
      "A resina mais elogiada por profissionais pelo baixo odor, fácil lavagem e alta velocidade de cura.",
  },
];

// ==========================================
// FUNÇÕES UTILITÁRIAS
// ==========================================

export function getAllMaterialManufacturers(): MaterialManufacturer[] {
  return MATERIAL_MANUFACTURERS;
}

export function getAllMaterialBrands(): string[] {
  return MATERIAL_MANUFACTURERS.map((m) => m.brand);
}

export function getMaterialsByBrand(brand: string): MaterialItem[] {
  const clean = (brand || "").trim().toLowerCase();
  return MATERIAL_DATABASE.filter((item) => item.manufacturerBrand.toLowerCase() === clean);
}

export function findMaterialDatabaseItem(
  brand?: string | null,
  materialTypeOrName?: string | null,
): MaterialItem | undefined {
  if (!brand && !materialTypeOrName) return undefined;
  const b = (brand || "").trim().toLowerCase();
  const m = (materialTypeOrName || "").trim().toLowerCase();

  // 1. Busca exata de marca e nome/tipo
  const exact = MATERIAL_DATABASE.find(
    (item) =>
      item.manufacturerBrand.toLowerCase() === b &&
      (item.name.toLowerCase() === m || item.specificType.toLowerCase() === m),
  );
  if (exact) return exact;

  // 2. Busca aproximada por marca
  if (b) {
    const brandMatches = MATERIAL_DATABASE.filter(
      (item) => item.manufacturerBrand.toLowerCase() === b,
    );
    if (brandMatches.length > 0) {
      if (m) {
        const subMatch = brandMatches.find(
          (item) =>
            item.name.toLowerCase().includes(m) ||
            m.includes(item.name.toLowerCase()) ||
            item.category.toLowerCase() === m ||
            item.specificType.toLowerCase().includes(m),
        );
        if (subMatch) return subMatch;
      }
      return brandMatches[0];
    }
  }

  // 3. Fallback: Busca genérica pela categoria (ex: "PLA", "PETG", "RESINA")
  if (m) {
    const genericFallback = MATERIAL_DATABASE.find(
      (item) =>
        item.manufacturerBrand === "Genérico" &&
        (item.category.toLowerCase() === m ||
          item.name.toLowerCase().includes(m) ||
          (m.includes("resin") && item.technology === "SLA")),
    );
    if (genericFallback) return genericFallback;
  }

  return undefined;
}

export function searchMaterials(query: string): MaterialItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return MATERIAL_DATABASE;
  return MATERIAL_DATABASE.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.manufacturerBrand.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.specificType.toLowerCase().includes(q) ||
      item.technology.toLowerCase().includes(q),
  );
}
