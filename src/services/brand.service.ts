import { BadRequestError } from '@/core/error.response'
import { CreatedResponse, OkResponse } from '@/core/success.response'
import { convertToObjectId } from '@/helpers/convertObjectId'
import brandModel, { Brand } from '@/models/brand.model'
import elasticsearchService from './elasticsearch.service'

class BrandService {
    async createBrand(payload: Partial<Brand>) {

        const newBrand = await brandModel.create({ ...payload })

        if (!newBrand) {
            throw new BadRequestError('Failed to create brand')
        }

        const { _id, ...brandWithoutId } = newBrand.toObject()

        await elasticsearchService.indexDocument(
            'brands',
            _id.toString(),
            brandWithoutId,
        )

        return new CreatedResponse('Brand created successfully', { _id, ...brandWithoutId })
    }

    // Lấy danh sách thương hiệu (Admin)
    async getBrandsAdmin({
        page = 1,
        limit = 10,
    }: {
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit
        const { total, response } = await elasticsearchService.searchDocuments(
            'brands',
            {
                from,
                size: limit,
                query: {
                    match_all: {},
                },
            }
        )

        if (total === 0) {
            return new OkResponse('No brands found', [])
        }

        const brands = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return new OkResponse('Get all brands successfully', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPage: Math.ceil((total ?? 0) / limit),
            brands,
        })
    }

    // Lấy danh sách thương hiệu (User)
    async getBrands({
        page = 1,
        limit = 10,
    }: {
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit
        const { total, response } = await elasticsearchService.searchDocuments(
            'brands',
            {
                from,
                size: limit,
                query: {
                    bool: {
                        must: {
                            term: {
                                isActive: true,
                            },
                        },
                    }
                },
            }
        )

        if (total === 0) {
            return new OkResponse('No brands found', [])
        }

        const brands = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return new OkResponse('Get all brands successfully', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPage: Math.ceil((total ?? 0) / limit),
            brands,
        })
    }

    async getBrandById(id: string) {
        const { total, response } = await elasticsearchService.searchDocuments(
            'brands',
            {
                query: {
                    bool: {
                        must: {
                            term: {
                                _id: id,
                            },
                        },
                    },
                },
            }
        )

        if (total === 0) {
            throw new BadRequestError('Brand not found')
        }

        const brand = { _id: response[0]._id, ...(response[0]._source || {}) }

        return new OkResponse('Get brand successfully', brand)
    }

    async updateBrand({
        id,
        payload,
    }: {
        id: string
        payload: Partial<Brand>
    }) {
        const brand = await brandModel.findOneAndUpdate(
            { _id: convertToObjectId(id), isActive: true },
            { ...payload },
            { new: true }
        )

        if (!brand) throw new BadRequestError('Brand not found')

        const { _id, ...brandWithoutId } = brand.toObject()

        await elasticsearchService.updateDocument(
            'brands',
            _id.toString(),
            brandWithoutId,
        )

        return new OkResponse('Brand updated successfully', { _id, ...brandWithoutId })
    }

    async deleteBrand(id: string) {
        // Kiểm tra trong Elasticsearch index products
        const { total, response } = await elasticsearchService.searchDocuments(
            'products',
            {
                size: 1,
                query: {
                    bool: {
                        must: {
                            term: {
                                brand_id: id, // Tìm các sản phẩm có brand_id khớp với id của brand
                            },
                        },
                    },
                },
            }
        );

        // Nếu tồn tại ít nhất một sản phẩm, không cho phép xóa brand
        if (!(total === 0)) {
            throw new BadRequestError('Không thể xóa thương hiệu vì tồn tại sản phẩm liên quan');
        }

        // Tiến hành xóa brand khỏi MongoDB
        const deletedBrand = await brandModel.findByIdAndDelete(convertToObjectId(id));

        if (!deletedBrand) throw new BadRequestError('Thương hiệu không tồn tại');

        // Xóa brand khỏi Elasticsearch index
        await elasticsearchService.deleteDocument('brands', id);

        return new OkResponse('Xóa thương hiệu thành công', { _id: id });
    }

    async searchBrands({
        name,
        page = 1,
        limit = 10
    }: {
        name?: string,
        page?: number,
        limit?: number
    }) {

        const from = (page - 1) * limit
        const { total, response } = await elasticsearchService.searchDocuments(
            'brands',
            {
                from,
                size: limit,
                query: {
                    bool: {
                        must: [
                            {
                                wildcard: {
                                    "brand_name.keyword": {
                                        value: `*${name}*`,
                                        case_insensitive: true,
                                    },
                                },
                            },
                        ],
                    },
                },
            }
        )

        if (total === 0) {
            return new OkResponse('No brands found', [])
        }

        const brands = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return new OkResponse('Get all brands successfully', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPage: Math.ceil((total ?? 0) / limit),
            brands,
        })
    }
}

const brandService = new BrandService()
export default brandService