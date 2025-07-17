export const setup2faSchema = {
  tags: ["2FA"],
  description: "Enable or disable TOTP-based two-factor authentication",
  body: {
    type: "object",
    required: ["password", "enable2fa"],
    properties: {
      password: {
        type: "string",
        description: "Current user password",
      },
      enable2fa: {
        type: "boolean",
        description: "If true, enable 2FA; if false, disable",
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
        qrDataUrl: {
          type: "string",
          format: "uri",
          description: "Data URL of the QR code for provisioning",
        },
      },
    },
    400: { $ref: "ErrorResponse#" },
    401: { $ref: "ErrorResponse#" },
    500: { $ref: "ErrorResponse#" },
  },
};

export const verify2faSetupSchema = {
  tags: ["2FA"],
  description: "Verify TOTP code to activate two-factor authentication",
  body: {
    type: "object",
    required: ["token"],
    properties: {
      token: {
        type: "string",
        description: "One-time TOTP code from authenticator app",
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
      },
    },
    400: { $ref: "ErrorResponse#" },
    401: { $ref: "ErrorResponse#" },
    500: { $ref: "ErrorResponse#" },
  },
};

export const authenticate2faSchema = {
  tags: ["2FA"],
  description: "Complete login by verifying 2FA code and issuing JWT",
  body: {
    type: "object",
    required: ["userId", "twoFactorCode"],
    properties: {
      userId: {
        type: "integer",
        description: "ID of the user attempting 2FA",
      },
      twoFactorCode: {
        type: "string",
        description: "One-time TOTP code for authentication",
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        userName: { type: "string" },
        email: { type: "string", format: "email" },
        idUser: { type: "integer" },
      },
    },
    400: { $ref: "ErrorResponse#" },
    401: { $ref: "ErrorResponse#" },
    500: { $ref: "ErrorResponse#" },
  },
};
