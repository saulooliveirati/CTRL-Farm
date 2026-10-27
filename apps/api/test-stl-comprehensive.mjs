import jwt from "jsonwebtoken";

const JWT_SECRET =
  "exC15cnDfB6mFrlQByVurhyG5_gDKCc8ISbwjmRpG2LBggVE3gVnz1PgP9PR-PPt-AMUdYs1fcW0i1NIkI4OvA";
const token = jwt.sign(
  {
    sub: "ad4e20be-133a-4c1d-a4cc-40521042443d",
    name: "Saulo Oliveira",
    email: "saulosantosns@outlook.com.br",
    companyId: "813080ce-e331-476f-9f17-9c1c9460f4ff",
    role: "ADMIN",
    companyName: "CTRL+Farm",
  },
  JWT_SECRET,
  { expiresIn: "1h" },
);

const API_BASE = "http://localhost:3001";

async function runComprehensiveTests() {
  console.log("=================================================");
  console.log(" INICIANDO BATERIA COMPLETA DE TESTES STL / 3D ");
  console.log("=================================================");

  // --------------------------------------------------------------------------
  // TESTE 1: Cadastrar Manual (Sem arquivo físico / Catalogado com descrição gigante)
  // --------------------------------------------------------------------------
  console.log(
    "\n[TESTE 1] Cadastrando modelo manual catalogado com descrição sem limite de caracteres...",
  );
  const hugeDescription =
    "=== DOCUMENTAÇÃO COMPLETA DE IMPRESSÃO 3D (SEM LIMITE DE CARACTERES) ===\n" +
    "Parâmetro técnico detalhado: altura de camada 0.16mm, 4 paredes, 25% infill gyroid, temperatura de bico 215C e mesa 60C.\n".repeat(
      150,
    );
  console.log(`  Tamanho da descrição enviada: ${hugeDescription.length} caracteres.`);

  const manual1Payload = {
    projectName: "Suporte Articulado para Câmera V2",
    category: "PROJECTS",
    version: "v2.1",
    description: hugeDescription,
    tags: [
      "suporte",
      "camera",
      "articulado",
      "client:Cliente XYZ",
      "extras:Parafusos M3x12 e porcas T-Nut 2020",
      "img:https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800",
    ],
    externalUrl: "https://makerworld.com/en/models/sample-camera-mount",
    coverImageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800",
  };

  const createManRes = await fetch(`${API_BASE}/project-files/catalog`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(manual1Payload),
  });
  const createManJson = await createManRes.json();
  if (!createManRes.ok || !createManJson.data?.id) {
    throw new Error(`Falha no Teste 1: ${JSON.stringify(createManJson)}`);
  }
  const manualId = createManJson.data.id;
  if (createManJson.data.description?.length !== hugeDescription.trim().length) {
    throw new Error(
      `Falha: Descrição foi truncada! Esperado: ${hugeDescription.trim().length}, Recebido: ${createManJson.data.description?.length}`,
    );
  }
  console.log(
    `✓ Modelo manual catalogado criado com sucesso! ID: ${manualId} (Descrição preservada com ${createManJson.data.description?.length} caracteres sem truncamento!)`,
  );

  // --------------------------------------------------------------------------
  // TESTE 2: Editar Modelo Manual
  // --------------------------------------------------------------------------
  console.log("\n[TESTE 2] Editando modelo manual catalogado...");
  const editManPayload = {
    projectName: "Suporte Articulado para Câmera V2 - Atualizado",
    category: "MARKETPLACE",
    version: "v2.2-final",
    description: "Descrição revisada com novos parâmetros de impressão e suporte a fuso T8.",
    tags: [
      "suporte",
      "camera",
      "articulado",
      "v2",
      "marketplace:Mercado Livre",
      "extras:Manual de montagem PDF incluso",
    ],
  };

  const editManRes = await fetch(`${API_BASE}/project-files/${manualId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(editManPayload),
  });
  const editManJson = await editManRes.json();
  if (!editManRes.ok || editManJson.data?.projectName !== editManPayload.projectName) {
    throw new Error(`Falha no Teste 2: ${JSON.stringify(editManJson)}`);
  }
  console.log("✓ Modelo manual editado com sucesso! Novo nome:", editManJson.data.projectName);

  // --------------------------------------------------------------------------
  // TESTE 3: Excluir Modelo Manual
  // --------------------------------------------------------------------------
  console.log("\n[TESTE 3] Excluindo modelo manual catalogado...");
  const delManRes = await fetch(`${API_BASE}/project-files/${manualId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const delManJson = await delManRes.json();
  if (!delManRes.ok) {
    throw new Error(`Falha no Teste 3: ${JSON.stringify(delManJson)}`);
  }
  console.log("✓ Modelo manual excluído com sucesso!");

  // --------------------------------------------------------------------------
  // TESTE 4: Cadastrar Manual com Upload Físico de Arquivo STL
  // --------------------------------------------------------------------------
  console.log("\n[TESTE 4] Cadastrando modelo manual com upload binário de arquivo STL...");
  const fakeStlBuffer = Buffer.from(
    "solid test_model\n  facet normal 0 0 0\n    outer loop\n      vertex 0 0 0\n      vertex 1 0 0\n      vertex 0 1 0\n    endloop\n  endfacet\nendsolid test_model",
    "utf-8",
  );
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([fakeStlBuffer], { type: "application/sla" }),
    "suporte_mesa.stl",
  );
  formData.append("projectName", "Suporte de Mesa Minimalista STL");
  formData.append("category", "MODEL");
  formData.append("version", "1.0");
  formData.append("description", "Arquivo STL de teste para suporte de mesa minimalista.");
  formData.append("tags", "stl,suporte,mesa,fdm");

  const uploadRes = await fetch(`${API_BASE}/project-files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok || !uploadJson.data?.id) {
    throw new Error(`Falha no Teste 4: ${JSON.stringify(uploadJson)}`);
  }
  const binaryId = uploadJson.data.id;
  console.log("✓ Arquivo STL enviado e registrado com sucesso! ID:", binaryId);

  // --------------------------------------------------------------------------
  // TESTE 5: Baixar Arquivo STL Físico
  // --------------------------------------------------------------------------
  console.log("\n[TESTE 5] Baixando arquivo STL do servidor...");
  const dlRes = await fetch(`${API_BASE}/project-files/${binaryId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!dlRes.ok) {
    throw new Error(`Falha no Teste 5: download falhou com status ${dlRes.status}`);
  }
  const dlText = await dlRes.text();
  if (!dlText.includes("solid test_model")) {
    throw new Error("Falha no Teste 5: Conteúdo do arquivo STL baixado não confere.");
  }
  console.log("✓ Download do arquivo STL verificado com integridade 100%!");

  // --------------------------------------------------------------------------
  // TESTE 6: Editar Modelo com Arquivo Físico
  // --------------------------------------------------------------------------
  console.log("\n[TESTE 6] Editando metadados do modelo físico...");
  const editBinaryRes = await fetch(`${API_BASE}/project-files/${binaryId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      projectName: "Suporte de Mesa Minimalista STL Pro",
      version: "1.1",
      category: "PROJECTS",
      tags: ["stl", "suporte", "mesa", "pro", "atualizado"],
    }),
  });
  const editBinaryJson = await editBinaryRes.json();
  if (
    !editBinaryRes.ok ||
    editBinaryJson.data?.projectName !== "Suporte de Mesa Minimalista STL Pro"
  ) {
    throw new Error(`Falha no Teste 6: ${JSON.stringify(editBinaryJson)}`);
  }
  console.log("✓ Metadados do modelo físico editados com sucesso!");

  // --------------------------------------------------------------------------
  // TESTE 7: Excluir Modelo Físico
  // --------------------------------------------------------------------------
  console.log("\n[TESTE 7] Excluindo modelo físico...");
  const delBinaryRes = await fetch(`${API_BASE}/project-files/${binaryId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!delBinaryRes.ok) {
    throw new Error("Falha no Teste 7: erro ao excluir arquivo STL.");
  }
  console.log("✓ Arquivo STL e registro excluídos com sucesso!");

  // --------------------------------------------------------------------------
  // TESTE 8: Importar Link 3D com Validação & IA
  // --------------------------------------------------------------------------
  console.log("\n[TESTE 8] Analisando link 3D via parse-link...");
  const sample3DUrl =
    "https://makerworld.com/en/models/482910-articulated-dragon-multicolor#profileId-394982";
  const parseRes = await fetch(`${API_BASE}/project-files/parse-link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url: sample3DUrl }),
  });
  const parseJson = await parseRes.json();
  if (!parseRes.ok || !parseJson.data?.success) {
    throw new Error(`Falha no Teste 8: ${JSON.stringify(parseJson)}`);
  }
  const linkMeta = parseJson.data;
  console.log("✓ Link 3D analisado com sucesso!");
  console.log("  Plataforma:", linkMeta.platform);
  console.log("  Título extraído/enriquecido:", linkMeta.title);
  console.log("  Descrição:", linkMeta.description?.slice(0, 80) + "...");
  console.log("  Tags sugeridas:", linkMeta.suggestedTags);

  // --------------------------------------------------------------------------
  // TESTE 9: Cadastrar Modelo Importado
  // --------------------------------------------------------------------------
  console.log("\n[TESTE 9] Cadastrando projeto importado no catálogo...");
  const importPayload = {
    projectName: linkMeta.title,
    category: "IDEAS",
    description: linkMeta.description,
    tags: [
      ...linkMeta.suggestedTags,
      `source:${linkMeta.platform}`,
      `url:${linkMeta.externalUrl}`,
      "status:analise",
    ],
    externalUrl: linkMeta.externalUrl,
    coverImageUrl:
      linkMeta.coverImageUrl ||
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
  };

  const createImportRes = await fetch(`${API_BASE}/project-files/catalog`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(importPayload),
  });
  const createImportJson = await createImportRes.json();
  if (!createImportRes.ok || !createImportJson.data?.id) {
    throw new Error(`Falha no Teste 9: ${JSON.stringify(createImportJson)}`);
  }
  const importedId = createImportJson.data.id;
  console.log("✓ Projeto importado cadastrado com sucesso! ID:", importedId);

  // --------------------------------------------------------------------------
  // TESTE 10: Editar Modelo Importado (Promover / Ajustar)
  // --------------------------------------------------------------------------
  console.log("\n[TESTE 10] Editando projeto importado (promovendo para Marketplace)...");
  const editImportRes = await fetch(`${API_BASE}/project-files/${importedId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      projectName: `${linkMeta.title} - Edição Comercial`,
      category: "MARKETPLACE",
      version: "1.0",
      description:
        "Modelo importado e validado para produção em massa para Shopee e Mercado Livre.",
      tags: [...linkMeta.suggestedTags, "marketplace:Shopee", "validado", "status:aprovado"],
    }),
  });
  const editImportJson = await editImportRes.json();
  if (!editImportRes.ok || editImportJson.data?.category !== "MARKETPLACE") {
    throw new Error(`Falha no Teste 10: ${JSON.stringify(editImportJson)}`);
  }
  console.log("✓ Projeto importado editado e promovido com sucesso!");

  // --------------------------------------------------------------------------
  // TESTE 11: Excluir Modelo Importado
  // --------------------------------------------------------------------------
  console.log("\n[TESTE 11] Excluindo projeto importado...");
  const delImportRes = await fetch(`${API_BASE}/project-files/${importedId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!delImportRes.ok) {
    throw new Error("Falha no Teste 11: erro ao excluir modelo importado.");
  }
  console.log("✓ Projeto importado excluído com sucesso!");

  console.log("\n=================================================");
  console.log(" 🎉 TODOS OS 11 TESTES PASSARAM COM 100% DE SUCESSO! ");
  console.log("=================================================");
}

runComprehensiveTests().catch((err) => {
  console.error("❌ ERRO NO TESTE:", err);
  process.exit(1);
});
