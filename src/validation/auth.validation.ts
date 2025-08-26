import z from 'zod'

export class AuthValidation {
    static signupSchema() {
        return {
            body: z
                .object({
                    email: z
                        .string()
                        .email('Email is not valid')
                        .nonempty('Email is required'),
                    address: z.string().nonempty('Address is required'),
                    password: z
                        .string()
                        .nonempty('Password is required')
                        .min(6, 'Password must be at least 6 characters long'),
                    fullName: z.string().nonempty('User name is required'),
                })
                .strict('Invalid field'),
        }
    }

    static loginSchema() {
        return {
            body: z
                .object({
                    email: z
                        .string()
                        .email('Email is not valid')
                        .nonempty('Email is required'),
                    password: z.string().nonempty('Password is required'),
                })
                .strict('Invalid field'),
        }
    }

    static forgotPasswordSchema() {
        return {
            body: z
                .object({
                    email: z.string().email('Email is not valid'),
                })
                .strict('Invalid field'),
        }
    }

    static verifyOtp() {
        return {
            body: z
                .object({
                    user_id: z.string().nonempty('User ID is required'),
                    otp_code: z.string().nonempty('OTP code is required'),
                })
                .strict('Invalid field'),
        }
    }

    static forgotPasswordReset() {
        return {
            body: z
                .object({
                    id: z.string().nonempty('User ID is required'),
                    password: z.string().nonempty('New password is required'),
                })
                .strict('Invalid field'),
        }
    }

    static resetPassword() {
        return {
            body: z
                .object({
                    id: z.string().nonempty('User ID is required'),
                    old_password: z
                        .string()
                        .nonempty('old password is required'),
                    new_password: z
                        .string()
                        .nonempty('new password is required'),
                })
                .strict('Invalid field'),
        }
    }
}
