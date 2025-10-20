import mongoose, { InferSchemaType, Schema } from 'mongoose'

const productVariantSchema = new Schema(
    {
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'products',
            required: true,
        },
        brand_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'brands',
            required: true,
        },
        category_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'categories',
            required: true,
        },
        variant_name: {
            type: String,
            required: true,
        },
        attributes: {
            type: Map,
            of: String,
            required: true,
        },
        variant_description: {
            type: String,
            required: true,
        },
        original_price: {
            type: mongoose.Schema.Types.Double,
            min: 0,
        },
        price: {
            type: mongoose.Schema.Types.Double,
            min: 0,
        },
        discount: {
            type: mongoose.Schema.Types.Double,
            min: 0.0,
            max: 0.5,
            default: 0.0,
        },
        quantity: {
            type: Number,
            min: 0,
        },
        average_rating: {
            type: mongoose.Schema.Types.Double,
            min: 0.0,
            max: 5.0,
            default: 0.0,
        },
        rating_distribution: {
            one_star: { type: Number, default: 0 },
            two_star: { type: Number, default: 0 },
            three_star: { type: Number, default: 0 },
            four_star: { type: Number, default: 0 },
            five_star: { type: Number, default: 0 },
        },
        review_count: {
            type: Number,
            min: 0,
            default: 0,
        },
        images: [{
            url: {
                type: String,
                required: true,
            },
            public_id: {
                type: String,
                default: '',
            },
            _id: false,
        }],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
)

const ProductVariantModel = mongoose.model(
    'product_variants',
    productVariantSchema
)
type ProductVariant = InferSchemaType<typeof productVariantSchema>
export default ProductVariantModel
export type { ProductVariant }
