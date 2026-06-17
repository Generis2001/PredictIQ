import { readFileSync, writeFileSync } from "fs";
import { scryptSync, createDecipheriv } from "crypto";
import { keccak256, toHex, encodePacked, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http } from "viem";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RPC = "https://studio.genlayer.com/api";
const HEADERS = { "Content-Type": "application/json", "User-Agent": "genlayer-js/1.1.8" };

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
    headers: HEADERS,
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

async function deployContract(privateKey, account, contractPath, args = []) {
  const name = path.basename(contractPath);
  const code = readFileSync(contractPath, "utf8");
  const codeHex = Buffer.from(code).toString("hex");

  // Get nonce
  const nonce = await rpc("eth_getTransactionCount", [account.address, "latest"]);

  // Build GenLayer deploy calldata using genlayer-js format
  // We send via gen_sendTransaction with the contract deploy format
  const payload = {
    jsonrpc: "2.0",
    method: "gen_sendTransaction",
    params: [{
      from: account.address,
      to: null,
      data: {
        contract_code: codeHex,
        calldata: Buffer.from(JSON.stringify({ args })).toString("hex"),
      },
      value: "0x0",
      nonce: nonce,
    }],
    id: 1,
  };

  // Sign and send using the genlayer-js SDK approach but with fetch
  // Actually: use the genlayer-js client just for signing/sending, handle polling ourselves
  const { createClient, createAccount } = await import("genlayer-js");
  const { studionet } = await import("genlayer-js/chains");
  const { TransactionStatus } = await import("genlayer-js/types");

  const gl = createClient({ chain: studionet, account: createAccount(privateKey) });

  console.log(`\nDeploying ${name}...`);
  const hash = await gl.deployContract({ code, args, value: BigInt(0) });
  console.log(`  tx: ${hash}`);
  console.log(`  polling...`);
  return await pollFinalized(hash);
}

async function main() {
  console.log("Decrypting keystore...");
  const privateKey = decryptKeystore("/tmp/deployer-keystore.json", "suisgeneris2001");
  const account = privateKeyToAccount(privateKey);
  console.log(`  account: ${account.address}`);

  const contractsDir = path.join(__dirname, "../contracts");

  // MarketFactory already deployed successfully
  const factoryAddress = "0xe3963263BB2529D13E65Ef43b9FdDf57768d9Ce2";
  console.log(`\nMarketFactory (reusing): ${factoryAddress}`);

  const resolverAddress = await deployContract(
    privateKey, account,
    path.join(contractsDir, "PredictIQResolver.py"),
    [factoryAddress]
  );

  const rewardDistributorAddress = await deployContract(
    privateKey, account,
    path.join(contractsDir, "RewardDistributor.py"),
    [factoryAddress]
  );

  const envContent = `# GenLayer StudioNet Contract Addresses
NEXT_PUBLIC_MARKET_FACTORY_ADDRESS=${factoryAddress}
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=${factoryAddress}
NEXT_PUBLIC_RESOLVER_ADDRESS=${resolverAddress}
NEXT_PUBLIC_REWARD_DISTRIBUTOR_ADDRESS=${rewardDistributorAddress}
`;
  writeFileSync(path.join(__dirname, "../.env.local"), envContent, "utf8");

  console.log("\n=== Deployment complete ===");
  console.log(`MarketFactory:      ${factoryAddress}`);
  console.log(`PredictIQResolver:  ${resolverAddress}`);
  console.log(`RewardDistributor:  ${rewardDistributorAddress}`);
  console.log("\n.env.local updated.");
}

main().catch(e => { console.error("\nFailed:", e.message); process.exit(1); });
