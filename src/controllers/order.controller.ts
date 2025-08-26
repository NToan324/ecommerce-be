import { Request, Response } from 'express';
import orderService from '@/services/order.service';

class OrderController {
    // Tìm kiếm đơn hàng theo các tiêu chí
    async searchOrder(req: Request, res: Response) {
        const {
            customer_name,
            order_id,
            status,
            payment_status,
            payment_method,
            from_date,
            to_date,
            page = 1,
            limit = 10,
        } = req.query as {
            customer_name?: string;
            order_id?: string;
            status?: string;
            payment_status?: string;
            payment_method?: string;
            from_date?: string;
            to_date?: string;
            page?: number;
            limit?: number;
        };


        res.send(await orderService.searchOrder({
            customer_name,
            order_id,
            status,
            payment_status,
            payment_method,
            from_date,
            to_date,
            page,
            limit,
        }));
    }

    // Tạo đơn hàng
    async createOrder(req: Request, res: Response) {
        const { id } = req.user as { id: string };

        const { email, name, coupon_code, address, items, payment_method } = req.body;

        res.send(await orderService.createOrder({
            user_id: id,
            email,
            user_name: name,
            coupon_code,
            address,
            items,
            payment_method,
        }));
    }

    // Lấy danh sách đơn hàng
    async getOrders(req: Request, res: Response) {
        const { page = '1', limit = '10' } = req.query as {
            page?: string;
            limit?: string;
        };

        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);

        res.send(await orderService.getOrders({
            page: pageNumber,
            limit: limitNumber,
        }))
    }

    // Lấy chi tiết đơn hàng theo order_id
    async getOrderById(req: Request, res: Response) {
        const { id } = req.params;

        res.send(await orderService.getOrderById(id));
    }

    // Cập nhật trạng thái đơn hàng
    async updateOrderStatus(req: Request, res: Response) {
        const { id } = req.params;
        const { status } = req.body;

        res.send(await orderService.updateOrderStatus(id, status));
    }
}

const orderController = new OrderController();
export default orderController;