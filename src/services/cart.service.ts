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
        const { total, response } = await elasticsearchService.searchDocuments(
            'product_variants',
            {
                query: {
                    bool: {
                        must: [
                            {
                                term: { _id: productVariantId },
                            },
                        ],
                        filter: [
                            {
                                term: { isActive: true },
                            },
                        ],
                    },
                },
            }
        )

        if (total === 0) {
            throw new BadRequestError('Product variant not found')
        }

        const productVariant: ProductVariant = response[0]
            ._source as ProductVariant

        let cartResponse = await elasticsearchService.searchDocuments('carts', {
            query: {
                term: {
                    user_id: userId,
                },
            },
        })

        const { total: totalCart, response: cart } = cartResponse

        if (totalCart === 0) {
            const newCart = await CartModel.create({
                user_id: userId,
                items: [
                    {
                        product_variant_id: productVariantId,
                        product_variant_name: productVariant.variant_name,
                        quantity,
                        unit_price: productVariant.price,
                        discount: productVariant.discount,
                        images: productVariant.images[0],
                    },
                ],
            })

            if (!newCart) {
                throw new BadRequestError('Failed to create cart')
            }

            const { _id, ...cartWithoutId } = newCart.toObject()

            // Index the new cart in Elasticsearch
            await elasticsearchService.indexDocument(
                'carts',
                _id.toString(),
                cartWithoutId
            )

            return new CreatedResponse('Cart created successfully', {
                _id,
                ...cartWithoutId,
            })
        } else {
            const cartId = cart[0]?._id?.toString()

            const cartSource = cart[0]._source as { items: any[] }

            const existingItem = cartSource.items.find(
                (item) =>
                    item.product_variant_id.toString() === productVariantId
            )

            if (existingItem) {
                existingItem.quantity += quantity
            } else {
                cartSource.items.push({
                    product_variant_id: productVariantId,
                    product_variant_name: productVariant.variant_name,
                    quantity,
                    unit_price: productVariant.price,
                    discount: productVariant.discount,
                    images: productVariant.images[0],
                })
            }

            const updatedCart = await CartModel.findByIdAndUpdate(
                cartId,
                { items: cartSource.items },
                { new: true }
            )

            if (!updatedCart) {
                throw new BadRequestError('Failed to update cart')
            }

            const { _id, ...cartWithoutId } = updatedCart.toObject()

            // Update the cart in Elasticsearch
            await elasticsearchService.indexDocument(
                'carts',
                _id.toString(),
                cartWithoutId
            )

            return new OkResponse('Item added to cart successfully', {
                _id,
                ...cartWithoutId,
            })
        }
    }

    // Get cart by user ID
    async getCart(userId: string) {
        const { total, response } = await elasticsearchService.searchDocuments(
            'carts',
            {
                query: {
                    term: {
                        user_id: userId,
                    },
                },
            }
        )

        if (total === 0) {
            return new OkResponse('Cart is empty', [])
        }

        const cart: any = {
            _id: response[0]._id,
            ...(response[0]._source || {}),
        }

        return new OkResponse('Cart retrieved successfully', cart)
    }

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
        const { total, response } = await elasticsearchService.searchDocuments(
            'product_variants',
            {
                query: {
                    bool: {
                        must: [
                            {
                                term: { _id: productVariantId },
                            },
                        ],
                        filter: [
                            {
                                term: { isActive: true },
                            },
                        ],
                    },
                },
            }
        )

        if (total === 0) {
            throw new BadRequestError('Product variant not found')
        }

        let cartResponse = await elasticsearchService.searchDocuments('carts', {
            query: {
                term: {
                    user_id: userId,
                },
            },
        })

        const { total: totalCart, response: cart } = cartResponse

        if (totalCart === 0) {
            throw new BadRequestError('Cart not found')
        }

        const cartId = cart[0]?._id?.toString()
        const cartSource = cart[0]._source as {
            items: {
                product_variant_id: string
                quantity: number
                unit_price: number
            }[]
        }

        const existingItem = cartSource.items.find(
            (item) => item.product_variant_id.toString() === productVariantId
        )

        if (!existingItem) {
            throw new BadRequestError('Item not found in cart')
        }

        existingItem.quantity = quantity

        const updatedCart = await CartModel.findByIdAndUpdate(
            cartId,
            { items: cartSource.items },
            { new: true }
        )

        if (!updatedCart) {
            throw new BadRequestError('Failed to update cart')
        }

        const { _id, ...cartWithoutId } = updatedCart.toObject()

        // Update the cart in Elasticsearch
        await elasticsearchService.indexDocument(
            'carts',
            _id.toString(),
            cartWithoutId
        )

        return new OkResponse('Item quantity updated successfully', {
            _id: _id,
            ...cartWithoutId,
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
        let cartResponse = await elasticsearchService.searchDocuments('carts', {
            query: {
                term: {
                    user_id: userId,
                },
            },
        })

        const { total: totalCart, response: cart } = cartResponse

        if (!cart || cart.length === 0) {
            throw new BadRequestError('Cart not found')
        }

        const cartId = cart[0]?._id?.toString()
        const cartSource = cart[0]._source as {
            items: {
                product_variant_id: string
                quantity: number
                unit_price: number
            }[]
        }

        const updatedItems = cartSource.items.filter(
            (item) => item.product_variant_id.toString() !== productVariantId
        )

        const updatedCart = await CartModel.findByIdAndUpdate(
            cartId,
            { items: updatedItems },
            { new: true }
        )

        if (!updatedCart) {
            throw new BadRequestError('Failed to update cart')
        }

        const { _id, ...cartWithoutId } = updatedCart.toObject()

        // Update the cart in Elasticsearch
        await elasticsearchService.indexDocument(
            'carts',
            _id.toString(),
            cartWithoutId
        )

        return new OkResponse('Item removed from cart successfully', {
            _id: _id,
            ...cartWithoutId,
        })
    }

    // Clear cart
    async clearCart(userId: string) {
        const cartResponse = await elasticsearchService.searchDocuments(
            'carts',
            {
                query: {
                    term: {
                        user_id: userId,
                    },
                },
            }
        )

        const { total: totalCart, response: cart } = cartResponse

        if (totalCart === 0) {
            throw new BadRequestError('Cart not found')
        }

        const cartId = cart[0]?._id?.toString()

        const deletedCart = await CartModel.findByIdAndDelete(cartId)

        if (!deletedCart) {
            throw new BadRequestError('Failed to clear cart')
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
