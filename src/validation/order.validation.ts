import email from '@/config/email'
import { z } from 'zod'

export class OrderValidation {
    // Validation cho việc tạo order
    static createOrder() {
        return {
            body: z.object({
                name: z
                    .string()
                    .nonempty('User name is required'),
                email: z
                    .string()
                    .email('Invalid email format')
                    .nonempty('Email is required'),
                coupon_code: z
                    .string()
                    .regex(/^[A-Z0-9]{5}$/)
                    .optional(),
                address: z
                    .string()
                    .nonempty('Address is required'),
                items: z
                    .array(
                        z.object({
                            product_variant_id: z
                                .string()
                                .nonempty('Product variant ID is required'),
                            product_variant_name: z
                                .string()
                                .nonempty('Product variant name is required'),
                            quantity: z.coerce
                                .number()
                                .int('Quantity must be an integer')
                                .min(1, 'Quantity must be at least 1'),
                            unit_price: z.coerce
                                .number()
                                .min(0, 'Price must be at least 0'),
                            discount: z.coerce
                                .number()
                                .min(0, 'Discount must be at least 0')
                                .max(0.5, 'Discount must be at most 0.5')
                                .default(0),
                            images: z.object({
                                url: z.string().nonempty('Image URL is required'),
                            }),
                        })
                    ).optional(),
                payment_method: z.enum(['CASH', 'BANK_TRANSFER'], {
                    required_error: 'Payment method is required',
                }),
            }).strict('Invalid field'),
        };
    }

    // Validation cho việc cập nhật trạng thái order
    static updateOrderStatus() {
        return {
            body: z
                .object({
                    status: z.enum(
                        ['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED'],
                        {
                            required_error: 'Status is required',
                        }
                    ),
                })
                .strict('Invalid field'),
        }
    }

    static searchOrder() {
        return {
            query: z
                .object({
                    order_id: z
                        .string()
                        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid order ID')
                        .optional(),
                    user_name: z.string().optional(),
                    status: z
                        .enum(['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED'])
                        .optional(),
                    payment_method: z
                        .enum(['CASH', 'CREDIT_CARD', 'VNPay'])
                        .optional(),
                    payment_status: z
                        .enum(['PENDING', 'PAID', 'FAILED'])
                        .optional(),
                    from_date: z.string().date('Invalid date format').optional(),
                    to_date: z.string().date('Invalid date format').optional(),
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
                })
                .strict('Invalid field'),
        }
    }
}

export default OrderValidation
