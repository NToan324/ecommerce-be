import mongoose, { InferSchemaType, Schema } from 'mongoose'

const orderSchema = new Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
        },
        user_name: {
            type: String,
        },
        email: {
            type: String,
            required: true,
        },
        coupon_code: {
            type: String,
        },
        address: {
            type: String,
            required: true,
        },
        total_amount: mongoose.Schema.Types.Double,
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
                    min: 1,
                },
                unit_price: {
                    type: mongoose.Schema.Types.Double,
                    min: 0,
                },
                discount: {
                    type: mongoose.Schema.Types.Double,
                    min: 0.0,
                    max: 0.5,
                    default: 0.0,
                },
                images: {
                    url: {
                        type: String,
                        required: true,
                    }
                },
                _id: false
            },
        ],
        discount_amount: {
            type: Number,
            min: 0,
            default: 0,
        },
        loyalty_points_used: {
            type: mongoose.Schema.Types.Double,
            default: 0.0,
            min: 0.0,
        },
        loyalty_points_earned: {
            type: mongoose.Schema.Types.Double,
        },
        status: {
            type: String,
            enum: [
                'PENDING',
                'SHIPPING',
                'DELIVERED',
                'CANCELLED',
            ],
            default: 'PENDING',
        },
        payment_method: {
            type: String,
            enum: ['CASH', 'BANK_TRANSFER'],
            required: true,
        },
        payment_status: {
            type: String,
            enum: ['PENDING', 'PAID', 'FAILED'],
            default: 'PENDING',
        },
        order_tracking: {
            type: [
                {
                    status: {
                        type: String,
                        enum: ['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED'],
                        default: 'PENDING',
                        required: true,
                    },
                    updated_at: {
                        type: Date,
                        default: Date.now,
                    },
                },
            ],
            default: [
                {
                    status: 'PENDING',
                    updated_at: Date.now(),
                },
            ],
        },
    },
    { timestamps: true }
)

const OrderModel = mongoose.model('orders', orderSchema)
type Order = InferSchemaType<typeof orderSchema>
export default OrderModel
export type { Order }
