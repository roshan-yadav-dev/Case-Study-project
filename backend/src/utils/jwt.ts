import dotenv from "dotenv";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "../../generated/prisma";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_change_in_production";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "1d") as SignOptions["expiresIn"];

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

    return jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
}

/**
 * Verify and decode a JWT access token.
 * Throws an error if the token is invalid or expired.
 */
export function verifyToken(token: string): JwtTokenPayload {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtTokenPayload;
    return decoded;
}
