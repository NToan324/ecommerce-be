import type { Request, Response } from 'express'
import authService from '@/services/auth.service'
import { CreatedResponse } from '@/core/success.response'

class AuthController {
    async signup(req: Request, res: Response) {
        const { email, fullName, password, address } = req.body
        const userResponse = await authService.signup({
            email,
            fullName,
            password,
            address,
        })

        res.send(new CreatedResponse('User created successfully', userResponse))
    }

    async login(req: Request, res: Response) {
        const { email, password } = req.body
        res.send(
            await authService.login({
                email,
                password,
            })
        )
    }

    async forgotPassword(req: Request, res: Response) {
        const { email } = req.body
        res.send(await authService.forgotPassword(email))
    }

    async verifyOtp(req: Request, res: Response) {
        const { otp_code } = req.body
        const { user_id } = req.body

        res.send(await authService.verifyOtp({ otp_code, user_id }))
    }

    async forgotPasswordReset(req: Request, res: Response) {
        const { password } = req.body
        const { id } = req.body
        res.send(await authService.forgotPasswordReset({ password, id }))
    }
}
const authController = new AuthController()
export default authController
