import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import type { Request, Response, NextFunction } from 'express'
import { ForbiddenError, UnauthorizedError } from '@/core/error.response'
import elasticsearchService from '@/services/elasticsearch.service'

dotenv.config()

const verifyJWTOrder = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  if (!authHeader) {
    req.user = { id: null }
    return next()
  }

  const token = authHeader?.split(' ')[1] ?? '';
  if (!token) {
    req.user = { id: null }
    return next()
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE as string, async (err: any, decoded: any) => {
    if (err) {
      return next(new ForbiddenError('Invalid token'))
    }

    req.user = decoded

    // Check if the user is active

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

export default verifyJWTOrder
