import { CreatedResponse, OkResponse } from '@/core/success.response' // Giả sử bạn có class này
import { convertToObjectId } from '@/helpers/convertObjectId'
import categoryModel, { Category } from '@/models/category.model'
import elasticsearchService from './elasticsearch.service'
import { BadRequestError } from '@/core/error.response'

class CategoryService {
    async createCategory(payload: Category) {
        const newCategory = await categoryModel.create({ ...payload })

        if (!newCategory) {
            throw new BadRequestError('Failed to create category')
        }

        const { _id, ...categoryWithoutId } = newCategory.toObject()

        await elasticsearchService.indexDocument(
            'categories',
            _id.toString(),
            categoryWithoutId,
        )

        return new CreatedResponse('Category created successfully', { _id: _id, ...categoryWithoutId })
    }

    // Lấy danh sách danh mục (Admin)
    async getCategoriesAdmin({
        page = 1,
        limit = 10,
    }: {
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit
        const { total, response } = await elasticsearchService.searchDocuments(
            'categories',
            {
                from,
                size: limit,
                query: {
                    match_all: {},
                },
            }
        );

        if (total === 0) {
            return new OkResponse('No categories found', [])
        }
        const categories = response.map((hit: any) => {
            return {
                _id: hit._id,
                ...hit._source,
            }
        })

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return new OkResponse('Get all categories successfully', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPage: Math.ceil((total ?? 0) / limit),
            categories,
        })
    }

    // Lấy danh sách danh mục (User)
    async getCategories({
        page = 1,
        limit = 10,
    }: {
        page?: number
        limit?: number
    }) {
        const from = (page - 1) * limit
        const { total, response } = await elasticsearchService.searchDocuments(
            'categories',
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
                    },
                },
            }
        );

        if (total === 0) {
            return new OkResponse('No categories found', [])
        }
        const categories = response.map((hit: any) => {
            return {
                _id: hit._id,
                ...hit._source,
            }
        })

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return new OkResponse('Get all categories successfully', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPage: Math.ceil((total ?? 0) / limit),
            categories,
        })
    }

    async getCategoryById(id: string) {

        const { total, response } = await elasticsearchService.searchDocuments(
            'categories',
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
        );

        if (total === 0) {
            throw new BadRequestError('Category not found')
        }

        const category = { _id: response[0]._id, ...(response[0]._source || {}) }

        return new OkResponse('Get category successfully', category)
    }

    async updateCategory({
        id,
        payload,
    }: {
        id: string
        payload: Partial<Category>
    }) {
        const category = await categoryModel.findOneAndUpdate(
            { _id: convertToObjectId(id), isActive: true },
            { ...payload },
            { new: true }
        )

        if (!category) throw new Error('Category not found')

        const { _id, ...categoryWithoutId } = category.toObject()

        await elasticsearchService.updateDocument(
            'categories',
            _id.toString(),
            categoryWithoutId,
        )

        return new OkResponse('Category updated successfully', { _id: _id, ...categoryWithoutId })
    }

    async deleteCategory(id: string) {
        // Kiểm tra trong Elasticsearch index products
        const { total, response } = await elasticsearchService.searchDocuments(
            'products',
            {
                size: 1,
                query: {
                    bool: {
                        must: {
                            term: {
                                category_id: id,
                            },
                        },
                    },
                },
            }
        );

        // Nếu tồn tại ít nhất một sản phẩm, không cho phép xóa category
        if (!(total === 0)) {
            throw new BadRequestError('Không thể xóa danh mục vì tồn tại sản phẩm liên quan');
        }

        // Tiến hành xóa category khỏi MongoDB
        const deletedCategory = await categoryModel.findByIdAndDelete(convertToObjectId(id));

        if (!deletedCategory) throw new BadRequestError('Danh mục không tồn tại');

        // Xóa category khỏi Elasticsearch index
        await elasticsearchService.deleteDocument('categories', id);

        return new OkResponse('Xóa danh mục thành công', { _id: id });
    }

    async searchCategories({
        name,
        page = 1,
        limit = 10,
    }: {
        name: string;
        page?: number;
        limit?: number;
    }) {
        const from = (page - 1) * limit

        const { total, response } = await elasticsearchService.searchDocuments(
            'categories',
            {
                from,
                size: limit,
                query: {
                    bool: {
                        must: [
                            {
                                wildcard: {
                                    "category_name.keyword": {
                                        value: `*${name}*`,
                                        case_insensitive: true,
                                    },
                                },
                            }
                        ],
                    },
                },
            }
        )

        if (total === 0) {
            return new OkResponse('No categories found', [])
        }

        const categories = response.map((hit: any) => ({
            _id: hit._id,
            ...hit._source,
        }))

        const pageNumber = parseInt(page.toString(), 10)
        const limitNumber = parseInt(limit.toString(), 10)

        return new OkResponse('Search categories successfully', {
            total,
            page: pageNumber,
            limit: limitNumber,
            totalPage: Math.ceil((total ?? 0) / limit),
            categories,
        })
    }
}

const categoryService = new CategoryService()
export default categoryService
