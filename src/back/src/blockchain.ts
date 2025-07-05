// src/back/src/blockchain.ts
import path from "path"
import fs from "fs"
import dotenv from "dotenv"
import { ethers } from "ethers"

// 1) Load .env
dotenv.config({ path: path.resolve(__dirname, "../.env") })

// 2) RPC & provider
const RPC_URL = process.env.AVALANCHE_RPC
if (!RPC_URL) throw new Error("Missing AVALANCHE_RPC in .env")
const provider = new ethers.JsonRpcProvider(RPC_URL)

// 3) Wallet signer
const PK = process.env.PRIVATE_KEY
if (!PK) throw new Error("Missing PRIVATE_KEY in .env")
const wallet = new ethers.Wallet(PK, provider)

// 4) Load ABI
const artifact = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../../../contracts/out/ScoreBoard.sol/ScoreBoard.json"),
    "utf8"
  )
)
const abi = artifact.abi

// 5) Instantiate contract
const SCOREBOARD_ADDRESS = process.env.SCOREBOARD_ADDRESS
if (!SCOREBOARD_ADDRESS) throw new Error("Missing SCOREBOARD_ADDRESS in .env")
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
  ): Promise<ethers.TransactionResponse>
  getScores(
    gameId: string
  ): Promise<Array<{ player: string; score: bigint }>>
}

// 6) Internal pending‐nonce tracker
let _nextNonce: number | null = null
async function getNextNonce(): Promise<number> {
  if (_nextNonce === null) {
    // fetch including pending txs
    _nextNonce = await provider.getTransactionCount(wallet.address, "pending")
  }
  const curr = _nextNonce
  _nextNonce++
  return curr
}

// 7) submit a score, handing out unique nonces
export async function postScore(
  gameId: string,
  player: string,
  score: number
): Promise<string> {
  if (!ethers.isAddress(player)) {
    throw new Error("Invalid player address")
  }
  if (!Number.isInteger(score) || score < 0) {
    throw new Error("Score must be a non-negative integer")
  }
  const key = ethers.id(gameId)          // keccak256 of UTF-8 bytes
  const nonce = await getNextNonce()      // unique, incremental
  const tx = await scoreboard.submitScore(key, player, score, { nonce })
  await tx.wait()
  return tx.hash
}

// 8) fetch stored scores
export async function fetchScores(
  gameId: string
): Promise<Array<{ player: string; score: number }>> {
  const key = ethers.id(gameId)
  const raw = await scoreboard.getScores(key)
  return raw.map((r) => ({
    player: r.player,
    score: Number(r.score),
  }))
}
