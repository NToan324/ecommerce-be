import mongoose, { InferSchemaType, Schema } from 'mongoose'

const reviewSchema = new Schema(
    {
        product_variant_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product_variants',
            required: true,
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
            required: false,
        },
        content: {
            type: String,
            required: false,
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            required: false,
        },
    },
    { timestamps: true }
)

const ReviewModel = mongoose.model('reviews', reviewSchema)
type Review = InferSchemaType<typeof reviewSchema>
export default ReviewModel
export type { Review }