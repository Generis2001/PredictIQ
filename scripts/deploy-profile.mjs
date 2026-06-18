import { readFileSync, writeFileSync } from "fs";
import { scryptSync, createDecipheriv } from "crypto";
import { keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RPC = "https://studio.genlayer.com/api";

function decryptKeystore(keystorePath, password) {
  const ks = JSON.parse(readFileSync(keystorePath, "utf8"));
  const kdfp = ks.Crypto.kdfparams;
  const salt = Buffer.from(kdfp.salt, "hex");
  const dk = scryptSync(Buffer.from(password, "utf8"), salt, kdfp.dklen, {
    N: kdfp.n, r: kdfp.r, p: kdfp.p, maxmem: 256 * 1024 * 1024,
  });
  const macInput = Buffer.concat([dk.slice(16, 32), Buffer.from(ks.Crypto.ciphertext, "hex")]);
  const mac = keccak256(macInput).slice(2);
  if (mac !== ks.Crypto.mac) throw new Error("Invalid password");
  const iv = Buffer.from(ks.Crypto.cipherparams.iv, "hex");
  const decipher = createDecipheriv("aes-128-ctr", dk.slice(0, 16), iv);
  const pk = Buffer.concat([decipher.update(Buffer.from(ks.Crypto.ciphertext, "hex")), decipher.final()]);
  return "0x" + pk.toString("hex");
}

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "genlayer-js/1.1.8" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
  });
  const body = await res.json();
  if (body.error) throw new Error(`RPC ${method} error: ${JSON.stringify(body.error)}`);
  return body.result;
}

async function pollFinalized(hash) {
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const tx = await rpc("eth_getTransactionByHash", [hash]);
    if (!tx) continue;
    process.stdout.write(`\r  status: ${tx.status}          `);
    if (tx.status === "FINALIZED" || tx.status === "ACCEPTED") {
      const addr = tx?.data?.contract_address;
      if (!addr) throw new Error("Finalized but no contract_address");
      console.log(`\n  address: ${addr}`);
      return addr;
    }
    if (tx.status === "CANCELED" || tx.status === "UNDETERMINED") {
      const err = tx?.consensus_data?.leader_receipt?.[0]?.result;
      throw new Error(`Transaction ${tx.status}: ${JSON.stringify(err)}`);
    }
  }
  throw new Error("Timeout after 10 min");
}

async function main() {
  console.log("Decrypting keystore...");
  const privateKey = decryptKeystore("/tmp/deployer-keystore.json", "suisgeneris2001");
  const account = privateKeyToAccount(privateKey);
  console.log(`  account: ${account.address}`);

  const { createClient, createAccount } = await import("genlayer-js");
  const { studionet } = await import("genlayer-js/chains");
  const gl = createClient({ chain: studionet, account: createAccount(privateKey) });

  const contractPath = path.join(__dirname, "../contracts/UserProfile.py");
  const code = readFileSync(contractPath, "utf8");

  console.log("\nDeploying UserProfile.py...");
  const hash = await gl.deployContract({ code, args: [], value: BigInt(0) });
  console.log(`  tx: ${hash}`);
  console.log(`  polling...`);
  const userProfileAddress = await pollFinalized(hash);

  // Append to .env.local without overwriting existing vars
  const envPath = path.join(__dirname, "../.env.local");
  let existing = "";
  try { existing = readFileSync(envPath, "utf8"); } catch {}
  const filtered = existing.split("\n").filter(l => !l.startsWith("NEXT_PUBLIC_USER_PROFILE_ADDRESS")).join("\n");
  writeFileSync(envPath, filtered.trimEnd() + `\nNEXT_PUBLIC_USER_PROFILE_ADDRESS=${userProfileAddress}\n`, "utf8");

  console.log("\n=== Done ===");
  console.log(`UserProfile: ${userProfileAddress}`);
  console.log(".env.local updated.");
}

main().catch(e => { console.error("\nFailed:", e.message); process.exit(1); });
