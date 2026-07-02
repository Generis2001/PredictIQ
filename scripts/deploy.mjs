import { existsSync, readFileSync, writeFileSync } from "fs";
import { scryptSync, createDecipheriv } from "crypto";
import { keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RPC = "https://studio.genlayer.com/api";
const HEADERS = { "Content-Type": "application/json", "User-Agent": "genlayer-js/1.1.8" };

function loadEnv(envPath) {
  try {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
}

function readEnvFile(envPath) {
  const values = {};
  try {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) values[match[1]] = match[2];
    }
  } catch {}
  return values;
}

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

function resolvePrivateKey() {
  loadEnv(path.join(__dirname, "../.env.local"));

  const rawPrivateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (rawPrivateKey) {
    return rawPrivateKey.startsWith("0x") ? rawPrivateKey : `0x${rawPrivateKey}`;
  }

  const keystorePath = process.env.DEPLOYER_KEYSTORE_PATH?.trim();
  const keystorePassword = process.env.DEPLOYER_KEYSTORE_PASSWORD;
  if (keystorePath || keystorePassword) {
    if (!keystorePath) {
      throw new Error("DEPLOYER_KEYSTORE_PATH is required when using DEPLOYER_KEYSTORE_PASSWORD");
    }
    if (!keystorePassword) {
      throw new Error("DEPLOYER_KEYSTORE_PASSWORD is required when using DEPLOYER_KEYSTORE_PATH");
    }
    if (!existsSync(keystorePath)) {
      throw new Error(`Keystore not found at ${keystorePath}`);
    }
    return decryptKeystore(keystorePath, keystorePassword);
  }

  throw new Error(
    "Missing deployer credentials. Set DEPLOYER_PRIVATE_KEY, or set DEPLOYER_KEYSTORE_PATH and DEPLOYER_KEYSTORE_PASSWORD."
  );
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
      if (!addr) throw new Error("Finalized but no contract_address in tx.data");
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

async function pollTx(hash) {
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const tx = await rpc("eth_getTransactionByHash", [hash]);
    if (!tx) continue;
    process.stdout.write(`\r  status: ${tx.status}          `);
    if (tx.status === "FINALIZED" || tx.status === "ACCEPTED") {
      console.log("");
      return;
    }
    if (tx.status === "CANCELED" || tx.status === "UNDETERMINED") {
      const err = tx?.consensus_data?.leader_receipt?.[0]?.result;
      throw new Error(`Transaction ${tx.status}: ${JSON.stringify(err)}`);
    }
  }
  throw new Error("Timeout after 10 min");
}

async function deployContract(privateKey, contractPath, args = []) {
  const name = path.basename(contractPath);
  const code = readFileSync(contractPath, "utf8");

  const { createClient, createAccount } = await import("genlayer-js");
  const { studionet } = await import("genlayer-js/chains");

  const gl = createClient({ chain: studionet, account: createAccount(privateKey) });

  console.log(`\nDeploying ${name}...`);
  const hash = await gl.deployContract({ code, args, value: BigInt(0) });
  console.log(`  tx: ${hash}`);
  return await pollFinalized(hash);
}

async function callContract(privateKey, contractAddress, functionName, args) {
  const { createClient, createAccount } = await import("genlayer-js");
  const { studionet } = await import("genlayer-js/chains");

  const gl = createClient({ chain: studionet, account: createAccount(privateKey) });

  console.log(`\nCalling ${functionName}...`);
  const hash = await gl.writeContract({
    address: contractAddress,
    functionName,
    args,
    value: BigInt(0),
  });
  console.log(`  tx: ${hash}`);
  await pollTx(hash);
}

async function main() {
  const currentEnv = readEnvFile(path.join(__dirname, "../.env.local"));
  const privateKey = resolvePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const deployerAddr = account.address.toLowerCase();
  console.log(`  account: ${account.address}`);

  const contractsDir = path.join(__dirname, "../contracts");

  // Deploy MarketFactory first, using the deployer address as a temporary
  // resolver placeholder. This lets us call set_resolver after the real
  // resolver is deployed, resolving the circular dependency.
  const factoryAddress = await deployContract(
    privateKey,
    path.join(contractsDir, "MarketFactory.py"),
    [deployerAddr]
  );

  const resolverAddress = await deployContract(
    privateKey,
    path.join(contractsDir, "PredictIQResolver.py"),
    [factoryAddress]
  );

  const rewardDistributorAddress = await deployContract(
    privateKey,
    path.join(contractsDir, "RewardDistributor.py"),
    [factoryAddress]
  );

  // Wire the real resolver into the factory now that we know its address
  await callContract(privateKey, factoryAddress, "set_resolver", [resolverAddress]);
  console.log(`  resolver wired: ${resolverAddress}`);

  const userProfileAddress = currentEnv.NEXT_PUBLIC_USER_PROFILE_ADDRESS ?? "";
  const deployerKey = currentEnv.DEPLOYER_PRIVATE_KEY ?? privateKey;

  const envContent = `# GenLayer StudioNet Contract Addresses
NEXT_PUBLIC_MARKET_FACTORY_ADDRESS=${factoryAddress}
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=${factoryAddress}
NEXT_PUBLIC_RESOLVER_ADDRESS=${resolverAddress}
NEXT_PUBLIC_REWARD_DISTRIBUTOR_ADDRESS=${rewardDistributorAddress}
NEXT_PUBLIC_USER_PROFILE_ADDRESS=${userProfileAddress}
DEPLOYER_PRIVATE_KEY=${deployerKey}
`;
  writeFileSync(path.join(__dirname, "../.env.local"), envContent, "utf8");

  console.log("\n=== Deployment complete ===");
  console.log(`MarketFactory:      ${factoryAddress}`);
  console.log(`PredictIQResolver:  ${resolverAddress}`);
  console.log(`RewardDistributor:  ${rewardDistributorAddress}`);
  console.log(`UserProfile:        ${userProfileAddress} (unchanged)`);
  console.log("\n.env.local updated.");
}

main().catch(e => { console.error("\nFailed:", e.message); process.exit(1); });
