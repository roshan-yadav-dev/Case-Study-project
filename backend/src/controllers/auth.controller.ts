import { Request, Response } from "express";
import { AuthenticationError, AuthService } from "../services/auth.service";
import { loginSchema } from "../validators/auth.validator";

export class AuthController {
    /**
     * POST /api/auth/login
     * Authenticate user credentials and issue a JWT token.
     */
    static async login(req: Request, res: Response): Promise<void> {
        try {
            const parseResult = loginSchema.safeParse(req.body);

            if (!parseResult.success) {
                const formattedErrors = parseResult.error.issues.map((issue) => issue.message).join(", ");
                res.status(400).json({
                    success: false,
                    message: formattedErrors || "Invalid request payload",
                });
                return;
            }

            const result = await AuthService.login(parseResult.data);

            res.status(200).json({
                success: true,
                message: "Login successful",
                data: {
                    user: result.user,
                    accessToken: result.accessToken,
                },
            });
        } catch (error: any) {
            if (error instanceof AuthenticationError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
                return;
            }

            res.status(500).json({
                success: false,
                message: "An unexpected error occurred during login",
            });
        }
    }

    /**
     * GET /api/auth/me
     * Return currently authenticated user profile context.
     */
    static async me(req: Request, res: Response): Promise<void> {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: req.user.id,
                    name: req.user.name,
                    email: req.user.email,
                    role: req.user.role,
                },
            },
        });
    }

    /**
     * GET /api/auth/test/admin (Internal RBAC Test)
     */
    static async testAdmin(req: Request, res: Response): Promise<void> {
        res.status(200).json({
            success: true,
            message: "Admin authorization verified",
            user: req.user,
        });
    }

    /**
     * GET /api/auth/test/sales (Internal RBAC Test)
     */
    static async testSales(req: Request, res: Response): Promise<void> {
        res.status(200).json({
            success: true,
            message: "Sales authorization verified",
            user: req.user,
        });
    }

    /**
     * GET /api/auth/test/warehouse (Internal RBAC Test)
     */
    static async testWarehouse(req: Request, res: Response): Promise<void> {
        res.status(200).json({
            success: true,
            message: "Warehouse authorization verified",
            user: req.user,
        });
    }

    /**
     * GET /api/auth/test/accounts (Internal RBAC Test)
     */
    static async testAccounts(req: Request, res: Response): Promise<void> {
        res.status(200).json({
            success: true,
            message: "Accounts authorization verified",
            user: req.user,
        });
    }
}
