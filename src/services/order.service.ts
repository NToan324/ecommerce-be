import OrderModel, { Order } from '@/models/order.model'
import { CreatedResponse, OkResponse } from '@/core/success.response'
import { BadRequestError } from '@/core/error.response'
import elasticsearchService from '@/services/elasticsearch.service'
import CartModel from '@/models/cart.model'
import UserModel from '@/models/user.model'
import authService from './auth.service'
import ProductVariantModel from '@/models/productVariant.model'
import { mailQueue } from '@/queue/mail.queue'
import CouponModel, { Coupon } from '@/models/coupon.model'

class OrderService {
    // Tìm kiếm đơn hàng theo các tiêu chí
    async searchOrder({
        customer_name,
        order_id,
        status,
        payment_status,
        payment_method,
        from_date,
        to_date,
        page = 1,
        limit = 10,
    }: {
        customer_name?: string
        order_id?: string
        status?: string
        payment_status?: string
        payment_method?: string
        from_date?: string
        to_date?: string
        page?: number
        limit?: number
    }) {
        const must: any[] = []

        // Tìm kiếm theo tên khách hàng
        if (customer_name) {
            must.push({
                wildcard: {
                    'user_name.keyword': {
                        value: `*${customer_name}*`,
                        case_insensitive: true,
                    },
                },
            })
        }

        // Tìm kiếm theo order_id
        if (order_id) {
            must.push({
                term: {
                    _id: order_id,
                },
            })
        }

        // Tìm kiếm theo trạng thái đơn hàng
        if (status) {
            must.push({
                term: {
                    status: status,
                },
            })
        }

        // Tìm kiếm theo trạng thái thanh toán
        if (payment_status) {
            must.push({
                term: {
                    payment_status: payment_status,
                },
            })
        }

        // Tìm kiếm theo phương thức thanh toán
        if (payment_method) {
            must.push({
                term: {
                    payment_method: payment_method,
                },
            })
        }

        // Lọc theo khoảng thời gian
        if (from_date || to_date) {
            const from = from_date ? new Date(from_date) : undefined
            const to = to_date ? new Date(to_date) : undefined

            const fromISO = from ? from.toISOString() : undefined
            const toISO = to ? to.toISOString() : undefined

            must.push({
                range: {
                    createdAt: {
                        ...(from_date && { gte: fromISO }),
                        ...(to_date && { lte: toISO }),
                    },
                },
            })
        }

        const from = (page - 1) * limit

        // Cấu hình query Elasticsearch
        const query: any = {
            from,
            size: limit,
            query: {
                bool: {
                    must,
                },
            },
            sort: [
                {
                    createdAt: {
                        order: 'desc', // Sắp xếp theo thời gian tạo (mới nhất trước)
                    },
                },
            ],
        }

        // Thực hiện tìm kiếm trong Elasticsearch
        const { total, response } = await elasticsearchService.searchDocuments(
            'orders',
            query
        )

        if (total === 0) {
            return new OkResponse('No order found', [])
        }

        // Xử lý kết quả trả về
        const orders = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil((total ?? 0) / limit),
            data: orders,
        }
    }

    async createOrder({
        user_id,
        user_name,
        email,
        coupon_code,
        address,
        items,
        payment_method,
    }: {
        user_id?: string
        user_name?: string
        email?: string
        coupon_code?: string
        address: string
        items?: {
            product_variant_id: string
            product_variant_name: string
            quantity: number
            unit_price: number
            discount?: number
            images: {
                url: string
            }
        }[]
        payment_method: string
    }) {
        let cartItems = items || [] // Danh sách sản phẩm trong giỏ hàng
        let discountAmount = 0
        let cart: any[] = []

        // Trường hợp có `user_id`
        if (user_id) {
            // Lấy danh sách items từ giỏ hàng trong Elasticsearch
            const cartResponse = await elasticsearchService.searchDocuments(
                'carts',
                {
                    query: {
                        term: {
                            user_id,
                        },
                    },
                }
            )

            const { total: totalCart, response } = cartResponse

            if (totalCart === 0) {
                throw new BadRequestError('Cart is empty')
            }

            cart = response

            cartItems = (cart[0] as { _id: string; _source: { items: any[] } })
                ._source.items
        }

        // Lấy danh sách product_variant_id từ giỏ hàng
        const productVariantIds = cartItems.map(
            (item: any) => item.product_variant_id
        )

        // Search các sản phẩm trong index product_variants
        const { total: totalProducts, response: products } =
            await elasticsearchService.searchDocuments('product_variants', {
                query: {
                    bool: {
                        must: [
                            {
                                terms: {
                                    _id: productVariantIds,
                                },
                            },
                        ],
                        filter: [
                            {
                                term: {
                                    isActive: true,
                                },
                            },
                        ],
                    },
                },
            })

        if (totalProducts === 0) {
            throw new BadRequestError('Products not found')
        }

        const productMap = new Map()
        products.forEach((product: any) => {
            productMap.set(product._id, product._source)
        })

        let flagChangePrice = false

        // Kiểm tra thông tin sản phẩm và cập nhật nếu cần
        for (const item of cartItems) {
            const product = productMap.get(item.product_variant_id)

            if (!product) {
                throw new BadRequestError(
                    `Product with ID ${item.product_variant_id}, Name ${item.product_variant_name} not found or not available`
                )
            }

            // Kiểm tra giá và discount
            if (
                item.unit_price !== product.price ||
                item.discount !== product.discount
            ) {
                // Cập nhật lại giá và discount trong giỏ hàng
                item.unit_price = product.price
                item.discount = product.discount

                flagChangePrice = true
            }

            // Kiểm tra số lượng sản phẩm
            if (item.quantity > product.quantity) {
                throw new BadRequestError(
                    `Product ${item.product_variant_name} does not have enough stock`
                )
            }
        }

        // Kiểm tra trạng thái sản phẩm
        if (flagChangePrice && user_id) {
            // Cập nhật lại giá và discount trong Elasticsearch
            await elasticsearchService.updateDocument('carts', cart[0]._id, {
                items: cartItems,
            })

            // Cập nhật lại giá và discount trong giỏ hàng của người dùng trong MongoDB
            await CartModel.findByIdAndUpdate(cart[0]._id, {
                items: cartItems,
            })

            throw new BadRequestError(
                `Product information has changed. Please review your cart.`
            )
        }

        // Kiểm tra coupon_code nếu có
        let coupon: any = null
        if (coupon_code) {
            const { total: totalCoupons, response: coupons } =
                await elasticsearchService.searchDocuments('coupons', {
                    query: {
                        bool: {
                            must: [
                                {
                                    term: {
                                        code: coupon_code,
                                    },
                                },
                            ],
                            filter: [
                                {
                                    term: {
                                        isActive: true,
                                    },
                                },
                            ],
                        },
                    },
                })

            if (totalCoupons === 0) {
                throw new BadRequestError('Invalid coupon code')
            }

            coupon = coupons[0]._source

            if (coupon.usage_count >= coupon.usage_limit) {
                throw new BadRequestError('Coupon usage limit has been reached')
            }

            discountAmount = coupon.discount_amount || 0.0
        }

        let currentLoyaltyPoints: number = 0.0
        if (user_id) {
            const user = await UserModel.findById(user_id)

            currentLoyaltyPoints = (user?.loyalty_points as number) || 0.0
        }

        // Tính tổng tiền
        const shipping_fee = 49000.0 // Ví dụ: phí vận chuyển là 0
        const tax_rate = 0.1 // Ví dụ: thuế là 10%

        const subtotal = cartItems.reduce(
            (sum: number, item: any) =>
                sum +
                item.quantity * item.unit_price * (1 - (item.discount || 0.0)),
            0
        )

        const tax = subtotal * tax_rate // Tính thuế dựa trên tổng tiền hàng
        let totalAmount = subtotal + shipping_fee + tax

        // Nếu số tiền giảm giá lớn hơn tổng tiền hàng, thì không cho phép
        if (totalAmount - discountAmount < 0) {
            throw new BadRequestError('Mã giảm giá không hợp lệ')
        }

        // Nếu số tiền giảm giá bằng số điểm thưởng lớn hơn 50% tổng tiền hàng, thì chỉ được giảm tối đa 50% tổng tiền hàng
        let discountAmoutLoyaltyPointsMax = currentLoyaltyPoints * 1000 // 1 điểm thưởng = 1000đ

        let discountAmoutLoyaltyPoints = discountAmoutLoyaltyPointsMax
        if (discountAmoutLoyaltyPoints > totalAmount * 0.5) {
            discountAmoutLoyaltyPoints = Math.floor(totalAmount * 0.5)
        }
        const loyalty_points_used = Math.floor(
            discountAmoutLoyaltyPoints / 1000
        ) // Số điểm thưởng được sử dụng

        // Tính tổng tiền sau khi áp dụng mã giảm giá
        totalAmount = Math.floor(
            totalAmount - discountAmount - discountAmoutLoyaltyPoints
        )

        const loyalty_points_remaining =
            currentLoyaltyPoints - loyalty_points_used // Số điểm thưởng còn lại

        const loyalty_points_earned = Math.round(subtotal * 0.0001) // 10% số tiền đơn hàng sẽ được quy đổi thành điểm thưởng

        // Tạo tài khoản người dùng nếu không có
        let isNewUser = false
        if (!user_id) {
            if (!user_name || !email) {
                throw new BadRequestError('User name and email are required')
            }

            if (email) {
                const existingUser = await UserModel.findOne({ email })

                if (existingUser) {
                    user_id = existingUser._id.toString()
                } else {
                    // Tạo tài khoản người dùng mới với mật khẩu ngẫu nhiên
                    const randomPassword = Math.random().toString(36).slice(-8) // Mật khẩu ngẫu nhiên

                    const newUser = await authService.signup({
                        email,
                        fullName: user_name,
                        password: randomPassword,
                    })

                    user_id = newUser.id.toString()

                    // Gửi email thông báo tạo tài khoản mới
                    await mailQueue.add({
                        type: 'create_account',
                        email,
                        name: user_name,
                        password: randomPassword,
                    })
                    isNewUser = true
                }
            }
        }

        // Kiểm tra phương thức thanh toán
        const validPaymentMethods = ['CASH', 'BANK_TRANSFER']
        if (!validPaymentMethods.includes(payment_method)) {
            throw new BadRequestError('Invalid payment method')
        }
        let payment_status = 'PENDING'
        if (payment_method === 'BANK_TRANSFER') {
            payment_status = 'PAID'
        }

        // Tạo đơn hàng trong MongoDB
        const order = await OrderModel.create({
            user_id,
            user_name,
            email,
            coupon_code,
            address,
            items: cartItems,
            total_amount: totalAmount,
            discount_amount: discountAmount,
            payment_status,
            loyalty_points_used,
            loyalty_points_earned,
            payment_method,
        })

        if (!order) {
            throw new BadRequestError('Failed to create order')
        }

        const { _id, ...orderWithoutId } = order.toObject()

        // Thêm đơn hàng vào Elasticsearch
        await elasticsearchService.indexDocument(
            'orders',
            order._id.toString(),
            orderWithoutId
        )

        // Cập nhật lại số lượng sản phẩm trong Elasticsearch
        for (const item of cartItems) {
            await elasticsearchService.updateDocument(
                'product_variants',
                item.product_variant_id,
                {
                    quantity:
                        productMap.get(item.product_variant_id).quantity -
                        item.quantity,
                }
            )

            // Cập nhật lại số lượng sản phẩm trong MongoDB
            await ProductVariantModel.findByIdAndUpdate(
                item.product_variant_id,
                {
                    quantity:
                        productMap.get(item.product_variant_id).quantity -
                        item.quantity,
                }
            )
        }

        // Xóa giỏ hàng của người dùng trong Elasticsearch và MongoDB
        if (user_id && !isNewUser && cart.length > 0) {
            await elasticsearchService.deleteDocument('carts', cart[0]._id)
            await CartModel.findByIdAndDelete(cart[0]._id)
        }

        // Cập nhật lại số điểm thưởng cho người dùng
        if (user_id) {
            await UserModel.findByIdAndUpdate(user_id, {
                loyalty_points:
                    loyalty_points_earned + loyalty_points_remaining,
            })

            await elasticsearchService.updateDocument('users', user_id, {
                loyalty_points:
                    loyalty_points_earned + loyalty_points_remaining,
            })
        }

        // Cập nhật lại số lần sử dụng mã giảm giá
        if (coupon_code) {
            // Cập nhật lại số lần sử dụng mã giảm giá trong MongoDB
            const updatedCoupon = await CouponModel.findOneAndUpdate(
                { code: coupon_code },
                {
                    $inc: { usage_count: 1 },
                    $push: {
                        orders_used: order._id,
                    },
                },
                { new: true }
            )

            if (!updatedCoupon) {
                throw new BadRequestError('Coupon not found')
            }

            const { _id, ...couponWithoutId } = updatedCoupon.toObject()

            // Cập nhật lại số lần sử dụng mã giảm giá trong Elasticsearch
            if (updatedCoupon) {
                await elasticsearchService.updateDocument(
                    'coupons',
                    coupon_code,
                    couponWithoutId
                )
            }
        }

        // Dùng message queue để gửi email thông báo đơn hàng
        console.log('Sending email to:', email)
        await mailQueue.add({
            type: 'order_confirmation',
            email,
            orderDetails: {
                order_id: order._id,
                user_name,
                address,
                items: cartItems,
                total_amount: totalAmount,
                discount_amount: discountAmount,
                loyalty_points_used,
                loyalty_points_earned,
                payment_method,
            },
        })

        return new CreatedResponse('Order created successfully', {
            _id,
            ...orderWithoutId,
        })
    }

    async getOrders({
        page = 1,
        limit = 10,
    }: {
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit

        // Tìm kiếm đơn hàng trong Elasticsearch
        let total: any
        let response: any[] = []
        try {
            ;({ total, response } = await elasticsearchService.searchDocuments(
                'orders',
                {
                    from,
                    size: limit,
                    query: {
                        match_all: {},
                    },
                    sort: [
                        {
                            createdAt: {
                                order: 'desc',
                            },
                        },
                    ],
                }
            ))
        } catch (error: any) {
            return new OkResponse('No orders found', [])
        }

        const orders = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return new OkResponse('Get orders successfully', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil((total ?? 0) / limit),
            data: orders,
        })
    }

    async getOrderById(order_id: string) {
        // Tìm kiếm đơn hàng trong Elasticsearch
        const { total, response } = await elasticsearchService.searchDocuments(
            'orders',
            {
                query: {
                    term: {
                        _id: order_id,
                    },
                },
            }
        )

        // Kiểm tra nếu không tìm thấy đơn hàng
        if (total === 0) {
            throw new Error('Order not found')
        }

        const order = { _id: response[0]._id, ...(response[0]._source || {}) }
        return new OkResponse('Get product successfully', order)
    }

    async getOrderByUserId({
        user_id,
        page = 1,
        limit = 10,
    }: {
        user_id: string
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit

        // Tìm kiếm đơn hàng trong Elasticsearch
        let total: any
        let response: any[] = []
        try {
            ;({ total, response } = await elasticsearchService.searchDocuments(
                'orders',
                {
                    from,
                    size: limit,
                    query: {
                        term: {
                            user_id,
                        },
                    },
                    sort: [
                        {
                            createdAt: {
                                order: 'desc',
                            },
                        },
                    ],
                }
            ))
        } catch (error: any) {
            return new OkResponse('No orders found', [])
        }

        // Xử lý kết quả trả về
        const orders = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        return new OkResponse('Get orders successfully', orders)
    }

    async updateOrderStatus(order_id: string, status: string) {
        const validStatuses = ['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED']

        // Kiểm tra trạng thái hợp lệ
        if (!validStatuses.includes(status)) {
            throw new BadRequestError('Invalid status')
        }

        // Tìm kiếm đơn hàng trong Elasticsearch
        let order: Order
        try {
            order = (await elasticsearchService.getDocumentById(
                'orders',
                order_id
            )) as Order
        } catch (error: any) {
            if (error.statusCode === 404) {
                throw new BadRequestError('Order not found')
            }
            throw new BadRequestError('Error searching order')
        }

        // Cập nhật trạng thái thanh toán nếu cần
        let updatedPaymentStatus = order.payment_status
        if (order.payment_method === 'CASH' && status === 'DELIVERED') {
            updatedPaymentStatus = 'PAID'
        }

        // Thêm trạng thái mới vào order_tracking
        order.order_tracking.push({
            status,
            updated_at: new Date(),
        })

        // Cập nhật trạng thái hiện tại và trạng thái thanh toán
        order.status = status as
            | 'PENDING'
            | 'SHIPPING'
            | 'DELIVERED'
            | 'CANCELLED'
        order.payment_status = updatedPaymentStatus

        // Lưu thay đổi vào MongoDB
        const updatedOrder = await OrderModel.findByIdAndUpdate(
            order_id,
            order,
            {
                new: true,
            }
        )

        if (!updatedOrder) {
            throw new BadRequestError('Error updating order')
        }

        const { _id, ...orderWithoutId } = updatedOrder.toObject()

        // Cập nhật dữ liệu trên Elasticsearch
        await elasticsearchService.updateDocument('orders', order_id, {
            status,
            payment_status: updatedPaymentStatus,
            order_tracking: order.order_tracking,
        })

        return new OkResponse('Order status updated successfully', {
            _id,
            ...orderWithoutId,
        })
    }
}

const orderService = new OrderService()
export default orderService
