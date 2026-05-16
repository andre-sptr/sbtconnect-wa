const SEED_ACCOUNT_DEFINITIONS = [
  { key: "admin", role: "admin", usernameEnv: "ADMIN_USERNAME", passwordEnv: "ADMIN_PASSWORD" },
  { key: "hrd", role: "hrd", usernameEnv: "HRD_USERNAME", passwordEnv: "HRD_PASSWORD" },
  { key: "atasan", role: "manager", usernameEnv: "ATASAN_USERNAME", passwordEnv: "ATASAN_PASSWORD" },
];

function getSeedAccounts(env = process.env) {
  return SEED_ACCOUNT_DEFINITIONS.map((definition) => ({
    key: definition.key,
    role: definition.role,
    username: env[definition.usernameEnv]?.trim(),
    password: env[definition.passwordEnv]?.trim(),
  })).filter((acc) => acc.username && acc.password);
}

module.exports = { getSeedAccounts };
