import { z } from 'zod';

export class UserValidation {
    // Validation cho việc đổi mật khẩu
    static changePassword() {
        return {
            body: z.object({
                oldPassword: z
                    .string()
                    .nonempty('Old password is required'),
                newPassword: z
                    .string()
                    .nonempty('New password is required')
                    .min(6, 'New password must be at least 6 characters long'),
            }).strict('Invalid field'),
        };
    }

    // Validation cho việc cập nhật thông tin người dùng
    static updateUserInfo() {
        return {
            body: z.object({
                fullName: z.string().optional(),
                address: z.string().optional(),
                phone: z
                    .string()
                    .regex(/^\d{10}$/, 'Phone number must be 10 digits')
                    .optional(),
                avatar: z
                    .object({
                        url: z.string().url('Invalid avatar URL'),
                        public_id: z.string().optional(),
                    })
                    .optional(),
                isActive: z
                    .boolean()
                    .optional()
            }).strict('Invalid field'),
        };
    }

    static searchUser() {
        return {
            query: z.object({
                name: z.string().optional(),
                email: z.string().optional(),
                page: z.coerce
                    .number()
                    .int('Page must be an integer')
                    .min(1, 'Page must be greater than or equal to 1')
                    .optional(),
                limit: z.coerce
                    .number()
                    .int('Limit must be an integer')
                    .min(1, 'Limit must be greater than or equal to 1')
                    .max(100, 'Limit must be less than or equal to 100')
                    .optional(),
            }).strict('Invalid field'),
        };
    }
}

export default UserValidation;