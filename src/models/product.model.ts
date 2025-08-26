import mongoose, { InferSchemaType, Schema } from 'mongoose'

const productSchema = new Schema(
    {
        product_name: {
            type: String,
            required: true,
        },
        product_image: {
            url: {
                type: String,
                required: true,
            },
            public_id: {
                type: String,
                default: "",
            },
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
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
)

const ProductModel = mongoose.model('products', productSchema)
type Product = InferSchemaType<typeof productSchema>
export default ProductModel
export type { Product }
