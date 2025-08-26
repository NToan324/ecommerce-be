import { Client } from '@elastic/elasticsearch'
import { BadRequestError } from '@/core/error.response'

class ElasticsearchService {
    private client: Client

    constructor() {
        this.client = new Client({
            node: process.env.ELASTICSEARCH_HOST ?? 'http://localhost:9200',
            // auth: {
            //     username: process.env.ELASTICSEARCH_USERNAME ?? '',
            //     password: process.env.ELASTICSEARCH_PASSWORD ?? '',
            // },
        });
    }

    public getClient() {
        return this.client;
    }

    async indexDocument(index: string, id: string, document: any) {
        try {
            const response = await this.client.index({
                index,
                id,
                body: document,
            })
            return response
        } catch (error) {
            throw new BadRequestError(
                'Error indexing document: ' + (error as any).message
            )
        }
    }

    async searchDocuments(index: string, query: any) {
        try {
            const response = await this.client.search({
                index,
                body: query,
            });

            const total =
                typeof response.hits.total === 'object'
                    ? response.hits.total.value
                    : response.hits.total;

            return { total, response: response.hits.hits };
        } catch (error) {
            throw new BadRequestError(
                'Error searching documents: ' + (error as any).message
            )
        }
    }

    async searchAggregations(index: string, query: any) {
        try {
            const response = await this.client.search({
                index,
                body: query,
            });

            const total =
                typeof response.hits.total === 'object'
                    ? response.hits.total.value
                    : response.hits.total;

            return { total, aggregations: response.aggregations };
        } catch (error) {
            throw new BadRequestError(
                'Error searching documents: ' + (error as any).message
            )
        }
    }

    async updateDocument(index: string, id: string, document: any) {
        try {
            const response = await this.client.update({
                index,
                id,
                body: {
                    doc: document,
                },
            })
            return response
        } catch (error) {
            throw new BadRequestError(
                'Error updating document: ' + (error as any).message
            )
        }
    }

    async deleteDocument(index: string, id: string) {
        try {
            const response = await this.client.delete({
                index,
                id,
            })
            return response
        } catch (error) {
            throw new BadRequestError(
                'Error deleting document: ' + (error as any).message
            )
        }
    }

    async getDocumentById(index: string, id: string) {
        try {
            const response = await this.client.get({
                index,
                id,
            });
            return response._source;
        } catch (error) {
            throw new BadRequestError('Error getting document: ' + (error as any).message);
        }
    }

    async countDocuments(index: string, query: any) {
        try {
            const response = await this.client.count({
                index,
                body: query,
            });
            return response.count;
        } catch (error) {
            throw new BadRequestError('Error counting documents: ' + (error as any).message);
        }
    }
}

const elasticsearchService = new ElasticsearchService()
export default elasticsearchService
