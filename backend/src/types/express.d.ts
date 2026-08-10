import { UserRole } from "../../generated/prisma";

export interface AuthUserPayload {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUserPayload;
        }
    }
}
