// src/back/src/blockchain.ts
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { ethers } from "ethers";
import { db } from "./db/db";

// 1) Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// 2) RPC & provider
const RPC_URL = process.env.RPC_URL;
if (!RPC_URL) throw new Error("Missing AVALANCHE_RPC in .env");
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 3) Wallet signer
const PK = process.env.PRIVATE_KEY;
if (!PK) throw new Error("Missing PRIVATE_KEY in .env");
const wallet = new ethers.Wallet(PK, provider);

// 4) Load ABI
const artifact = JSON.parse(
  fs.readFileSync(
    path.resolve(
      __dirname,
      "../../../contracts/out/ScoreBoard.sol/ScoreBoard.json"
    ),
    "utf8"
  )
);
const abi = artifact.abi;

// 5) Instantiate contract
const SCOREBOARD_ADDRESS = process.env.SCOREBOARD_ADDRESS;
if (!SCOREBOARD_ADDRESS) throw new Error("Missing SCOREBOARD_ADDRESS in .env");
export const scoreboard = new ethers.Contract(
  SCOREBOARD_ADDRESS,
  abi,
  wallet
) as unknown as {
  submitScore(
    gameId: string,
    player: string,
    score: number,
    overrides?: ethers.TransactionRequest
  ): Promise<ethers.TransactionResponse>;
  getScores(gameId: string): Promise<Array<{ player: string; score: bigint }>>;
};

// 6) Internal pending‐nonce tracker
let _nextNonce: number | null = null;
async function getNextNonce(): Promise<number> {
  if (_nextNonce === null) {
    // fetch including pending txs
    _nextNonce = await provider.getTransactionCount(wallet.address, "pending");
  }
  const curr = _nextNonce;
  _nextNonce++;
  return curr;
}

// 7) submit a score, handing out unique nonces
export async function postScore(
  gameId: string,
  player: string,
  score: number,
  userId?: number
): Promise<string> {
  // Manual Ethereum address validation (bypass ethers.isAddress)
  const isValidEthAddress = (addr: string): boolean => {
    return typeof addr === "string" && /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  if (!isValidEthAddress(player)) {
    throw new Error("Invalid player address");
  }
  if (!Number.isInteger(score) || score < 0) {
    throw new Error("Score must be a non-negative integer");
  }
  const key = ethers.id(gameId); // keccak256 of UTF-8 bytes
  const nonce = await getNextNonce(); // unique, incremental
  const tx = await scoreboard.submitScore(key, player, score, { nonce });

  // Store transaction in database immediately after submission
  const timestamp = new Date().toISOString();
  db.run(
    `INSERT INTO \`Transaction\` (hash, game_id, player_address, userId, score, timestamp, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [tx.hash, gameId, player, userId || null, score, timestamp, "pending"]
  );

  // Wait for confirmation and update status
  const receipt = await tx.wait();
  if (receipt) {
    db.run(
      `UPDATE \`Transaction\` 
             SET status = ?, block_number = ?, gas_used = ?, gas_price = ? 
             WHERE hash = ?`,
      [
        "confirmed",
        receipt.blockNumber,
        receipt.gasUsed?.toString(),
        receipt.gasPrice?.toString(),
        tx.hash,
      ]
    );
  }

  return tx.hash;
}

// 8) fetch stored scores
export async function fetchScores(
  gameId: string
): Promise<Array<{ player: string; score: number }>> {
  const key = ethers.id(gameId);
  const raw = await scoreboard.getScores(key);
  return raw.map((r) => ({
    player: r.player,
    score: Number(r.score),
  }));
}
