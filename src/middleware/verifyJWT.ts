import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import type { Request, Response, NextFunction } from 'express'
import { ForbiddenError, UnauthorizedError } from '@/core/error.response'
import elasticsearchService from '@/services/elasticsearch.service'

dotenv.config()
declare global {
  namespace Express {
    interface Request {
      user?: string | object
    }
  }
}

const verifyJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  if (!authHeader) {
    return next(new UnauthorizedError('Unauthorized'))
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    return next(new UnauthorizedError('No token provided'))
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE as string, async (err: any, decoded: any) => {
    if (err) {
      return next(new ForbiddenError('Invalid token'))
    }

    req.user = decoded

    let user: any
    try {
      user = await elasticsearchService.getDocumentById(
        'users',
        decoded.id
      ) as any
    } catch (error) {
      return next(new ForbiddenError('User not found'))
    }

    if (!user || !user.isActive) {
      return next(new ForbiddenError('User is not found or inactive'))
    }

    next()
  })
}

export default verifyJWT
