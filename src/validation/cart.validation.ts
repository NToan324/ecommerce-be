import z from 'zod'

export class CartValidation {
    // Validation for adding an item to the cart
    static addItemToCart() {
        return {
            body: z
                .object({
                    productVariantId: z
                        .string()
                        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid productVariantId')
                        .nonempty('Product Variant ID is required'),
                    quantity: z.coerce
                        .number()
                        .int('Quantity must be an integer')
                        .min(1, 'Quantity must be greater than or equal to 1')
                        .nonnegative('Quantity must be a positive number'),
                })
                .strict('Invalid field'),
        }
    }

    // Validation for updating item quantity in the cart
    static updateItemQuantity() {
        return {
            body: z
                .object({
                    quantity: z.coerce
                        .number()
                        .int('Quantity must be an integer')
                        .min(1, 'Quantity must be greater than or equal to 1')
                        .nonnegative('Quantity must be a positive number'),
                })
                .strict('Invalid field'),
        }
    }
}

export default CartValidation
