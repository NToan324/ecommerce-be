import brandService from '@/services/brand.service'
import { UploadService } from '@/services/upload.service'
import type { Request, Response } from 'express'

class BrandController {
  async createBrand(req: Request, res: Response) {
    const payload = req.body
    res.status(201).send(await brandService.createBrand(payload))
  }

  async getBrandsAdmin(req: Request, res: Response) {
    const { page = '1', limit = '10' } = req.query as {
      page?: string
      limit?: string
    }

    const pageNumber = parseInt(page, 10)
    const limitNumber = parseInt(limit, 10)

    res.send(await brandService.getBrandsAdmin({
      page: pageNumber,
      limit: limitNumber,
    }))
  }

  async getBrands(req: Request, res: Response) {
    const { page = '1', limit = '10' } = req.query as {
      page?: string
      limit?: string
    }

    const pageNumber = parseInt(page, 10)
    const limitNumber = parseInt(limit, 10)

    res.send(await brandService.getBrands({
      page: pageNumber,
      limit: limitNumber,
    }))
  }

  async getBrandById(req: Request, res: Response) {
    const { id } = req.params
    res.send(await brandService.getBrandById(id))
  }

  async updateBrand(req: Request, res: Response) {
    const payload = req.body
    const { id } = req.params
    res.send(await brandService.updateBrand({ id, payload }))
  }

  async deleteBrand(req: Request, res: Response) {
    const { id } = req.params
    res.send(await brandService.deleteBrand(id))
  }

  async uploadImage(req: Request, res: Response) {
    const { public_id } = req.body
    const image = req.file?.path as string
    res.send(await UploadService.uploadImage(image, public_id))
  }

  async searchBrands(req: Request, res: Response) {
    const {
      name = '',
      page = 1,
      limit = 10
    } = req.query as {
      name?: string
      page?: number
      limit?: number
    }
    res.send(await brandService.searchBrands({
      name,
      page: page,
      limit: limit
    }))
  }
}

const brandController = new BrandController()
export default brandController
