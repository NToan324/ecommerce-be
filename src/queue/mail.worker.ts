import { mailQueue } from './mail.queue'
import emailService from '../services/sendEmail.service'

console.log('Mail worker started')
mailQueue.process(async (job) => {
    const { type } = job.data
    if (type === 'order_confirmation') {
        const { email, orderDetails } = job.data
        await emailService.sendEmailOrderConfirmation({ email, orderDetails })
    } else if (type === 'create_account') {
        const { email, name, password } = job.data
        await emailService.sendEmailCreateAccount({ email, name, password })
    }
})
