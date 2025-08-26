import z from 'zod'

export class ProductValidation {
    // Schema dùng để tạo sản phẩm chính
    static createProduct() {
        return {
            body: z
                .object({
                    product_name: z.string().min(1, 'Product name is required'),
                    brand_id: z
                        .string()
                        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid brand_id'),
                    category_id: z
                        .string()
                        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid category_id'),
                    product_image: z.object({
                        url: z
                            .string()
                            .url('Invalid image URL')
                            .nonempty('Image URL is required'),
                        public_id: z.string().optional(),
                    }),
                })
                .strict('Invalid field'),
        }
    }

    // Schema dùng để cập nhật sản phẩm
    static updateProduct() {
        return {
            body: z
                .object({
                    product_name: z.string().min(1).optional(),
                    brand_id: z
                        .string()
                        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid brand_id')
                        .optional(),
                    category_id: z
                        .string()
                        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid category_id')
                        .optional(),
                    product_image: z
                        .object({
                            url: z.string().url('Invalid image URL'),
                            public_id: z.string(),
                        })
                        .optional(),
                    isActive: z.boolean().optional(),
                })
                .strict('Invalid field'),
        }
    }

    // Schema dùng để tìm kiếm sản phẩm
    static searchProduct() {
        return {
            query: z
                .object({
                    name: z.string().optional(),
                    category_id: z
                        .string()
                        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid category_id')
                        .optional(),
                    brand_id: z
                        .string()
                        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid brand_id')
                        .optional(),
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

    // =========================Product Variant========================
    // Schema dùng để tạo sản phẩm biến thể
    static createProductVariant() {
        return {
            body: z
                .object({
                    product_id: z
                        .string()
                        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid product_id'),
                    variant_name: z.string().min(1, 'Variant name is required'),
                    variant_color: z.string().optional(),
                    variant_size: z.string().optional(),
                    variant_RAM: z.string().optional(),
                    variant_Storage: z.string().optional(),
                    variant_CPU: z.string().optional(),
                    variant_description: z
                        .string()
                        .min(1, 'Variant description is required'),
                    price: z.coerce
                        .number()
                        .min(1, 'Price must be greater than 0'),
                    quantity: z.coerce
                        .number()
                        .int('Quantity must be an integer')
                        .min(1, 'Quantity must be greater than or equal to 1'),
                    discount: z.coerce
                        .number()
                        .min(0, 'Discount must be greater than or equal to 0')
                        .max(0.5, 'Discount must be less than or equal to 0.5')
                        .optional(),
                    images: z
                        .array(
                            z.object({
                                url: z
                                    .string()
                                    .url('Invalid image URL')
                                    .nonempty('Image URL is required'),
                                public_id: z.string().optional(),
                            })
                        )
                        .min(3, 'At least 3 images are required'),
                })
                .strict('Invalid field'),
        }
    }

    // Schema dùng để cập nhật sản phẩm biến thể
    static updateProductVariant() {
        return {
            body: z
                .object({
                    variant_name: z.string().min(1).optional(),
                    variant_color: z.string().optional(),
                    variant_size: z.string().optional(),
                    variant_RAM: z.string().optional(),
                    variant_Storage: z.string().optional(),
                    variant_CPU: z.string().optional(),
                    variant_description: z.string().min(1).optional(),
                    price: z.coerce
                        .number()
                        .min(1, 'Price must be greater than 0')
                        .optional(),
                    quantity: z.coerce
                        .number()
                        .int('Quantity must be an integer')
                        .min(1, 'Quantity must be greater than or equal to 1')
                        .nonnegative('Quantity must be a positive number')
                        .optional(), // Kiểm tra giá trị không âm
                    discount: z.coerce
                        .number()
                        .min(0, 'Discount must be greater than or equal to 0')
                        .max(0.5, 'Discount must be less than or equal to 0.5')
                        .optional(),
                    images: z
                        .array(
                            z.object({
                                url: z.string().url('Invalid image URL'),
                                public_id: z.string(),
                            })
                        )
                        .min(3, 'At least 3 images are required')
                        .optional(),
                    isActive: z.boolean().optional(),
                })
                .strict('Invalid field'),
        }
    }

    // Schema dùng để tìm kiếm sản phẩm biến thể
    static searchProductVariant() {
        return {
            query: z
                .object({
                    name: z.string().optional(),
                    category_ids: z
                        .union([
                            z.array(
                                z
                                    .string()
                                    .regex(
                                        /^[0-9a-fA-F]{24}$/,
                                        'Invalid category_id'
                                    )
                            ),
                            z
                                .string()
                                .regex(
                                    /^[0-9a-fA-F]{24}$/,
                                    'Invalid category_id'
                                ),
                        ])
                        .optional(),
                    brand_ids: z
                        .union([
                            z.array(
                                z
                                    .string()
                                    .regex(
                                        /^[0-9a-fA-F]{24}$/,
                                        'Invalid brand_id'
                                    )
                            ),
                            z
                                .string()
                                .regex(/^[0-9a-fA-F]{24}$/, 'Invalid brand_id'),
                        ])
                        .optional(),
                    min_price: z.coerce
                        .number()
                        .min(
                            0,
                            'Minimum price must be greater than or equal to 0'
                        )
                        .optional(),
                    max_price: z.coerce
                        .number()
                        .min(
                            0,
                            'Maximum price must be greater than or equal to 0'
                        )
                        .optional(),
                    ratings: z.coerce
                        .number()
                        .int('Ratings must be an integer')
                        .min(0, 'Ratings must be greater than or equal to 0')
                        .max(5, 'Ratings must be less than or equal to 5')
                        .optional(),
                    sort_price: z.enum(['asc', 'desc']).optional(),
                    sort_name: z.enum(['asc', 'desc']).optional(),
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
