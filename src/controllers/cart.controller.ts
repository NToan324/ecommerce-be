import cartService from '@/services/cart.service';
import type { Request, Response } from 'express';

class CartController {
    // Add item to cart
    async addItemToCart(req: Request, res: Response) {
        const userId = (req.user as { id: string }).id;

        const { productVariantId, quantity } = req.body;

        const response = await cartService.addItemToCart({
            userId,
            productVariantId,
            quantity,
        });

        res.send(response);
    }

    // Get cart by user ID
    async getCart(req: Request, res: Response) {
        const userId = (req.user as { id: string }).id;

        const response = await cartService.getCart(userId);

        res.send(response);
    }

    // Update item quantity in cart
    async updateItemQuantity(req: Request, res: Response) {
        const userId = (req.user as { id: string }).id;

        const { productVariantId } = req.params;
        const { quantity } = req.body;

        const response = await cartService.updateItemQuantity({
            userId,
            productVariantId,
            quantity,
        });

        res.send(response);
    }

    // Remove item from cart
    async removeItemFromCart(req: Request, res: Response) {
        const userId = (req.user as { id: string }).id;

        const { productVariantId } = req.params;

        const response = await cartService.removeItemFromCart({
            userId,
            productVariantId,
        });

        res.send(response);
    }

    // Clear cart
    async clearCart(req: Request, res: Response) {
        const userId = (req.user as { id: string }).id;

        const response = await cartService.clearCart(userId);

        res.send(response);
    }
}

const cartController = new CartController();
export default cartController;