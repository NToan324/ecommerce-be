import { type NextFunction, type Request, type Response } from 'express'
import { ZodError, type ZodTypeAny } from 'zod'

import { BadRequestError, InternalServerError } from '@/core/error.response'

interface ValidationSchemas {
    body?: ZodTypeAny
    query?: ZodTypeAny
    params?: ZodTypeAny
    cookies?: ZodTypeAny
}

export const validationRequest = ({
    body,
    query,
    params,
    cookies,
}: ValidationSchemas = {}) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if (body) Object.assign(req.body, body.parse(req.body))
            if (query) Object.assign(req.query, query.parse(req.query))
            if (params) Object.assign(req.params, params.parse(req.params))
            if (cookies) Object.assign(req.cookies, cookies.parse(req.cookies))
            next()
        } catch (error) {
            if (error instanceof ZodError) {
                throw new BadRequestError(error.issues[0].message)
            }
            throw new InternalServerError()
        }
    }
}
