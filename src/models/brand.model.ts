import mongoose, { InferSchemaType, Schema } from 'mongoose'

const brandSchema = new Schema({
    brand_name: {
        type: String,
        required: true,
    },
    brand_image: {
        url: {
            type: String,
            required: true,
        },
        public_id: {
            type: String,
            default: '',
        },
    },
    isActive: {
        type: Boolean,
        default: true,
    },
})

const BrandModel = mongoose.model('brands', brandSchema)
type Brand = InferSchemaType<typeof brandSchema>
export default BrandModel
export type { Brand }
