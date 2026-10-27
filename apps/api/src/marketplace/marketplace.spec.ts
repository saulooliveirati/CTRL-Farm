import { describe, expect, it } from "vitest";
import { MarketplaceClassifierService } from "./marketplace-classifier.service.js";
import type { RawMarketplaceListing } from "./connectors/connector.interface.js";

describe("MarketplaceClassifierService", () => {
  const classifier = new MarketplaceClassifierService();

  it("deve classificar com sucesso um produto impresso em 3D", () => {
    const listing: RawMarketplaceListing = {
      source: "MERCADO_LIVRE",
      externalId: "TEST-01",
      externalUrl: "https://test.com",
      title: "Suporte Headset Gamer Mesa Base Pesada Impresso 3D PLA",
      currentPrice: 45.0,
      currency: "BRL",
      estimatedMonthlySales: 150,
      totalSalesCount: 1200,
      rating: 4.9,
      reviewsCount: 300,
    };

    const result = classifier.classifyAndEnrich(listing);

    expect(result.is3DPrinted).toBe(true);
    expect(result.aiConfidence).toBeGreaterThanOrEqual(0.9);
    expect(result.category3D).toBe("TOOLS_MOUNTS");
    expect(result.estimatedMaterial).toBe("PLA");
    expect(result.estimatedWeightG).toBeGreaterThan(0);
    expect(result.estimatedPrintTimeMinutes).toBeGreaterThan(0);
    expect(result.salesPotential).toBeGreaterThanOrEqual(70);
    expect(result.profitPotential).toBeGreaterThan(0);
    expect(result.recommendedPrinters.length).toBeGreaterThan(0);
  });

  it("deve estimar corretamente materiais técnicos como PETG em peças de reposição", () => {
    const listing: RawMarketplaceListing = {
      source: "SHOPEE",
      externalId: "TEST-02",
      externalUrl: "https://test.com",
      title: "Engrenagem Reforçada Batedeira Planetária 3D PETG Técnico Reposição",
      currentPrice: 35.0,
      currency: "BRL",
      estimatedMonthlySales: 80,
      totalSalesCount: 600,
      rating: 4.8,
      reviewsCount: 120,
    };

    const result = classifier.classifyAndEnrich(listing);

    expect(result.is3DPrinted).toBe(true);
    expect(result.category3D).toBe("REPLACEMENT_PARTS");
    expect(result.estimatedMaterial).toBe("PETG");
    expect(result.targetAudience).toContain("Oficinas");
  });

  it("deve identificar itens de alta complexidade e brinquedos articulados", () => {
    const listing: RawMarketplaceListing = {
      source: "TIKTOK_SHOP",
      externalId: "TEST-03",
      externalUrl: "https://test.com",
      title: "Dragão Articulado Fidget Toy Flexível Impresso 3D Multicor",
      currentPrice: 59.9,
      currency: "BRL",
      estimatedMonthlySales: 350,
      totalSalesCount: 4200,
      rating: 4.95,
      reviewsCount: 980,
    };

    const result = classifier.classifyAndEnrich(listing);

    expect(result.is3DPrinted).toBe(true);
    expect(result.category3D).toBe("FIDGET_TOYS");
    expect(result.manufacturingComplexity).toBe("HIGH");
    expect(result.trend).toBe("UP");
    expect(result.salesPotential).toBeGreaterThanOrEqual(85);
  });

  it("deve calcular viabilidade financeira com margens e lucros consistentes", () => {
    const listing: RawMarketplaceListing = {
      source: "MERCADO_LIVRE",
      externalId: "TEST-04",
      externalUrl: "https://test.com",
      title: "Vaso Decorativo Espiral Polígono 3D PLA",
      currentPrice: 42.0,
      currency: "BRL",
      estimatedMonthlySales: 120,
      totalSalesCount: 950,
      rating: 4.85,
      reviewsCount: 210,
    };

    const result = classifier.classifyAndEnrich(listing);

    expect(result.estimatedUnitCost).toBeGreaterThan(0);
    expect(result.estimatedNetProfit).toBeGreaterThan(0);
    expect(result.profitMarginPercent).toBeGreaterThan(0);
    expect(result.profitMarginPercent).toBeLessThan(100);
    expect(["EASY", "MODERATE"]).toContain(result.manufacturingEase);
  });
});
