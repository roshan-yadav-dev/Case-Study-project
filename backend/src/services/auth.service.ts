import bcrypt from "bcryptjs";
import prisma from "../config/prisma";
import { UserRole } from "../../generated/prisma";
import { generateToken } from "../utils/jwt";
import { LoginDto } from "../validators/auth.validator";

export interface SafeUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface LoginResult {
    user: SafeUser;
    accessToken: string;
}

export class AuthenticationError extends Error {
    public statusCode: number;

    constructor(message: string = "Invalid email or password", statusCode: number = 401) {
        super(message);
        this.name = "AuthenticationError";
        this.statusCode = statusCode;
    }
}

export class AuthService {
    /**
     * Authenticates a user by email and password.
     * Returns a safe user payload and JWT access token.
     */
    static async login(dto: LoginDto): Promise<LoginResult> {
        const normalizedEmail = dto.email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        // Prevent account enumeration & check active status:
        // Return identical 401 error whether user does not exist, is inactive, or provided wrong password.
        if (!user || !user.isActive) {
            throw new AuthenticationError("Invalid email or password", 401);
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new AuthenticationError("Invalid email or password", 401);
        }

        const accessToken = generateToken({
            sub: user.id,
            role: user.role,
        });

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            accessToken,
        };
    }

    /**
     * Fetches user by ID and verifies active status for context resolution.
     */
    static async getUserById(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
            },
        });

        if (!user || !user.isActive) {
            return null;
        }

        return user;
    }
}
