import categoryService from '@/services/category.service'
import type { Request, Response } from 'express'
import { UploadService } from '@/services/upload.service'
class CategoryController {
  async createCategory(req: Request, res: Response) {
    const payload = req.body
    res.send(await categoryService.createCategory(payload))
  }

  async getCategories(req: Request, res: Response) {
    const { page = '1', limit = '10' } = req.query as {
      page?: string
      limit?: string
    }
    const pageNumber = parseInt(page, 10)
    const limitNumber = parseInt(limit, 10)
    res.send(await categoryService.getCategories(
      {
        page: pageNumber,
        limit: limitNumber,
      },
    ))
  }

  async getCategoriesAdmin(req: Request, res: Response) {
    const { page = '1', limit = '10' } = req.query as {
      page?: string
      limit?: string
    }
    const pageNumber = parseInt(page, 10)
    const limitNumber = parseInt(limit, 10)
    res.send(await categoryService.getCategoriesAdmin(
      {
        page: pageNumber,
        limit: limitNumber,
      },
    ))
  }

  async getCategoryById(req: Request, res: Response) {
    const { id } = req.params
    res.send(await categoryService.getCategoryById(id))
  }

  async updateCategory(req: Request, res: Response) {
    const payload = req.body
    const { id } = req.params
    res.send(await categoryService.updateCategory({ id, payload }))
  }

  async deleteCategory(req: Request, res: Response) {
    const { id } = req.params
    res.send(await categoryService.deleteCategory(id))
  }

  async searchCategories(req: Request, res: Response) {
    const {
      name = '',
      page = 1,
      limit = 10,
    } = req.query as {
      name?: string,
      page?: number,
      limit?: number
    }

    res.send(await categoryService.searchCategories({
      name,
      page: page,
      limit: limit,
    }))
  }

  async uploadImage(req: Request, res: Response) {
    const { public_id } = req.body
    const image = req.file?.path as string
    res.send(await UploadService.uploadImage(image, public_id))
  }
}



const categoryController = new CategoryController()
export default categoryController
