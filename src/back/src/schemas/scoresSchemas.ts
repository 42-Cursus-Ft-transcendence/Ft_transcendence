export const postScoresSchema = {
  tags: ["Scores"],
  description: "Post a new on‑chain score for a given game",
  body: {
    type: "object",
    required: ["gameId", "player", "score"],
    properties: {
      gameId: {
        type: "string",
        description: "ID of the game",
        example: "match123",
      },
      player: {
        type: "string",
        description: "Ethereum address of the player",
        example: "0xAbC123...def",
      },
      score: {
        type: "number",
        description: "Score achieved by the player",
        example: 42,
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        txHash: {
          type: "string",
          description: "Transaction hash of the on‑chain write",
          example: "0x5f2e...",
        },
      },
    },
    400: { $ref: "ErrorResponse#" },
    401: { $ref: "ErrorResponse#" },
    500: { $ref: "ErrorResponse#" },
  },
};

export const getScoresSchema = {
  tags: ["Scores"],
  description: "Fetch all on‑chain scores for a given game",
  params: {
    type: "object",
    required: ["gameId"],
    properties: {
      gameId: {
        type: "string",
        description: "ID of the game",
        example: "match123",
      },
    },
  },
  response: {
    200: {
      type: "array",
      description: "List of score records",
      items: {
        type: "object",
        properties: {
          player: {
            type: "string",
            description: "Ethereum address of the player",
          },
          score: {
            type: "number",
            description: "Score value",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "When the score was posted",
          },
        },
      },
    },
    500: { $ref: "ErrorResponse#" },
  },
};

export const getLeaderboardSchema = {
  tags: ["Scores"],
  description: "Get top‑N leaderboard entries",
  querystring: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        minimum: 1,
        description: "Maximum number of entries to return",
        example: 10,
      },
    },
  },
  response: {
    200: {
      type: "array",
      description: "Leaderboard entries",
      items: {
        type: "object",
        properties: {
          userId: {
            type: "integer",
            description: "Internal user ID",
            example: 123,
          },
          userName: {
            type: "string",
            description: "Player's username",
            example: "junsan",
          },
          score: {
            type: "number",
            description: "Aggregated score",
            example: 256,
          },
        },
      },
    },
    500: { $ref: "ErrorResponse#" },
  },
};
