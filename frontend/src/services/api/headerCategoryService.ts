import api from './config';

export interface HeaderCategory {
    _id: string; // MongoDB ID
    id?: string; // For backward compatibility if needed
    name: string;
    image?: string; // Cloudinary URL
    iconLibrary?: string; // Optional for legacy support
    iconName?: string;
    slug: string;
    theme?: string; // Maps to theme key
    relatedCategory?: string;
    status: 'Published' | 'Unpublished';
    order?: number;
}

let inFlightHeaderCatPromise: Promise<HeaderCategory[]> | null = null;
let cachedHeaderCats: HeaderCategory[] | null = null;
let lastHeaderCatsFetchTime = 0;
const HEADER_CATS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getHeaderCategoriesPublic = async (skipLoader = false, force = false): Promise<HeaderCategory[]> => {
    const now = Date.now();
    if (!force && cachedHeaderCats && now - lastHeaderCatsFetchTime < HEADER_CATS_CACHE_TTL) {
        return cachedHeaderCats;
    }

    if (!force && inFlightHeaderCatPromise) {
        return inFlightHeaderCatPromise;
    }

    const promise = api.get<HeaderCategory[]>('/header-categories', {
        skipLoader
    } as any).then(res => {
        cachedHeaderCats = res.data;
        lastHeaderCatsFetchTime = Date.now();
        return res.data;
    }).finally(() => {
        inFlightHeaderCatPromise = null;
    });

    inFlightHeaderCatPromise = promise;
    return promise;
};

export const getHeaderCategoriesAdmin = async (config?: any): Promise<HeaderCategory[]> => {
    const response = await api.get<HeaderCategory[]>('/header-categories/admin', config);
    return response.data;
};

export const createHeaderCategory = async (data: Partial<HeaderCategory>): Promise<HeaderCategory> => {
    const response = await api.post<HeaderCategory>('/header-categories', data);
    return response.data;
};

export const updateHeaderCategory = async (id: string, data: Partial<HeaderCategory>): Promise<HeaderCategory> => {
    const response = await api.put<HeaderCategory>(`/header-categories/${id}`, data);
    return response.data;
};

export const deleteHeaderCategory = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/header-categories/${id}`);
    return response.data;
};
