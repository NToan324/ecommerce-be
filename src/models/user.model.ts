import mongoose, { InferSchemaType, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'
import { maxHeaderSize } from 'http'

const userSchema = new Schema(
    {
        email: {
            type: String,
            unique: true,
            required: true,
        },
        phone: {
            type: String,
            minlength: 10,
            maxlength: 10,
        },
        fullName: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        address: {
            type: String,
        },
        avatar: {
            url: {
                type: String,
                default:
                    'https://www.gravatar.com/avatar/?d=mp',
            },
            public_id: {
                type: String,
                default: '',
            },
        },
        role: {
            type: String,
            enum: ['CUSTOMER', 'ADMIN'],
            default: 'CUSTOMER',
        },
        loyalty_points: {
            type: mongoose.Schema.Types.Double,
            default: 0.0,
            min: 0,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: { createdAt: 'created_at' } }
)

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next()
    }

    try {
        const salt = await bcrypt.genSalt(10)
        this.password = await bcrypt.hash(this.password, salt)
        next()
    } catch (err) {
        next(err as Error)
    }
})

const UserModel = mongoose.model('users', userSchema)
type User = InferSchemaType<typeof userSchema>
export default UserModel
export type { User }
