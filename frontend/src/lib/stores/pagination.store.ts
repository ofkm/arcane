import { writable } from 'svelte/store';
import type { PaginationRequest, SortRequest, PaginationResponse } from '$lib/types/pagination.type';
import { DEFAULT_PAGE_SIZE } from '$lib/types/pagination.type';

interface PaginationState {
    request: PaginationRequest;
    sort?: SortRequest;
    response?: PaginationResponse;
    isLoading: boolean;
}

function createPaginationStore(initialPageSize = DEFAULT_PAGE_SIZE) {
    const initialState: PaginationState = {
        request: {
            page: 1,
            limit: initialPageSize
        },
        isLoading: false
    };

    const { subscribe, set, update } = writable<PaginationState>(initialState);

    return {
        subscribe,
        setPage: (page: number) =>
            update((state) => ({
                ...state,
                request: { ...state.request, page }
            })),
        setPageSize: (limit: number) =>
            update((state) => ({
                ...state,
                request: { ...state.request, limit, page: 1 }
            })),
        setSort: (sort: SortRequest) =>
            update((state) => ({
                ...state,
                sort,
                request: { ...state.request, page: 1 }
            })),
        setResponse: (response: PaginationResponse) =>
            update((state) => ({
                ...state,
                response
            })),
        setLoading: (isLoading: boolean) =>
            update((state) => ({
                ...state,
                isLoading
            })),
        reset: () => set(initialState),
        getState: () => {
            let currentState: PaginationState;
            subscribe((state) => (currentState = state))();
            return currentState!;
        }
    };
}

export const imagesPaginationStore = createPaginationStore();