import reviewService from '@/services/review.service'
import { Server } from 'socket.io'
import { Request, Response } from 'express'
class ReviewController {
    // Thêm review
    async setupReviewWebSocket(socket: any, io: Server) {
        // Lắng nghe sự kiện thêm review
        socket.on('add_review', async (data: any) => {
            try {
                const { product_variant_id, content, rating } = data
                const userId = socket.user?.id // Lấy userId từ socket

                // Gọi service để thêm review
                const newReview: any = await reviewService.addReview({
                    productVariantId: product_variant_id,
                    userId: userId,
                    content: content,
                    rating: rating,
                })

                const { _id, ...reviewWithoutId } = newReview

                // Phát sự kiện cho tất cả người dùng trong room
                io.of('/review')
                    .to(product_variant_id)
                    .emit('new_review', { _id, ...reviewWithoutId })
            } catch (error: any) {
                socket.emit('review_error', { message: error.message })
            }
        })

        // Lắng nghe sự kiện xóa review
        socket.on('delete_review', async (data: any) => {
            try {
                // Kiểm tra quyền của người dùng
                if (!socket.user || socket.user.role !== 'ADMIN') {
                    socket.emit('review_error', {
                        message: 'Forbidden: You do not have permission',
                    })
                }

                const { reviewId, product_variant_id } = data

                // Gọi service để xóa review
                const deletedReview: any = await reviewService.deleteReview({
                    reviewId,
                })

                const { _id, ...reviewWithoutId } = deletedReview

                // Phát sự kiện cho tất cả người dùng trong room
                io.of('/review')
                    .to(product_variant_id)
                    .emit('review_deleted', { _id, ...reviewWithoutId })
            } catch (error: any) {
                socket.emit('review_error', { message: error.message })
            }
        })
    }

    // Lấy danh sách review theo product_variant_id
    async getReviewsByProductVariantId(req: Request, res: Response) {
        const { id } = req.params
        const { page = '1', limit = '10' } = req.query as {
            page?: string
            limit?: string
        }

        const pageNumber = parseInt(page, 10)
        const limitNumber = parseInt(limit, 10)

        res.send(
            await reviewService.getReviewsByProductVariantId({
                productVariantId: id,
                page: pageNumber,
                limit: limitNumber,
            })
        )
    }
}

const reviewController = new ReviewController()
export default reviewController
