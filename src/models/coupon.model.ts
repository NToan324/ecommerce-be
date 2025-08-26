import mongoose, { InferSchemaType, Schema } from 'mongoose'

const couponSchema = new Schema(
    {
        code: {
            type: String,
            match: /^[A-Z0-9]{5}$/,
            required: true,
            unique: true,
        },
        discount_amount: {
            type: mongoose.Schema.Types.Double,
            required: true,
            min: 0,
        },
        usage_count: {
            type: Number,
            default: 0,
        },
        usage_limit: {
            type: Number,
            min: 1,
            max: 10,
        },
        orders_used: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'orders',
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },

    },
    { timestamps: true }
)

const CouponModel = mongoose.model('coupons', couponSchema)
type Coupon = InferSchemaType<typeof couponSchema>
export default CouponModel
export type { Coupon }
