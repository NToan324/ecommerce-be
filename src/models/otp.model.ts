import mongoose, { InferSchemaType, Schema } from 'mongoose'
const otpSchema = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true
    },
    otp_code: {
      type: String,
      required: true
    },
    expiration: {
      type: Date,
      required: true
    },
    is_verified: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
)

const otpModel = mongoose.model('otp', otpSchema)
type Otp = InferSchemaType<typeof otpSchema>
export default otpModel
export type { Otp }
