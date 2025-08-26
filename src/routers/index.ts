import { Router } from 'express'
import authRouter from '@/routers/auth.route'
import brandRouter from '@/routers/brand.route'
import categoryRouter from '@/routers/category.route'
import productRouter from '@/routers/product.route'
import productVariantRouter from '@/routers/productVariant.route'
import userRouter from '@/routers/user.route'
import orderRouter from '@/routers/order.route'
import verifyJWT from '@/middleware/verifyJWT'
import cartRouter from '@/routers/cart.route'
import couponRouter from '@/routers/coupon.route'
import chatRouter from '@/routers/chat.route'
import statisticRouter from '@/routers/statistic.route'

const router = Router()
router.use('/auth', authRouter)
router.use('/brand', brandRouter)
router.use('/category', categoryRouter)
router.use('/product/variant', productVariantRouter)
router.use('/product', productRouter)
router.use('/cart', cartRouter)
router.use('/order', orderRouter)
router.use('/user', userRouter)
router.use('/coupon', couponRouter)
router.use('/chat', chatRouter)
router.use('/statistic', statisticRouter)
router.use(verifyJWT)

export default router
