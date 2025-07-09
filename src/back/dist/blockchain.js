"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreboard = void 0;
exports.postScore = postScore;
exports.fetchScores = fetchScores;
// src/back/src/blockchain.ts
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const ethers_1 = require("ethers");
// 1) Load .env
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
// 2) RPC & provider
const RPC_URL = process.env.AVALANCHE_RPC;
if (!RPC_URL)
    throw new Error("Missing AVALANCHE_RPC in .env");
const provider = new ethers_1.ethers.JsonRpcProvider(RPC_URL);
// 3) Wallet signer
const PK = process.env.PRIVATE_KEY;
if (!PK)
    throw new Error("Missing PRIVATE_KEY in .env");
const wallet = new ethers_1.ethers.Wallet(PK, provider);
// 4) Load ABI
const artifact = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(__dirname, "../../../contracts/out/ScoreBoard.sol/ScoreBoard.json"), "utf8"));
const abi = artifact.abi;
// 5) Instantiate contract
const SCOREBOARD_ADDRESS = process.env.SCOREBOARD_ADDRESS;
if (!SCOREBOARD_ADDRESS)
    throw new Error("Missing SCOREBOARD_ADDRESS in .env");
exports.scoreboard = new ethers_1.ethers.Contract(SCOREBOARD_ADDRESS, abi, wallet);
// 6) Internal pending‐nonce tracker
let _nextNonce = null;
async function getNextNonce() {
    if (_nextNonce === null) {
        // fetch including pending txs
        _nextNonce = await provider.getTransactionCount(wallet.address, "pending");
    }
    const curr = _nextNonce;
    _nextNonce++;
    return curr;
}
// 7) submit a score, handing out unique nonces
async function postScore(gameId, player, score) {
    if (!ethers_1.ethers.isAddress(player)) {
        throw new Error("Invalid player address");
    }
    if (!Number.isInteger(score) || score < 0) {
        throw new Error("Score must be a non-negative integer");
    }
    const key = ethers_1.ethers.id(gameId); // keccak256 of UTF-8 bytes
    const nonce = await getNextNonce(); // unique, incremental
    const tx = await exports.scoreboard.submitScore(key, player, score, { nonce });
    await tx.wait();
    return tx.hash;
}
// 8) fetch stored scores
async function fetchScores(gameId) {
    const key = ethers_1.ethers.id(gameId);
    const raw = await exports.scoreboard.getScores(key);
    return raw.map((r) => ({
        player: r.player,
        score: Number(r.score),
    }));
}
