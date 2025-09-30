import elasticsearchService from '@/services/elasticsearch.service'
import categoryModel from '@/models/category.model'
import brandModel from '@/models/brand.model'
import productModel from '@/models/product.model'
import ProductVariantModel from '@/models/productVariant.model'
import UserModel from '@/models/user.model'
import OrderModel from '@/models/order.model'
import CartModel from '@/models/cart.model'
import CouponModel from '@/models/coupon.model'
import ReviewModel from '@/models/review.model'

let isSynced = false // Cờ kiểm soát đồng bộ

export async function syncElasticsearch() {
    if (isSynced) {
        console.log(
            'Elasticsearch is already synced. Skipping synchronization.'
        )
        return
    }

    console.log('Starting Elasticsearch synchronization...')

    // Danh sách các index cần tạo
    const indices = [
        'users',
        'categories',
        'brands',
        'products',
        'product_variants',
        'orders',
        'carts',
        'coupons',
        'reviews',
    ]

    // Xóa và tạo lại index
    for (const index of indices) {
        try {
            const exists = await elasticsearchService
                .getClient()
                .indices.exists({ index })
            if (exists) {
                await elasticsearchService.getClient().indices.delete({ index })
                console.log(`Deleted existing index: ${index}`)
            }
            await elasticsearchService.getClient().indices.create({ index })
            console.log(`Created new index: ${index}`)
        } catch (error) {
            console.error(`Error handling index ${index}:`, error)
        }
    }

    // Đồng bộ dữ liệu từ MongoDB lên Elasticsearch
    await syncCollectionToIndex(UserModel, 'users')
    await syncCollectionToIndex(categoryModel, 'categories')
    await syncCollectionToIndex(brandModel, 'brands')
    await syncCollectionToIndex(productModel, 'products')
    await syncCollectionToIndex(ProductVariantModel, 'product_variants')
    await syncCollectionToIndex(OrderModel, 'orders')
    await syncCollectionToIndex(CartModel, 'carts')
    await syncCollectionToIndex(CouponModel, 'coupons')
    await syncCollectionToIndex(ReviewModel, 'reviews')

    console.log('Elasticsearch synchronization completed.')
    isSynced = true // Đánh dấu đã đồng bộ
}

async function syncCollectionToIndex(model: any, index: string) {
    console.log(`Syncing data for index: ${index}`)
    const documents = await model.find().lean()
    for (const doc of documents) {
        const { _id, ...rest } = doc
        await elasticsearchService.indexDocument(index, _id.toString(), rest)
    }
    console.log(`Synced ${documents.length} documents to index: ${index}`)
}
