import bcrypt from "bcryptjs";

const hash = "$2b$12$cHVzariJsZbmuTsLjBsMveJ.eeC4ZIEGEcWBLxzCtBQfI4d8h8Uqa";
const password = "sbtit123";

async function check() {
  const match = await bcrypt.compare(password, hash);
  console.log(`Password "sbtit123" matches hash: ${match}`);
}

check();
