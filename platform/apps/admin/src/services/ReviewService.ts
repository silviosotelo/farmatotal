import ApiService from './ApiService'

export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export type Review = {
    id: string
    productId: string
    author: string
    email: string | null
    rating: number
    title: string | null
    body: string
    status: ReviewStatus
    createdAt: string
}

export async function apiGetReviews(params?: { status?: ReviewStatus }) {
    return ApiService.fetchDataWithAxios<{
        data: Review[]
        total: number
        page: number
        perPage: number
        totalPages: number
    }>({
        url: '/reviews/all',
        method: 'get',
        params,
    })
}

export async function apiModerateReview(id: string, status: ReviewStatus) {
    return ApiService.fetchDataWithAxios<Review>({
        url: `/reviews/${id}`,
        method: 'patch',
        data: { status },
    })
}

export async function apiDeleteReview(id: string) {
    return ApiService.fetchDataWithAxios<{ ok: boolean }>({
        url: `/reviews/${id}`,
        method: 'delete',
    })
}
