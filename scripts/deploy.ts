import { Transaction } from "@mysten/sui/transactions";
import path from "node:path";
import { execSync } from "node:child_process";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import fs from "fs/promises";
import { fromHex } from "viem";

const client = new SuiClient({
  url: getFullnodeUrl("testnet"),
});
const secretKey = decodeSuiPrivateKey(process.env.PRIVATE_KEY || "").secretKey;
const keypair = Ed25519Keypair.fromSecretKey(secretKey);
const coins = [
  "0x2::sui::SUI",
  "0xea10912247c015ead590e481ae8545ff1518492dee41d6d03abdad828c1d2bde::usdc::USDC",
  "0xea10912247c015ead590e481ae8545ff1518492dee41d6d03abdad828c1d2bde::usdt::USDT",
  "0xea10912247c015ead590e481ae8545ff1518492dee41d6d03abdad828c1d2bde::wbtc::WBTC",
  "0xea10912247c015ead590e481ae8545ff1518492dee41d6d03abdad828c1d2bde::weth::WETH",
];

//Package ID: 0x20f50d3855a2fa1b570dcbcd96043230e9c4d46bfd8089a6da42ed9a96418805
//Admin Cap: 0x6ebfaa7f4dd450e9ae4df459db85e85afcb63b454cd4205e19e81dcbdea41f26
//Upgrade Cap: 0x61f52fe3da1df98ce79f7ae9b1119ee87fba314de4d78beaa4b5de5b04d0a406

(async () => {
  //   console.log(`Publishing and creating core on testnet`);

  //   const contractURI = path.resolve(__dirname, "../", "./contracts");
  //   const { modules, dependencies } = JSON.parse(
  //     execSync(`sui move build --dump-bytecode-as-base64 --path ${contractURI}`, {
  //       encoding: "utf-8",
  //     })
  //   );

  //   const tx = new Transaction();
  //   const uc = tx.publish({ modules, dependencies });
  //   tx.transferObjects([uc], keypair.getPublicKey().toSuiAddress());

  //   const result = await client.signAndExecuteTransaction({
  //     transaction: tx,
  //     signer: keypair,
  //   });

  //   const receipt = await client.waitForTransaction({
  //     digest: result.digest,
  //     options: {
  //       showEffects: true,
  //       showObjectChanges: true,
  //     },
  //   });

  //   const packageId = receipt.objectChanges?.find(
  //     (o) => o.type === "published"
  //   )?.packageId;
  //   const adminCap = (
  //     receipt.objectChanges?.find(
  //       (o) =>
  //         o.type === "created" &&
  //         o.objectType === `${packageId}::core::ShroudAdmin`
  //     ) as any
  //   ).objectId;
  //   const upgradeCap = (
  //     receipt.objectChanges?.find(
  //       (o) => o.type === "created" && o.objectType === `0x2::package::UpgradeCap`
  //     ) as any
  //   ).objectId;

  //   console.log("Publish tx hash:", result.digest);
  //   console.log("Package ID:", packageId);
  //   console.log("Admin Cap:", adminCap);
  //   console.log("Upgrade Cap:", upgradeCap);

  const packageId =
    "0x20f50d3855a2fa1b570dcbcd96043230e9c4d46bfd8089a6da42ed9a96418805";
  const adminCap =
    "0x6ebfaa7f4dd450e9ae4df459db85e85afcb63b454cd4205e19e81dcbdea41f26";

  const txb = new Transaction();

  const [id] = txb.moveCall({
    target: `${packageId}::core::initialize`,
    arguments: [txb.object(adminCap)],
  });

  const vk_hex = await fs.readFile("../circuits_rust/vk.hex.bin", "utf-8");

  txb.moveCall({
    target: `${packageId}::core::initialize_prover`,
    arguments: [
      txb.object(id),
      txb.pure.vector("u8", fromHex(`0x${vk_hex}`, "bytes")),
    ],
  });

  txb.moveCall({
    target: `${packageId}::core::allow_token`,
  });

  for (const coin of coins) {
    txb.moveCall({
      target: `${packageId}::core::allow_token`,
      arguments: [txb.object(id)],
      typeArguments: [coin],
    });
  }

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

  const shroudId = (
    createReceipt.objectChanges?.find(
      (o) =>
        o.type === "created" && o.objectType === `${packageId}::core::Shroud`
    ) as any
  ).objectId;

  console.log("Create tx hash:", createResult.digest);
  console.log("Shroud ID:", shroudId);
})();
