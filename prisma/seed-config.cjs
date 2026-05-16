const SEED_ACCOUNT_DEFINITIONS = [
  { key: "admin", role: "admin", usernameEnv: "ADMIN_USERNAME", passwordEnv: "ADMIN_PASSWORD" },
  { key: "hrd", role: "hrd", usernameEnv: "HRD_USERNAME", passwordEnv: "HRD_PASSWORD" },
  { key: "atasan", role: "manager", usernameEnv: "ATASAN_USERNAME", passwordEnv: "ATASAN_PASSWORD" },
];

function requiredEnv(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured in .env.`);
  return value;
}

function getSeedAccounts(env = process.env) {
  return SEED_ACCOUNT_DEFINITIONS.map((definition) => ({
    key: definition.key,
    role: definition.role,
    username: requiredEnv(env, definition.usernameEnv),
    password: requiredEnv(env, definition.passwordEnv),
  }));
}

module.exports = { getSeedAccounts };
