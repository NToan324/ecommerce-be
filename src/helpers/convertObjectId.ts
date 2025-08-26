import { ObjectId } from 'mongodb'
export function convertToObjectId(id: string) {
  return new ObjectId(id)
}
