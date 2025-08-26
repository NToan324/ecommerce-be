import emailConfig, { EmailPayload } from '../config/email'
import { BadRequestError } from '../core/error.response'
import { OkResponse } from '../core/success.response'

class EmailService {
    async sendEmailOTP({ email, otpCode }: EmailPayload) {
        const mailOptions = emailConfig.mailOptions({ email, otpCode })
        emailConfig.transporter.sendMail(
            mailOptions,
            (error: Error | null, info: { response: string }) => {
                if (error) {
                    throw new BadRequestError('Error sending email')
                } else {
                    return new OkResponse('Email sent', info.response)
                }
            }
        )
    }

    async sendEmailOrderConfirmation({ email, orderDetails }: any) {
        const mailOptions = emailConfig.orderConfirmationMailOptions({
            email,
            orderDetails,
        })

        emailConfig.transporter.sendMail(
            mailOptions,
            (error: Error | null, info: { response: string }) => {
                if (error) {
                    throw new BadRequestError('Error sending email')
                } else {
                    return new OkResponse('Email sent', info.response)
                }
            }
        )
    }

    async sendEmailCreateAccount({ email, name, password }: any) {
        const mailOptions = emailConfig.createAccountMailOptions({
            email,
            name,
            password,
        })

        emailConfig.transporter.sendMail(
            mailOptions,
            (error: Error | null, info: { response: string }) => {
                if (error) {
                    throw new BadRequestError('Error sending email')
                } else {
                    return new OkResponse('Email sent', info.response)
                }
            }
        )
    }
}

const emailService = new EmailService()
export default emailService
