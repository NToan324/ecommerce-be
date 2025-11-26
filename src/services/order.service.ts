import OrderModel, { Order } from '@/models/order.model'
import { CreatedResponse, OkResponse } from '@/core/success.response'
import { BadRequestError } from '@/core/error.response'
import elasticsearchService from '@/services/elasticsearch.service'
import CartModel from '@/models/cart.model'
import UserModel, { User } from '@/models/user.model'
import authService from './auth.service'
import ProductVariantModel from '@/models/productVariant.model'
import { mailQueue } from '@/queue/mail.queue'
import CouponModel, { Coupon } from '@/models/coupon.model'

class OrderService {
    // Tạo đơn hàng
    async createOrder({
        user_id,
        user_name,
        email,
        coupon_code,
        address,
        items,
        payment_method,
        using_loyalty_points = true,
    }: {
        user_id?: string
        user_name?: string
        email?: string
        coupon_code?: string
        address: string
        items?: {
            product_variant_id: string
            product_variant_name: string
            attributes: Record<string, string>
            quantity: number
            original_price?: number
            unit_price: number
            discount?: number
            images: {
                url: string
            }
        }[]
        payment_method: string
        using_loyalty_points?: boolean
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

            item.original_price = product.original_price

            // Kiểm tra số lượng sản phẩm
            if (item.quantity > product.quantity) {
                throw new BadRequestError(
                    `Product ${item.product_variant_name} does not have enough stock`
                )
            }
        }

        // Kiểm tra trạng thái sản phẩm
        if (flagChangePrice) {
            if (user_id) {
                // Nếu có tài khoản
                // Cập nhật lại giá và discount trong Elasticsearch
                await elasticsearchService.updateDocument(
                    'carts',
                    cart[0]._id,
                    {
                        items: cartItems,
                    }
                )

                // Cập nhật lại giá và discount trong giỏ hàng của người dùng trong MongoDB
                await CartModel.findByIdAndUpdate(cart[0]._id, {
                    items: cartItems,
                })
            }

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
                                        'code': coupon_code,
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
        if (user_id && using_loyalty_points) {
            const user = await UserModel.findById(user_id)

            currentLoyaltyPoints = (user?.loyalty_points ||
                0.0) as unknown as number
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
            throw new BadRequestError(
                'Mã giảm giá không hợp lệ, số tiền giảm giá vượt quá tổng tiền hàng'
            )
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
                        address: [address],
                    } as Partial<User>)

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

        const { _id, ...orderWithoutId } = order.toJSON()

        // Thêm đơn hàng vào Elasticsearch
        await elasticsearchService.indexDocument(
            'orders',
            order._id.toString(),
            orderWithoutId
        )

        // Cập nhật lại số lượng sản phẩm trong Elasticsearch
        for (const item of cartItems) {
            // Cập nhật số lượng sản phẩm trong MongoDB
            const updatedProductVariant =
                await ProductVariantModel.findByIdAndUpdate(
                    {
                        _id: item.product_variant_id,
                        quantity: { $gte: item.quantity }, // Đảm bảo còn đủ hàng
                    },
                    {
                        $inc: { quantity: -item.quantity },
                    },
                    { new: true }
                )

            // Nếu không cập nhật được (không đủ hàng), rollback toàn bộ đơn hàng
            if (!updatedProductVariant) {
                await OrderModel.findByIdAndDelete(order._id)
                await elasticsearchService.deleteDocument(
                    'orders',
                    order._id.toString()
                )
                throw new BadRequestError(
                    `Product ${item.product_variant_name} does not have enough stock`
                )
            }

            const { _id, ...productVariantWithoutId } =
                updatedProductVariant.toJSON()

            // Cập nhật số lượng sản phẩm trong Elasticsearch
            await elasticsearchService.indexDocument(
                'product_variants',
                updatedProductVariant._id.toString(),
                productVariantWithoutId
            )
        }

        // Xóa giỏ hàng của người dùng trong Elasticsearch và MongoDB
        if (user_id && !isNewUser && cart.length > 0) {
            await elasticsearchService.deleteDocument('carts', cart[0]._id)
            await CartModel.findByIdAndDelete(cart[0]._id)
        }

        // Cập nhật lại số điểm thưởng cho người dùng
        if (user_id) {
            const updatedUser = await UserModel.findByIdAndUpdate(
                user_id,
                {
                    $set: {
                        loyalty_points:
                            loyalty_points_remaining + loyalty_points_earned,
                    },
                },
                { new: true }
            )

            if (updatedUser) {
                const { _id, ...userWithoutId } = updatedUser.toObject()
                // Cập nhật lại số điểm thưởng trong Elasticsearch
                await elasticsearchService.updateDocument(
                    'users',
                    _id.toString(),
                    userWithoutId
                )
            }
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
                    _id.toString(),
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
            ...{
                ...orderWithoutId,
                items: orderWithoutId.items.map((item: any) => {
                    const { original_price, ...rest } = item
                    return rest
                }),
            },
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
            return new OkResponse('No orders found', {
                total: 0,
                page: 1,
                limit: 10,
                totalPage: 0,
                data: [],
            })
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

    // Lấy chi tiết đơn hàng theo order_id (USER)
    async getOrderById(order_id: string, user_id: string) {
        // Tìm kiếm đơn hàng trong Elasticsearch
        const { total, response }: { total: any; response: any } =
            await elasticsearchService.searchDocuments('orders', {
                query: {
                    bool: {
                        must: {
                            term: {
                                _id: order_id,
                            },
                        },
                        filter: {
                            term: {
                                'user_id': user_id,
                            },
                        },
                    },
                },
            })

        // Kiểm tra nếu không tìm thấy đơn hàng
        if (total === 0) {
            throw new Error('Order not found')
        }

        const order = {
            _id: response[0]._id,
            ...{
                ...response[0]._source,
                items: response[0]._source.items.map((item: any) => {
                    const { original_price, ...rest } = item
                    return rest
                }),
            },
        }
        return new OkResponse('Get order successfully', order)
    }

    // Lấy chi tiết đơn hàng theo order_id (ADMIN)
    async getOrderByIdAdmin(order_id: string) {
        // Tìm kiếm đơn hàng trong Elasticsearch
        const { total, response }: { total: any; response: any } =
            await elasticsearchService.searchDocuments('orders', {
                query: {
                    term: {
                        _id: order_id,
                    },
                },
            })

        // Kiểm tra nếu không tìm thấy đơn hàng
        if (total === 0) {
            throw new Error('Order not found')
        }

        const order = {
            _id: response[0]._id,
            ...response[0]._source,
        }
        return new OkResponse('Get order successfully', order)
    }

    async getOrdersByUserId({
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
            return new OkResponse('No orders found', {
                total: 0,
                page: 1,
                limit: 10,
                totalPages: 0,
                data: [],
            })
        }

        // Xử lý kết quả trả về
        const orders = response.map((hit: any) => ({
            _id: hit._id,
            ...{
                ...hit._source,
                items: hit._source.items.map((item: any) => {
                    const { original_price, ...rest } = item
                    return rest
                }),
            },
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

    async updateOrderStatus(order_id: string, status: string) {
        const validStatuses = ['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED']

        // Kiểm tra trạng thái hợp lệ
        if (!validStatuses.includes(status)) {
            throw new BadRequestError('Invalid status')
        }

        const order = await OrderModel.findById(order_id)
        if (!order) {
            throw new BadRequestError('Order not found')
        }

        // Cập nhật trạng thái thanh toán nếu cần
        let updatedPaymentStatus = order.payment_status
        if (order.payment_method === 'CASH' && status === 'DELIVERED') {
            updatedPaymentStatus = 'PAID'
        }

        const updatedOrder = await OrderModel.findByIdAndUpdate(
            order_id,
            {
                $set: {
                    status: status as
                        | 'PENDING'
                        | 'SHIPPING'
                        | 'DELIVERED'
                        | 'CANCELLED',
                    payment_status: updatedPaymentStatus,
                },
                $push: {
                    order_tracking: {
                        status,
                        updated_at: new Date(),
                    },
                },
            },
            { new: true }
        )

        if (!updatedOrder) {
            throw new BadRequestError('Error updating order')
        }

        const { _id, ...orderWithoutId } = updatedOrder.toJSON()

        // Cập nhật dữ liệu trên Elasticsearch
        await elasticsearchService.updateDocument(
            'orders',
            _id.toString(),
            orderWithoutId
        )

        return new OkResponse('Order status updated successfully', {
            _id,
            ...orderWithoutId,
        })
    }

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
                match: {
                    user_name: {
                        query: customer_name,
                        operator: 'and',
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
            return new OkResponse('No order found', {
                total: 0,
                page: 1,
                limit: 10,
                totalPage: 0,
                data: [],
            })
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

    async searchOrdersByOrderIdOrItemName({
        user_id,
        query,
        page = 1,
        limit = 10,
    }: {
        user_id: string
        query: string
        page?: number
        limit?: number
    }) {
        const must: any[] = [
            {
                term: {
                    user_id: user_id,
                },
            },
        ]

        console.log('Search query:', query)

        if (query && query.trim() !== '') {
            const should: any[] = [
                {
                    term: {
                        _id: query,
                    },
                },
                {
                    match: {
                        'items.product_variant_name': {
                            query: query,
                            operator: 'and',
                        },
                    },
                },
            ]

            must.push({
                bool: {
                    should: should,
                    minimum_should_match: 1,
                },
            })
        }

        const from = (page - 1) * limit

        // Cấu hình query Elasticsearch
        const queryBody: any = {
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

        const { total, response } = await elasticsearchService.searchDocuments(
            'orders',
            queryBody
        )

        if (total === 0) {
            return new OkResponse('No order found', {
                total: 0,
                page: 1,
                limit: 10,
                totalPage: 0,
                data: [],
            })
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
}

const orderService = new OrderService()
export default orderService
