import { BadRequestError } from '@/core/error.response'
import { OkResponse, CreatedResponse } from '@/core/success.response'
import CartModel, { Cart } from '@/models/cart.model'
import ProductVariantModel, {
    ProductVariant,
} from '@/models/productVariant.model'
import elasticsearchService from './elasticsearch.service'

class CartService {

    // Add item to cart
    async addItemToCart({
        userId,
        productVariantId,
        quantity,
    }: {
        userId: string
        productVariantId: string
        quantity: number
    }) {
        // Lấy thông tin sản phẩm từ ES để kiểm tra
        const { total, response } = await elasticsearchService.searchDocuments(
            'product_variants',
            {
                query: {
                    bool: {
                        must: [{ term: { _id: productVariantId } }],
                        filter: [{ term: { isActive: true } }],
                    },
                },
            }
        )

        if (total === 0) {
            throw new BadRequestError('Product variant not found')
        }

        const productVariant: ProductVariant = response[0]
            ._source as ProductVariant

        // Tìm và cập nhật giỏ hàng trong MongoDB
        const updatedCart = await CartModel.findOneAndUpdate(
            {
                user_id: userId,
                'items.product_variant_id': productVariantId,
            },
            {
                // $inc: Tăng trường quantity của phần tử mảng khớp điều kiện
                $inc: { 'items.$[elem].quantity': quantity },
            },
            {
                arrayFilters: [{ 'elem.product_variant_id': productVariantId }],
                new: true, // Trả về tài liệu đã được cập nhật
            }
        )

        // Cập nhật thành công
        if (updatedCart) {
            const { _id, ...cartWithoutId } = updatedCart.toJSON()

            // Đồng bộ kết quả đúng từ Mongo lên ES
            await elasticsearchService.indexDocument(
                'carts',
                _id.toString(),
                cartWithoutId
            )

            return new OkResponse('Item added to cart successfully', {
                _id: _id,
                ...{
                    ...cartWithoutId,
                    items: cartWithoutId.items.map((item: any) => {
                        const { original_price, ...rest } = item
                        return rest
                    }),
                },
            })
        }

        
        // Item chưa có, hoặc giỏ hàng chưa có.
        // Tạo đối tượng item mới
        const newItem = {
            product_variant_id: productVariantId,
            product_variant_name: productVariant.variant_name,
            attributes: productVariant.attributes,
            quantity,
            original_price: productVariant.original_price,
            unit_price: productVariant.price,
            discount: productVariant.discount,
            images: productVariant.images[0],
        }

        // Dùng findOneAndUpdate với upsert: true
        // Nó sẽ tìm giỏ hàng của user, $push item mới vào
        // Nếu không tìm thấy giỏ hàng, nó sẽ tạo giỏ hàng mới ($setOnInsert)
        // và $push item đó vào.
        const newOrUpdatedCart = await CartModel.findOneAndUpdate(
            { user_id: userId },
            {
                $push: { items: newItem },
                $setOnInsert: { user_id: userId }, // Chỉ set khi tạo mới
            },
            {
                upsert: true, // Tạo mới nếu không tìm thấy
                new: true, // Trả về tài liệu mới/đã cập nhật
            }
        )

        if (!newOrUpdatedCart) {
            throw new BadRequestError('Failed to create or update cart')
        }

        const { _id, ...cartWithoutId } = newOrUpdatedCart.toJSON()

        // Đồng bộ kết quả đúng từ Mongo lên ES
        await elasticsearchService.indexDocument(
            'carts',
            _id.toString(),
            cartWithoutId
        )

        return new CreatedResponse('Item added to cart successfully', {
            _id: _id,
            ...{
                ...cartWithoutId,
                items: cartWithoutId.items.map((item: any) => {
                    const { original_price, ...rest } = item
                    return rest
                }),
            },
        })
    }

    // Get cart by user ID
    async getCart(userId: string) {
        const { total, response }: { total: any; response: any[] } =
            await elasticsearchService.searchDocuments('carts', {
                query: {
                    term: {
                        user_id: userId,
                    },
                },
            })

        if (total === 0) {
            return new OkResponse('Cart is empty', [])
        }

        const cart: any = {
            _id: response[0]._id,
            ...{
                ...response[0]._source,
                items: response[0]._source.items.map((item: any) => {
                    const { original_price, ...rest } = item
                    return rest
                }),
            },
        }

        return new OkResponse('Cart retrieved successfully', cart)
    }

    // // Update item quantity in cart
    // async updateItemQuantity({
    //     userId,
    //     productVariantId,
    //     quantity,
    // }: {
    //     userId: string
    //     productVariantId: string
    //     quantity: number
    // }) {
    //     const { total, response } = await elasticsearchService.searchDocuments(
    //         'product_variants',
    //         {
    //             query: {
    //                 bool: {
    //                     must: [
    //                         {
    //                             term: { _id: productVariantId },
    //                         },
    //                     ],
    //                     filter: [
    //                         {
    //                             term: { isActive: true },
    //                         },
    //                     ],
    //                 },
    //             },
    //         }
    //     )

    //     if (total === 0) {
    //         throw new BadRequestError('Product variant not found')
    //     }

    //     let cartResponse = await elasticsearchService.searchDocuments('carts', {
    //         query: {
    //             term: {
    //                 user_id: userId,
    //             },
    //         },
    //     })

    //     const { total: totalCart, response: cart } = cartResponse

    //     if (totalCart === 0) {
    //         throw new BadRequestError('Cart not found')
    //     }

    //     const cartId = cart[0]?._id?.toString()
    //     const cartSource = cart[0]._source as {
    //         items: {
    //             product_variant_id: string
    //             quantity: number
    //             unit_price: number
    //         }[]
    //     }

    //     const existingItem = cartSource.items.find(
    //         (item) => item.product_variant_id.toString() === productVariantId
    //     )

    //     if (!existingItem) {
    //         throw new BadRequestError('Item not found in cart')
    //     }

    //     existingItem.quantity = quantity

    //     const updatedCart = await CartModel.findByIdAndUpdate(
    //         cartId,
    //         { items: cartSource.items },
    //         { new: true }
    //     )

    //     if (!updatedCart) {
    //         throw new BadRequestError('Failed to update cart')
    //     }

    //     const { _id, ...cartWithoutId } = updatedCart.toObject()

    //     // Update the cart in Elasticsearch
    //     await elasticsearchService.indexDocument(
    //         'carts',
    //         _id.toString(),
    //         cartWithoutId
    //     )

    //     return new OkResponse('Item quantity updated successfully', {
    //         _id: _id,
    //         ...{
    //             ...cartWithoutId,
    //             items: cartWithoutId.items.map((item: any) => {
    //                 const { original_price, ...rest } = item
    //                 return rest
    //             }),
    //         },
    //     })
    // }
    // Update item quantity in cart
    async updateItemQuantity({
        userId,
        productVariantId,
        quantity,
    }: {
        userId: string
        productVariantId: string
        quantity: number
    }) {
        // Kiểm tra sản phẩm có tồn tại và đang hoạt động không
        const { total } = await elasticsearchService.searchDocuments(
            'product_variants',
            {
                query: {
                    bool: {
                        must: [{ term: { _id: productVariantId } }],
                        filter: [{ term: { isActive: true } }],
                    },
                },
            }
        )

        if (total === 0) {
            throw new BadRequestError('Product variant not found')
        }

        // Cập nhật số lượng trong MongoDB
        const updatedCart = await CartModel.findOneAndUpdate(
            {
                user_id: userId, // Tìm giỏ hàng của user
                'items.product_variant_id': productVariantId, // Đảm bảo item có trong giỏ
            },
            {
                // Chỉ $set (cập nhật) trường 'quantity' của phần tử mảng khớp điều kiện
                $set: { 'items.$[elem].quantity': quantity },
            },
            {
                // 'arrayFilters' chỉ định điều kiện để tìm 'elem'
                arrayFilters: [{ 'elem.product_variant_id': productVariantId }],
                new: true, // Yêu cầu trả về tài liệu sau khi đã cập nhật
            }
        )

        if (!updatedCart) {
            // Nếu không tìm thấy (do sai userId hoặc sai productVariantId trong giỏ)
            // Kiểm tra xem giỏ hàng có tồn tại không
            const cartExists = await CartModel.findOne({ user_id: userId });
            if (!cartExists) {
                throw new BadRequestError('Cart not found')
            }
            // Nếu giỏ hàng tồn tại, nghĩa là item không có trong giỏ
            throw new BadRequestError('Item not found in cart')
        }

        
        const { _id, ...cartWithoutId } = updatedCart.toJSON()

        // Dồng bộ kết quả đúng từ Mongo lên ES
        await elasticsearchService.indexDocument(
            'carts',
            _id.toString(),
            cartWithoutId
        )

        return new OkResponse('Item quantity updated successfully', {
            _id: _id,
            ...{
                ...cartWithoutId,
                items: cartWithoutId.items.map((item: any) => {
                    const { original_price, ...rest } = item
                    return rest
                }),
            },
        })
    }

    // Remove item from cart
    async removeItemFromCart({
        userId,
        productVariantId,
    }: {
        userId: string
        productVariantId: string
    }) {
        
        // Remove item from MongoDB
        const updatedCart = await CartModel.findOneAndUpdate(
            {
                user_id: userId,
            },
            {
                $pull: { items: { product_variant_id: productVariantId } },
            },
            {
                new: true,
            }
        )

        if (!updatedCart) {
            throw new BadRequestError('Cart not found')
        }

        const { _id, ...cartWithoutId } = updatedCart.toJSON()

        // Update the cart in Elasticsearch
        await elasticsearchService.indexDocument(
            'carts',
            _id.toString(),
            cartWithoutId
        )

        return new OkResponse('Item removed from cart successfully', {
            _id: _id,
            ...{
                ...cartWithoutId,
                items: cartWithoutId.items.map((item: any) => {
                    const { original_price, ...rest } = item
                    return rest
                }),
            },
        })
    }

    // Clear cart
    async clearCart(userId: string) {
        const deletedCart = await CartModel.findOneAndDelete({ user_id: userId })

        if (!deletedCart) {
            throw new BadRequestError('Cart not found')
        }

        // Delete the cart from Elasticsearch
        await elasticsearchService.deleteDocument(
            'carts',
            deletedCart._id.toString()
        )

        return new OkResponse('Cart cleared successfully', {})
    }
}

const cartService = new CartService()
export default cartService
