import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

const { EMAIL_USER, EMAIL_PASS } = process.env

if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error('Please set EMAIL_USER and EMAIL_PASS in your .env')
}

export interface EmailPayload {
    email: string
    otpCode: string
}

export interface CreateAccountPayload {
    email: string
    name: string
    password: string
}

class EmailConfig {
    transporter = nodemailer.createTransport({
        service: 'Gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS,
        },
    })

    mailOptions = ({ email, otpCode }: EmailPayload) => ({
        from: EMAIL_USER,
        to: email,
        subject: '🔐 Mã xác thực tài khoản (OTP)',
        replyTo: EMAIL_USER,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f9f9f9;">
        <h2 style="color: #333; text-align: center;">🔐 Xác thực Email</h2>
        <p style="color: #555; text-align: center;">Mã OTP của bạn là:</p>
        <div style="font-size: 32px; font-weight: bold; text-align: center; color: #ff5722; margin: 20px 0;">
          ${otpCode}
        </div>
        <p style="color: #777; text-align: center;">
          Mã này sẽ hết hạn sau 5 phút. Vui lòng không chia sẻ cho bất kỳ ai.
        </p>
        <hr style="border: 0; height: 1px; background: #ddd; margin: 20px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          ⚡ Đây là email tự động. Vui lòng không trả lời lại.
        </p>
      </div>
    `,
    })

    createAccountMailOptions = ({
        email,
        name,
        password,
    }: CreateAccountPayload) => ({
        from: EMAIL_USER,
        to: email,
        subject: '🎉 Tài khoản của bạn đã được tạo thành công!',
        replyTo: EMAIL_USER,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #f4f6f8;">
        <h2 style="color: #4caf50; text-align: center;">🎉 Chào mừng ${name}!</h2>
        <p style="color: #333;">Tài khoản của bạn đã được tạo thành công. Dưới đây là thông tin đăng nhập:</p>
        <ul style="list-style: none; padding: 0; color: #555;">
          <li><strong>👤 Email:</strong> ${email}</li>
          <li><strong>🔑 Mật khẩu:</strong> ${password}</li>
        </ul>
        <p style="color: #f44336;"><strong>Lưu ý:</strong> Hãy nhớ đổi mật khẩu sau khi đăng nhập.</p>
        <hr style="border: none; height: 1px; background: #ccc; margin: 20px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          📧 Email này được gửi tự động. Vui lòng không trả lời lại.
        </p>
      </div>
    `,
    })

    orderConfirmationMailOptions = ({
        email,
        orderDetails,
    }: {
        email: string
        orderDetails: any
    }) => {
        const currency = (amount: number) =>
            amount.toLocaleString('vi-VN', {
                style: 'currency',
                currency: 'VND',
            })

        const itemsHtml = orderDetails.items
            .map(
                (item: any) => `
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px;"><img src="${item.images.url}" alt="${
                    item.product_variant_name
                }" width="80"/></td>
              <td style="padding: 10px;">${item.product_variant_name}</td>
              <td style="padding: 10px; text-align: center;">${
                  item.quantity
              }</td>
              <td style="padding: 10px; text-align: right;">${currency(
                  item.unit_price
              )}</td>
              <td style="padding: 10px; text-align: right;">${(
                  item.discount * 100
              ).toFixed(0)}%</td>
              <td style="padding: 10px; text-align: right;">${currency(
                  item.unit_price * (1 - item.discount) * item.quantity
              )}</td>
            </tr>
          `
            )
            .join('')

        return {
            from: EMAIL_USER,
            to: email,
            subject: '📦 Xác nhận đơn hàng',
            replyTo: EMAIL_USER,
            text: `Cảm ơn bạn đã đặt hàng! Đơn hàng sẽ được giao đến: ${orderDetails.address}`,
            html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h2>🎉 Cảm ơn bạn, ${orderDetails.user_name}, đã đặt hàng!</h2>
            <p><strong>Địa chỉ giao hàng:</strong> ${orderDetails.address}</p>
            <p><strong>Phương thức thanh toán:</strong> ${
                orderDetails.payment_method === 'CASH'
                    ? 'Tiền mặt khi nhận hàng'
                    : orderDetails.payment_method
            }</p>
            <h3>🧾 Chi tiết đơn hàng:</h3>
            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f8f8f8; text-align: left;">
                  <th style="padding: 10px;">Ảnh</th>
                  <th style="padding: 10px;">Sản phẩm</th>
                  <th style="padding: 10px; text-align: center;">SL</th>
                  <th style="padding: 10px; text-align: right;">Đơn giá</th>
                  <th style="padding: 10px; text-align: right;">Giảm giá</th>
                  <th style="padding: 10px; text-align: right;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <br/>
            <p><strong>Tổng cộng:</strong> ${currency(
                orderDetails.total_amount
            )}</p>
            <p><strong>Điểm tích lũy sử dụng:</strong> ${
                orderDetails.loyalty_points_used
            }</p>
            <p><strong>Điểm tích lũy nhận được:</strong> ${
                orderDetails.loyalty_points_earned
            }</p>
            <p style="margin-top: 20px;">Chúng tôi sẽ sớm liên hệ với bạn để xác nhận và giao hàng.</p>
            <p>Chúc bạn một ngày tốt lành! 🌟</p>
          </div>
        `,
        }
    }
}

export default new EmailConfig()
