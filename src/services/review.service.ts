import elasticsearchService from './elasticsearch.service'
import { OkResponse, CreatedResponse } from '@/core/success.response'
import { BadRequestError } from '@/core/error.response'
import productVariantModel from '@/models/productVariant.model'
import reviewModel, { Review } from '@/models/review.model'

class ReviewService {
    // Thêm review cho sản phẩm
    async addReview({
        productVariantId,
        userId,
        content,
        rating,
    }: {
        productVariantId: string
        userId?: string
        content: string
        rating?: number
    }) {
        // Kiểm tra xem productVariant có tồn tại và isActive hay không
        const productVariant = await productVariantModel.findOne({
            _id: productVariantId,
            isActive: true,
        })

        if (!productVariant) {
            throw new BadRequestError('Product variant not found or inactive')
        }

        const reviewData: any = {
            product_variant_id: productVariantId,
            content,
        }

        if (rating && !userId) {
            throw new BadRequestError(
                'User must be logged in to provide a rating'
            )
        }

        if (userId) {
            reviewData.user_id = userId
            if (rating) {
                reviewData.rating = Math.round(rating)
            }
        }

        let newReview

        try {
            newReview = await reviewModel.create(reviewData)
        } catch (error: any) {
            throw new BadRequestError(error.message)
        }

        // Cập nhật average_rating và số lượng review của product variant
        await this.updateProductVariantStats(productVariantId)

        const { _id, ...reviewWithoutId } = newReview.toObject()

        // Thêm review vào Elasticsearch
        await elasticsearchService.indexDocument(
            'reviews',
            _id.toString(),
            reviewWithoutId
        )

        if (userId) {
            const user: any = await elasticsearchService.getDocumentById(
                'users',
                userId
            )

            newReview = {
                ...newReview.toObject(),
                user: {
                    id: userId,
                    name: user.fullName,
                    avatar: user.avatar.url,
                },
            }
            return { ...newReview }
        }

        return { _id: _id, ...reviewWithoutId }
    }

    // Cập nhật average_rating và số lượng review của product variant
    async updateProductVariantStats(
        productVariantId: string,
        isGetData = false
    ) {
        // Lấy tất cả các review của product variant
        const reviews = await reviewModel.find({
            product_variant_id: productVariantId,
        })

        // Tính toán average_rating
        const reviewsWithRating = reviews.filter(
            (review) => review.rating !== undefined && review.rating !== null
        )
        const totalRating = reviewsWithRating.reduce(
            (sum, review) => sum + (review.rating as number),
            0
        )
        const averageRating =
            reviewsWithRating.length > 0
                ? totalRating / reviewsWithRating.length
                : 0

        if (isGetData) {
            return {
                average_rating: averageRating,
                review_count: reviews.length,
                reviews_with_rating: reviewsWithRating.length,
            }
        }

        // Cập nhật số lượng review và average_rating trong MongoDB
        await productVariantModel.findByIdAndUpdate(productVariantId, {
            average_rating: averageRating,
            review_count: reviews.length,
        })

        // Cập nhật average_rating và review_count trong Elasticsearch
        await elasticsearchService.updateDocument(
            'product_variants',
            productVariantId,
            {
                average_rating: averageRating,
                review_count: reviews.length,
            }
        )
    }

    async deleteReview({ reviewId }: { reviewId: string }) {
        // Kiểm tra xem review có tồn tại hay không
        const review = await reviewModel.findById(reviewId)
        if (!review) {
            throw new BadRequestError('Review not found')
        }

        const deletedReview = await reviewModel.findByIdAndDelete(reviewId)
        if (!deletedReview) {
            throw new BadRequestError('Failed to delete review')
        }

        // Cập nhật average_rating và số lượng review của product variant
        await this.updateProductVariantStats(
            deletedReview.product_variant_id.toString()
        )

        try {
            // Xóa review khỏi Elasticsearch
            await elasticsearchService.deleteDocument('reviews', reviewId)
        } catch (error: any) {
            throw new BadRequestError(
                'Failed to delete review from Elasticsearch'
            )
        }
        return deletedReview.toObject()
    }

    async getReviewsByProductVariantId({
        productVariantId,
        page = 1,
        limit = 10,
    }: {
        productVariantId: string
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit

        // Kiểm tra xem productVariant có tồn tại và isActive hay không
        const productVariant = await productVariantModel.findOne({
            _id: productVariantId,
            isActive: true,
        })

        if (!productVariant) {
            throw new BadRequestError('Product variant not found or inactive')
        }

        // Lấy tất cả các review của product variant
        let total: any
        let response: any[]

        try {
            ({ total, response } = await elasticsearchService.searchDocuments(
                'reviews',
                {
                    size: limit,
                    from: from,
                    query: {
                        bool: {
                            must: {
                                term: {
                                    product_variant_id: productVariantId,
                                },
                            },
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
            return new OkResponse(
                'No reviews found for this product variant',
                []
            )
        }

        const reviews = response.map((review: any) => {
            const { _id, ...reviewWithoutId } = review
            return {
                _id: _id,
                ...reviewWithoutId._source,
            }
        })

        const userIds = reviews
            .map((review: any) => review.user_id)
            .filter((userId: string) => userId !== undefined)

        let users: any[] = []
        if (userIds.length > 0) {
            users = await Promise.all(
                userIds.map(async (userId: any) => {
                    const user: any =
                        await elasticsearchService.getDocumentById(
                            'users',
                            userId
                        )
                    return {
                        id: userId,
                        name: user.fullName,
                        avatar: user.avatar.url,
                    }
                })
            )
        } else {
            users = []
        }

        const userMap = new Map(users.map((user: any) => [user.id, user]))

        reviews.forEach((review: any) => {
            const user = userMap.get(review.user_id)
            if (user) {
                review.user = user
            }
        })

        const { average_rating, review_count, reviews_with_rating } =
            (await this.updateProductVariantStats(productVariantId, true)) || {
                average_rating: 0,
                review_count: 0,
                reviews_with_rating: 0,
            }

        return new OkResponse('Get reviews successfully', {
            total,
            page,
            limit,
            average_rating,
            review_count,
            reviews_with_rating,
            totalPage: Math.ceil((total ?? 0) / limit),
            data: reviews,
        })
    }
}
const reviewService = new ReviewService()
export default reviewService
