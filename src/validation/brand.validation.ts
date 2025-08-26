import z from 'zod'

export class BrandValidation {
  static createBrand() {
    return {
      body: z.object({
        brand_name: z.string().nonempty('Tên thương hiệu không được để trống'),
        brand_image: z.object({
          url: z.string().url('Invalid image URL').nonempty('Image URL is required'),
          public_id: z.string().optional()
        }),
      }).strict('Invalid field')
    }
  }

  static updateBrand() {
    return {
      body: z.object({
        brand_name: z.string().nonempty('Tên thương hiệu không được để trống').optional(),
        brand_image: z.object({
          url: z.string().url('Invalid image URL').nonempty('Image URL is required'),
          public_id: z.string()
        }).optional(),
        isActive: z.boolean().optional()
      }).strict('Invalid field')
    }
  }
  static searchBrand() {
    return {
      query: z.object({
        name: z.string(),
        page: z.coerce
          .number()
          .int('Page must be an integer')
          .min(1, 'Page must be greater than or equal to 1')
          .optional(),
        limit: z.coerce
          .number()
          .int('Limit must be an integer')
          .min(1, 'Limit must be greater than or equal to 1')
          .max(100, 'Limit must be less than or equal to 100')
          .optional(),
      }).strict('Invalid field')
    }
  }
}
