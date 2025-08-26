import { Router } from 'express'
import AuthController from '@/controllers/auth.controller'
import asyncHandler from '@/middleware/asyncHandler'
import { AuthValidation } from '@/validation/auth.validation'
import { validationRequest } from '@/middleware/validationRequest'

const router = Router()

//Forgot password
router.post(
    '/forgot-password',
    validationRequest(AuthValidation.forgotPasswordSchema()),
    asyncHandler(AuthController.forgotPassword)
)
router.post(
    '/verify-otp',
    validationRequest(AuthValidation.verifyOtp()),
    asyncHandler(AuthController.verifyOtp)
)

//Sign up and login
router.post(
    '/signup',
    validationRequest(AuthValidation.signupSchema()),
    asyncHandler(AuthController.signup)
)
router.post(
    '/login',
    validationRequest(AuthValidation.loginSchema()),
    asyncHandler(AuthController.login)
)

router.post(
    '/forgot-password-reset',
    validationRequest(AuthValidation.forgotPasswordReset()),
    asyncHandler(AuthController.forgotPasswordReset)
)
export default router
