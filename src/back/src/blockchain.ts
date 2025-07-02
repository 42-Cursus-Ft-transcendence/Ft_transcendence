import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

// Load environment variables before using process.env
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import { ethers } from 'ethers'

// 1) Connect to Anvil via RPC
const RPC_URL = process.env.AVALANCHE_RPC
if (!RPC_URL) {
  console.error('Missing AVALANCHE_RPC in env')
  process.exit(1)
}
const provider = new ethers.JsonRpcProvider(RPC_URL)

// 2) Create a signer wallet from your pre-funded key
const PRIVATE_KEY = process.env.PRIVATE_KEY
if (!PRIVATE_KEY) {
  console.error('Missing PRIVATE_KEY in env')
  process.exit(1)
}
const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

// 3) Load the compiled ABI
const abiPath = path.resolve(__dirname, '../../../contracts/out/ScoreBoard.sol/ScoreBoard.json')
const json = JSON.parse(fs.readFileSync(abiPath, 'utf8'))
const abi = json.abi

// 4) Instantiate the contract
const SCOREBOARD_ADDRESS = process.env.SCOREBOARD_ADDRESS
if (!SCOREBOARD_ADDRESS) {
  console.error('Missing SCOREBOARD_ADDRESS in env')
  process.exit(1)
}
export const scoreboard = new ethers.Contract(
  SCOREBOARD_ADDRESS,
  abi,
  wallet
)

// 5) Helper: submit a score
enum SubmissionError {
  INVALID_PLAYER = 'Invalid player address',
  INVALID_SCORE = 'Score must be a non-negative number'
}
export async function postScore(
  gameId: string,
  player: string,
  score: number
): Promise<string> {
  if (!ethers.isAddress(player)) {
    throw new Error(SubmissionError.INVALID_PLAYER)
  }
  if (!Number.isInteger(score) || score < 0) {
    throw new Error(SubmissionError.INVALID_SCORE)
  }
  const key = ethers.id(gameId)
  const tx = await scoreboard.submitScore(key, player, score)
  const receipt = await tx.wait()
  return receipt.transactionHash
}

// 6) Helper: fetch all scores
export async function fetchScores(
  gameId: string
): Promise<Array<{ player: string; score: number }>> {
  const key = ethers.id(gameId)
  const raw = await scoreboard.getScores(key)
  return raw.map((r: { player: string; score: bigint }) => ({
    player: r.player,
    score: Number(r.score)
  }))
}