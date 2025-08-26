import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '@/core/error.response'

const verifyRole = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as { role: string }

    if (!user) {
        throw new UnauthorizedError('Unauthorized');
    }

    // Kiểm tra role của user
    const userRole = user.role;
    if (!requiredRoles.includes(userRole)) {
        throw new ForbiddenError('Forbidden');
    }
    next();
  };
};

export default verifyRole;