import { NextFunction, Request, Response } from "express";
import { UserRole } from "../../generated/prisma";

/**
 * Middleware factory for Role-Based Access Control (RBAC).
 * Grants access if req.user has one of the allowed roles; otherwise returns 403 Forbidden.
 */
export function authorizeRoles(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: "You do not have permission to access this resource",
            });
            return;
        }

        next();
    };
}
