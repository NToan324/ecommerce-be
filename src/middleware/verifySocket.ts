import { ForbiddenError, UnauthorizedError } from '@/core/error.response';
import elasticsearchService from '@/services/elasticsearch.service';
import jwt from 'jsonwebtoken';

const verifyJWTSocket = (socket: any, next: any) => {
    const token = socket.handshake.headers.authorization?.split(' ')[1]; // Lấy token từ header

    if (!token) {
        next(new UnauthorizedError('Authentication error: No token provided'));
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRETE as string, async (err: any, decoded: any) => {
        if (err) {
            return next(new ForbiddenError('Invalid token'))
        }

        socket.user = decoded

        // Check if the user is active
        let user: any
        try {
            user = await elasticsearchService.getDocumentById(
                'users',
                decoded.id
            ) as any
        } catch (error) {
            return next(new ForbiddenError('User not found'))
        }

        if (!user || !user.isActive) {
            return next(new ForbiddenError('User is not found or inactive'))
        }

        next()
    })
};

export default verifyJWTSocket;