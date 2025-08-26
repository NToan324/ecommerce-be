import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { CustomError, NotFoundError } from '@/core/error.response'

export default class ErrorHandler {
  static notFoundError(req: Request, res: Response, next: NextFunction) {
    next(new NotFoundError())
  }

  static globalError(err: any, req: Request, res: Response, next: NextFunction) {
    const statusCode = err instanceof CustomError ? err.status : StatusCodes.INTERNAL_SERVER_ERROR
    const message = err.message || 'Internal Server Error'

    res.status(statusCode).json({
      success: false,
      error: {
        message,
        statusCode
      }
    })
  }
}
