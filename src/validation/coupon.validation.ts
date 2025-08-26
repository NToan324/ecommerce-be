import { z } from 'zod';

export class CouponValidation {
    // Validation cho việc tạo coupon
    static createCoupon() {
        return {
            body: z.object({
                code: z
                    .string()
                    .regex(/^[A-Z0-9]{5}$/, 'Invalid coupon code format')
                    .nonempty('Coupon code is required'),
                discount_amount: z.coerce
                    .number()
                    .min(0, 'Discount amount must be at least 0'),
                usage_limit: z.coerce
                    .number()
                    .int('Usage limit must be an integer')
                    .min(1, 'Usage limit must be at least 1')
                    .max(10, 'Usage limit must not exceed 10'),
            }).strict('Invalid field'),
        };
    }

    // Validation cho việc cập nhật coupon
    static updateCoupon() {
        return {
            body: z.object({
                code: z
                    .string()
                    .regex(/^[A-Z0-9]{5}$/, 'Invalid coupon code format')
                    .optional(),
                discount_amount: z.coerce
                    .number()
                    .min(0, 'Discount amount must be at least 0')
                    .optional(),
                usage_limit: z.coerce
                    .number()
                    .int('Usage limit must be an integer')
                    .min(1, 'Usage limit must be at least 1')
                    .max(10, 'Usage limit must not exceed 10')
                    .optional(),
                isActive: z
                    .boolean()
                    .optional(),
            }).strict('Invalid field'),
        };
    }
}

export default CouponValidation;