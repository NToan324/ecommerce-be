import z from 'zod'

export class CategoryValidation {
  static createCategory() {
    return {
      body: z.object({
        category_name: z.string().nonempty('Tên danh mục không được để trống'),
        category_description: z.string().optional(),
        category_image: z.object({
          url: z.string().nonempty('URL không được để trống'),
          public_id: z.string().optional()
        })
      }).strict('Invalid field')
    }
  }

  static updateCategory() {
    return {
      body: z.object({
        category_name: z.string().optional(),
        category_description: z.string().optional(),
        category_image: z.object({
          url: z.string(),
          public_id: z.string()
        }).optional(),
        isActive: z.boolean().optional()
      }).strict('Invalid field')
    }
  }

  static searchCategory() {
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
