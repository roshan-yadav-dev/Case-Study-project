import dotenv from "dotenv";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "../../generated/prisma";

dotenv.config();

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET environment variable is missing in production environment");
    }
    return secret || "default_jwt_secret_change_in_production";
}

export interface JwtTokenPayload {
    sub: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}

/**
 * Generate a signed JWT access token for an authenticated user.
 */
export function generateToken(payload: { sub: string; role: UserRole }): string {
    const tokenPayload: JwtTokenPayload = {
        sub: payload.sub,
        role: payload.role,
    };

    const secret = getJwtSecret();
    const expiresIn = (process.env.JWT_EXPIRES_IN || "1d") as SignOptions["expiresIn"];

    return jwt.sign(tokenPayload, secret, {
        expiresIn,
    });
}

/**
 * Verify and decode a JWT access token.
 * Throws an error if the token is invalid or expired.
 */
export function verifyToken(token: string): JwtTokenPayload {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as JwtTokenPayload;
    return decoded;
}

