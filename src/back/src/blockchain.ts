// src/back/src/blockchain.ts

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables before reading process.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { ethers } from 'ethers';

// 1) Connect to Anvil via RPC
const RPC_URL = process.env.AVALANCHE_RPC;
if (!RPC_URL) {
  console.error('Missing AVALANCHE_RPC in env');
  process.exit(1);
}
const provider = new ethers.JsonRpcProvider(RPC_URL);

// 2) Create a signer wallet from your pre-funded key
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('Missing PRIVATE_KEY in env');
  process.exit(1);
}
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// 3) Load the compiled ABI
const abiPath = path.resolve(
  __dirname,
  '../../../contracts/out/ScoreBoard.sol/ScoreBoard.json'
);
const json = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
const abi = json.abi;

// 4) Instantiate the contract with narrowed typing
const SCOREBOARD_ADDRESS = process.env.SCOREBOARD_ADDRESS;
if (!SCOREBOARD_ADDRESS) {
  console.error('Missing SCOREBOARD_ADDRESS in env');
  process.exit(1);
}
export const scoreboard = new ethers.Contract(
  SCOREBOARD_ADDRESS,
  abi,
  wallet
) as unknown as {
  submitScore(
    gameId: string,
    player: string,
    score: number
  ): Promise<ethers.TransactionResponse>;
  getScores(
    gameId: string
  ): Promise<Array<{ player: string; score: bigint }>>;
};

// 5) Helper: submit a score on-chain
export async function postScore(
  gameId: string,
  player: string,
  score: number
): Promise<string> {
  if (!ethers.isAddress(player)) {
    throw new Error('Invalid player address');
  }
  if (!Number.isInteger(score) || score < 0) {
    throw new Error('Score must be a non-negative integer');
  }
  const key = ethers.id(gameId); // keccak256 of UTF-8 bytes
  const tx = await scoreboard.submitScore(key, player, score);
  await tx.wait();
  return tx.hash;  // use the TransactionResponse.hash
}

// 6) Helper: fetch all scores from-chain
export async function fetchScores(
  gameId: string
): Promise<Array<{ player: string; score: number }>> {
  const key = ethers.id(gameId);
  console.log(key);
  console.log("jusqu ici");
  const raw = await scoreboard.getScores(key);
  return raw.map((r) => ({
    player: r.player,
    score: Number(r.score),
  }));
}
