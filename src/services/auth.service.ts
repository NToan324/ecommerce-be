import { BadRequestError, ForbiddenError } from '@/core/error.response'
import { CreatedResponse, OkResponse } from '@/core/success.response'
import userModel, { User } from '@/models/user.model'
import otpModel from '@/models/otp.model'
import bcrypt from 'bcryptjs'
import jwt, { JwtPayload } from 'jsonwebtoken'
import dotenv from 'dotenv'
import emailConfig from '@/config/email'
import elasticsearchService from './elasticsearch.service'
dotenv.config()

class AuthService {
    async signup(payload: Partial<User>) {
        const { fullName, email, address, password } = payload
        const isEmailExist = await userModel.exists({ email })
        if (isEmailExist) {
            throw new BadRequestError('Email already exists')
        }
        const newUser = await userModel.create({
            fullName,
            email,
            address,
            password,
        })

        if (!newUser) {
            throw new BadRequestError('Failed to create user')
        }

        const { _id, ...userWithoutId } = newUser.toObject()

        await elasticsearchService.indexDocument(
            'users',
            _id.toString(),
            userWithoutId
        )

        const userResponse = {
            id: newUser._id,
            phone: newUser.phone,
            email: newUser.email,
            name: newUser.fullName,
            role: newUser.role,
            loyaltyPoint: newUser.loyalty_points,
        }

        return userResponse
    }

    async login(data: { email: string; password: string }) {
        const { email, password } = data
        const foundUser = await userModel.findOne({ email })
        if (!foundUser) {
            throw new BadRequestError('User not found')
        }
        if (!foundUser.isActive) {
            throw new ForbiddenError('Account is not active')
        }
        const isPasswordMatch = await bcrypt.compare(
            password,
            foundUser.password as string
        )
        if (!isPasswordMatch) {
            throw new BadRequestError('Password is incorrect')
        }
        //check if user is active

        const accessToken = jwt.sign(
            {
                id: foundUser._id,
                email: foundUser.email || undefined,
                role: foundUser.role,
            },
            process.env.ACCESS_TOKEN_SECRETE as string,
            {
                expiresIn: '1d',
            }
        )

        const user = {
            _id: foundUser._id,
            phone: foundUser.phone,
            email: foundUser.email,
            name: foundUser.fullName,
            role: foundUser.role,
            point: foundUser.loyalty_points,
            avatar: foundUser.avatar,
        }
        return new OkResponse('Login successfully', {
            accessToken,
            user,
        })
    }

    async forgotPassword(email: string) {
        const user = await userModel.findOne({ email })
        if (!user) throw new BadRequestError('User not found')

        const otpCode = Math.floor(1000 + Math.random() * 9000).toString()

        // 1) Gửi mail
        const mailOptions = emailConfig.mailOptions({ email, otpCode })
        await emailConfig.transporter.sendMail(mailOptions)

        // 2) Cập nhật hoặc tạo mới record OTP
        await otpModel.updateOne(
            { user_id: user._id }, // tìm theo user
            {
                $set: {
                    otp_code: otpCode,
                    expiration: new Date(Date.now() + 5 * 60 * 1000), // 5 phút
                    is_verified: false,
                },
            },
            { upsert: true } // nếu không có thì tạo mới
        )

        return new OkResponse('OTP sent successfully', { id: user._id })
    }

    async verifyOtp({
        otp_code,
        user_id,
    }: {
        otp_code: string
        user_id: string
    }) {
        const user = await userModel.findById(user_id)
        if (!user) throw new BadRequestError('User not found')

        const otpRecord = await otpModel.findOne({
            user_id: user._id,
            otp_code,
        })

        if (!otpRecord) throw new BadRequestError('OTP code is not valid')
        if (otpRecord.expiration < new Date())
            throw new BadRequestError('OTP code is expired')
        if (otpRecord.is_verified)
            throw new BadRequestError('OTP code is already verified')

        otpRecord.is_verified = true
        await otpRecord.save()

        return new OkResponse('Verify OTP successfully', otpRecord)
    }

    async forgotPasswordReset({
        password,
        id,
    }: {
        password: string
        id: string
    }) {
        const user = await userModel.findById(id)
        if (!user) {
            throw new BadRequestError('User not found')
        }
        // Kiểm tra OTP đã được xác thực hay chưa
        const otp = await otpModel.findOne({
            user_id: user._id,
            is_verified: true,
            expiration: { $gt: new Date() },
        })

        if (!otp) {
            throw new BadRequestError('OTP is not verified or expired')
        }

        //check if password is old password
        const isPasswordMatch = await bcrypt.compare(
            password,
            user.password as string
        )
        if (isPasswordMatch) {
            throw new BadRequestError(
                'New password must be different from old password'
            )
        }

        // Cập nhật mật khẩu
        user.password = password
        await user.save()

        // Xoá OTP sau khi đổi mật khẩu (tuỳ ý)
        await otpModel.deleteMany({ user_id: user._id })

        return new OkResponse('Password has been reset successfully')
    }
}

const authService = new AuthService()
export default authService
