export const signupSchema = {
  tags: ["Auth"],
  description: "Register a new user",
  body: {
    type: "object",
    required: ["userName", "email", "password"],
    properties: {
      userName: { type: "string", example: "test" },
      email: { type: "string", format: "email", example: "test@example.com" },
      password: { type: "string", minLength: 6 },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        idUser: { type: "integer" },
      },
    },
    400: { $ref: "ErrorResponse#" },
    409: { $ref: "ErrorResponse#" },
    500: { $ref: "ErrorResponse#" },
  },
};

export const loginSchema = {
  tags: ["Auth"],
  description: "Login with username and password, returns cookie",
  body: {
    type: "object",
    required: ["userName", "password"],
    properties: {
      userName: { type: "string", example: "test" },
      password: { type: "string", minLength: 6 },
    },
  },
  response: {
    200: {
      oneOf: [
        {
          type: "object",
          properties: {
            require2fa: { type: "boolean", example: true },
          },
        },
        {
          type: "object",
          properties: {
            idUser: { type: "integer" },
            userName: { type: "string" },
            email: { type: "string", format: "email" },
            avatarURL: { type: "string", format: "uri", nullable: true },
          },
        },
      ],
    },
    400: { $ref: "ErrorResponse#" },
    401: { $ref: "ErrorResponse#" },
    500: { $ref: "ErrorResponse#" },
  },
};

export const meSchema = {
  tags: ["User"],
  description: "Get current authenticated user info",
  response: {
    200: {
      type: "object",
      properties: {
        idUser: { type: "integer" },
        userName: { type: "string" },
        email: { type: "string", format: "email" },
        twoFactorEnabled: { type: "boolean" },
      },
    },
    401: { $ref: "ErrorResponse#" },
    500: { $ref: "ErrorResponse#" },
  },
};

export const logoutSchema = {
  tags: ["Auth"],
  description: "Logout current user and clear token cookie",
  response: {
    200: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
      },
    },
    500: { $ref: "ErrorResponse#" },
  },
};
