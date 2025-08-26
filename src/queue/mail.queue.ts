import Queue from 'bull'
import { redisConfig } from '../config/redis'

// Lấy URL từ client options
const redisUrl =
    redisConfig.getClient().options?.url || 'redis://localhost:6379'

export const mailQueue = new Queue('mailQueue', redisUrl)
