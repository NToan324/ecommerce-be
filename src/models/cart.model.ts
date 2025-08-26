import mongoose, { InferSchemaType, Schema } from 'mongoose'

const cartSchema = new Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
        },
        items: [
            {
                product_variant_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'product_variants',
                },
                product_variant_name: {
                    type: String,
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 1,
                },
                unit_price: {
                    type: mongoose.Schema.Types.Double,
                    required: true,
                    min: 0,
                },
                discount: {
                    type: mongoose.Schema.Types.Double,
                    required: true,
                    min: 0.0,
                    max: 0.5,
                    default: 0.0,
                },
                images: {
                    url: {
                        type: String,
                        required: true,
                    },
                    public_id: {
                        type: String,
                    },
                },
                _id: false,
            },
        ],
    },
    { timestamps: true }
)

const CartModel = mongoose.model('carts', cartSchema)
type Cart = InferSchemaType<typeof cartSchema>
export default CartModel
export type { Cart }
