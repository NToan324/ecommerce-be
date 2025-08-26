import { z } from 'zod'

export class ReviewValidation {
    // Schema dùng để validate khi tạo review
    static createReview() {
        return {
            body: z.object({
                product_variant_id: z
                    .string()
                    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid product_variant_id format')
                    .nonempty('Product variant ID is required'),
                user_id: z
                    .string()
                    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user_id format')
                    .optional(),
                content: z
                    .string()
                    .nonempty('Content is required')
                    .optional(),
                rating: z
                    .number().int('Rating must be an integer')
                    .min(1, 'Rating must be at least 1')
                    .max(5, 'Rating must not exceed 5')
                    .optional(),
            }).strict('Invalid field'),
        }
    }
}

export default ReviewValidation