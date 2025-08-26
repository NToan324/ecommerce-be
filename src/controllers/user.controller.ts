import type { Request, Response } from 'express'
import userService from '@/services/user.service'
import orderService from '@/services/order.service'
import { UploadService } from '@/services/upload.service'

class UserController {
    // Lấy danh sách người dùng
    async getUsers(req: Request, res: Response) {
        const { page = '1', limit = '10' } = req.query as {
            page?: string
            limit?: string
        }

        const pageNumber = parseInt(page, 10)
        const limitNumber = parseInt(limit, 10)

        res.send(
            await userService.getUsers({
                page: pageNumber,
                limit: limitNumber,
            })
        )
    }

    // Lấy danh sách đơn hàng của bản thân (USER)
    async getOrders(req: Request, res: Response) {
        const { id } = req.user as { id: string }
        const { page = '1', limit = '10' } = req.query as {
            page?: string
            limit?: string
        }

        const pageNumber = parseInt(page, 10)
        const limitNumber = parseInt(limit, 10)

        res.send(
            await orderService.getOrderByUserId({
                user_id: id,
                page: pageNumber,
                limit: limitNumber,
            })
        )
    }

    // Lấy danh sách đơn hàng theo user_id (ADMIN)
    async getOrdersByUserId(req: Request, res: Response) {
        const { id } = req.params as { id: string }

        const { page = '1', limit = '10' } = req.query as {
            page?: string
            limit?: string
        }

        const pageNumber = parseInt(page, 10)
        const limitNumber = parseInt(limit, 10)

        res.send(
            await orderService.getOrderByUserId({
                user_id: id,
                page: pageNumber,
                limit: limitNumber,
            })
        )
    }

    // Lấy hồ sơ người dùng
    async getUserProfile(req: Request, res: Response) {
        const { id } = req.user as { id: string }
        res.send(await userService.getUserProfile(id))
    }

    // Xem chi tiết người dùng (ADMIN)
    async getUserProfileById(req: Request, res: Response) {
        const { id } = req.params as { id: string }
        res.send(await userService.getUserProfile(id))
    }

    // Đổi mật khẩu
    async changePassword(req: Request, res: Response) {
        const { id } = req.user as { id: string }
        const { oldPassword, newPassword } = req.body

        res.send(await userService.changePassword(id, oldPassword, newPassword))
    }

    // Cập nhật thông tin bản thân
    async updateProfile(req: Request, res: Response) {
        const { id } = req.user as { id: string }
        const {
            fullName,
            phone,
            address,
            avatar,
        }: {
            fullName?: string
            phone?: string
            address?: string
            avatar?: {
                url?: string
                public_id?: string
            }
        } = req.body

        res.send(
            await userService.updateUserInfo({
                user_id: id,
                fullName,
                phone,
                address,
                avatar,
            })
        )
    }

    // Cập nhật thông tin người dùng với quyền ADMIN
    async updateUserInfo(req: Request, res: Response) {
        const { id } = req.params as { id: string }
        const {
            fullName,
            phone,
            address,
            avatar,
            isActive,
        }: {
            fullName?: string
            phone?: string
            address?: string
            avatar?: {
                url?: string
                public_id?: string
            }
            isActive?: boolean
        } = req.body

        res.send(
            await userService.updateUserInfo({
                user_id: id,
                fullName,
                phone,
                address,
                avatar,
                isActive,
            })
        )
    }

    // Tìm kiếm người dùng
    async searchUser(req: Request, res: Response) {
        const { name, email } = req.query as {
            name?: string
            email?: string
        }

        const { page = '1', limit = '10' } = req.query as {
            page?: string
            limit?: string
        }

        const pageNumber = parseInt(page, 10)
        const limitNumber = parseInt(limit, 10)

        res.send(
            await userService.searchUsers({
                name,
                email,
                page: pageNumber,
                limit: limitNumber,
            })
        )
    }

    // Tải lên ảnh avatar
    async uploadImage(req: Request, res: Response) {
        const { public_id } = req.body
        const image = req.file?.path as string
        res.send(await UploadService.uploadImage(image, public_id))
    }
}

export default new UserController()
