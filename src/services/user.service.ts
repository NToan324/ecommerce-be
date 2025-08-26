import UserModel from '@/models/user.model';
import elasticsearchService from './elasticsearch.service';
import { BadRequestError } from '@/core/error.response';
import { OkResponse } from '@/core/success.response';
import bcrypt from 'bcryptjs'

class UserService {
    // Lấy hồ sơ người dùng
    async getUserProfile(user_id: string) {
        // Tìm người dùng trong MongoDB
        const user: any = await elasticsearchService.getDocumentById('users', user_id);
        if (!user) {
            throw new BadRequestError('User not found');
        }

        const { password, role, isActive, ...userWithoutSensitiveField } = user;

        return new OkResponse('Get user profile successfully', {
            _id: user_id,
            ...userWithoutSensitiveField,
        });
    }

    // Đổi mật khẩu
    async changePassword(user_id: string, oldPassword: string, newPassword: string) {
        // Tìm người dùng trong MongoDB
        const user = await UserModel.findById(user_id);

        if (!user) {
            throw new BadRequestError('User not found');
        }

        // Kiểm tra mật khẩu cũ
        const isMatch = await bcrypt.compare(oldPassword, user.password as string);
        if (!isMatch) {
            throw new BadRequestError('Old password is incorrect');
        }

        user.password = newPassword;
        await user.save();

        return new OkResponse('Password changed successfully');
    }

    // Cập nhật thông tin người dùng
    async updateUserInfo({
        user_id,
        fullName,
        phone,
        address,
        avatar,
        isActive
    }: {
        user_id: string;
        fullName?: string;
        phone?: string;
        address?: string;
        avatar?: {
            url?: string;
            public_id?: string;
        };
        isActive?: boolean;
    }) {
        // Cập nhật thông tin trong MongoDB
        const updatedUser = await UserModel.findByIdAndUpdate(user_id,
            {
                fullName: fullName,
                phone: phone,
                address: address,
                avatar: avatar,
                isActive: isActive,
            },
            {
                new: true,
            });

        if (!updatedUser) {
            throw new BadRequestError('User not found');
        }

        const { _id, ...userWithoutId } = updatedUser.toObject();

        // Đồng bộ thông tin lên Elasticsearch
        await elasticsearchService.updateDocument('users', _id.toString(), userWithoutId);

        const { password, role, isActive: userStatus, ...userWithoutSensitiveField } = userWithoutId;

        return new OkResponse('User information updated successfully', {
            _id: _id,
            ...userWithoutSensitiveField,
        });
    }

    // Lấy danh sách người dùng
    async getUsers({
        page = 1,
        limit = 10,
    }: {
        page?: number;
        limit?: number;
    }) {
        const from = (page - 1) * limit;
        // Lấy danh sách người dùng từ Elasticsearch
        const { total, response } = await elasticsearchService.searchDocuments('users', {
            from: from,
            size: limit,
            query: {
                bool: {
                    filter: [
                        {
                            term: {
                                'role.keyword': 'CUSTOMER',
                            },
                        },
                    ],
                }
            }
        });

        if (total === 0) {
            throw new OkResponse('No users found', []);
        }

        const users = response.map((user: any) => {
            const { password, role, ...userWithoutSensitiveFields } = user._source;
            return {
                _id: user._id,
                ...userWithoutSensitiveFields,
            };
        });

        return new OkResponse('Get users successfully', {
            total: total,
            page: page,
            limit: limit,
            totalPage: Math.ceil((total ?? 0) / limit),
            users,
        });
    }

    async searchUsers({
        name,
        email,
        page = 1,
        limit = 10,
    }: {
        name?: string;
        email?: string;
        page?: number;
        limit?: number;
    }) {
        const from = (page - 1) * limit;
        const must: any[] = []

        if (name) {
            must.push({
                wildcard: {
                    "fullName.keyword": {
                        value: `*${name}*`,
                        case_insensitive: true,
                    },
                },
            });
        }

        if (email) {
            must.push({
                term: {
                    'email.keyword': email,
                },
            });
        }

        // Tìm kiếm người dùng trong Elasticsearch
        const { total, response } = await elasticsearchService.searchDocuments('users', {
            from: from,
            size: limit,
            query: {
                bool: {
                    must
                },
            },
        });

        if (total === 0) {
            throw new OkResponse('No users found', []);
        }

        const users = response.map((user: any) => {
            const { password, role, ...userWithoutSensitiveFields } = user._source;
            return {
                _id: user._id,
                ...userWithoutSensitiveFields,
            };
        });

        return new OkResponse('Search users successfully', {
            total: total,
            page: page,
            limit: limit,
            totalPage: Math.ceil((total ?? 0) / limit),
            users,
        });
    }

}

export default new UserService();