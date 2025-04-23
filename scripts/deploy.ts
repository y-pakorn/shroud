import { Transaction } from "@mysten/sui/transactions";
import path from "node:path";
import { execSync } from "node:child_process";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import fs from "fs/promises";
import { fromHex } from "viem";

const client = new SuiClient({
  url: getFullnodeUrl("devnet"),
});
const secretKey = decodeSuiPrivateKey(process.env.PRIVATE_KEY || "").secretKey;
const keypair = Ed25519Keypair.fromSecretKey(secretKey);
const coins = [
  "{pkg}::usdc::USDC",
  "{pkg}::usdt::USDT",
  "{pkg}::btc::BTC",
  "{pkg}::eth::ETH",
  "{pkg}::wal::WAL",
];

(async () => {
  console.log(`Publishing and creating core on devnet`);

  const contractURI = path.resolve(__dirname, "../", "./contracts");
  const { modules, dependencies } = JSON.parse(
    execSync(`sui move build --dump-bytecode-as-base64 --path ${contractURI}`, {
      encoding: "utf-8",
    })
  );

  const tx = new Transaction();
  const uc = tx.publish({ modules, dependencies });
  tx.transferObjects([uc], keypair.getPublicKey().toSuiAddress());

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });

  const receipt = await client.waitForTransaction({
    digest: result.digest,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  const packageId = receipt.objectChanges?.find(
    (o) => o.type === "published"
  )?.packageId;
  const shroudId = (
    receipt.objectChanges?.find(
      (o) =>
        o.type === "created" && o.objectType === `${packageId}::core::Shroud`
    ) as any
  ).objectId;
  const adminCap = (
    receipt.objectChanges?.find(
      (o) =>
        o.type === "created" &&
        o.objectType === `${packageId}::core::ShroudAdmin`
    ) as any
  ).objectId;
  const upgradeCap = (
    receipt.objectChanges?.find(
      (o) => o.type === "created" && o.objectType === `0x2::package::UpgradeCap`
    ) as any
  ).objectId;

  const usdcCap = (
    receipt.objectChanges?.find(
      (o) =>
        o.type === "created" &&
        o.objectType === `0x2::coin::TreasuryCap<${packageId}::usdc::USDC>`
    ) as any
  ).objectId;
  const usdtCap = (
    receipt.objectChanges?.find(
      (o) =>
        o.type === "created" &&
        o.objectType === `0x2::coin::TreasuryCap<${packageId}::usdt::USDT>`
    ) as any
  ).objectId;
  const btcCap = (
    receipt.objectChanges?.find(
      (o) =>
        o.type === "created" &&
        o.objectType === `0x2::coin::TreasuryCap<${packageId}::btc::BTC>`
    ) as any
  ).objectId;
  const ethCap = (
    receipt.objectChanges?.find(
      (o) =>
        o.type === "created" &&
        o.objectType === `0x2::coin::TreasuryCap<${packageId}::eth::ETH>`
    ) as any
  ).objectId;
  const walCap = (
    receipt.objectChanges?.find(
      (o) =>
        o.type === "created" &&
        o.objectType === `0x2::coin::TreasuryCap<${packageId}::wal::WAL>`
    ) as any
  ).objectId;
  console.log("Publish tx hash:", result.digest);
  console.log("Package ID:", packageId);
  console.log("Shroud ID:", shroudId);
  console.log("Admin Cap:", adminCap);
  console.log("Upgrade Cap:", upgradeCap);

  const txb = new Transaction();

  const vk_hex = await fs.readFile("../circuits_rust/vk.hex.bin", "utf-8");

  txb.moveCall({
    target: `${packageId}::core::initialize_prover`,
    arguments: [
      txb.object(adminCap),
      txb.object(shroudId),
      txb.pure.vector("u8", fromHex(`0x${vk_hex}`, "bytes")),
    ],
  });

  for (const coin of coins) {
    txb.moveCall({
      target: `${packageId}::core::allow_token`,
      arguments: [txb.object(adminCap), txb.object(shroudId)],
      typeArguments: [coin.replace("{pkg}", packageId!)],
    });
  }

  txb.moveCall({
    target: `${packageId}::router::create_router`,
    arguments: [
      txb.object(usdcCap),
      txb.object(usdtCap),
      txb.object(btcCap),
      txb.object(ethCap),
      txb.object(walCap),
    ],
  });

  const createResult = await client.signAndExecuteTransaction({
    transaction: txb,
    signer: keypair,
  });

  const createReceipt = await client.waitForTransaction({
    digest: createResult.digest,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  const routerId = (
    createReceipt.objectChanges?.find(
      (o) =>
        o.type === "created" && o.objectType === `${packageId}::router::Router`
    ) as any
  ).objectId;

  console.log(
    "Create shroud + prover & Allow token tx hash:",
    createResult.digest
  );
  console.log("Router ID:", routerId);
})();
