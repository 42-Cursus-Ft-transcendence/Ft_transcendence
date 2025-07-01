// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract ScoreBoard {
    struct Score { address player; uint256 score; }
    mapping(bytes32 => Score[]) private gameScores;

    event ScoreSubmitted(bytes32 indexed gameId, address indexed player, uint256 score);

    /// @notice Record a new score
    function submitScore(bytes32 gameId, address player, uint256 score) external {
        gameScores[gameId].push(Score(player, score));
        emit ScoreSubmitted(gameId, player, score);
    }

    /// @notice Retrieve all scores for a game
    function getScores(bytes32 gameId) external view returns (Score[] memory) {
        return gameScores[gameId];
    }
}
