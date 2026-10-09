export function validateEnvironment(
  config: Record<string, string | undefined>,
) {
  const jwtSecret = config.JWT_SECRET;

  if (
    !jwtSecret ||
    jwtSecret.length < 32 ||
    jwtSecret === "troque_esta_chave_por_uma_chave_forte"
  ) {
    throw new Error(
      "JWT_SECRET precisa ser uma chave secreta forte com pelo menos 32 caracteres.",
    );
  }

  return config;
}