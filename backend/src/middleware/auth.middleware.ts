import { NextFunction, Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { verifyToken } from "../utils/jwt";

export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const token = authHeader.substring(7).trim();

        if (!token) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        let decoded;
        try {
            decoded = verifyToken(token);
        } catch (_err) {
            res.status(401).json({
                success: false,
                message: "Invalid or expired token",
            });
            return;
        }

        const user = await AuthService.getUserById(decoded.sub);

        if (!user || !user.isActive) {
            res.status(401).json({
                success: false,
                message: "User account is inactive or invalid",
            });
            return;
        }

        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
        };

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Internal server error during authentication",
        });
    }
}
