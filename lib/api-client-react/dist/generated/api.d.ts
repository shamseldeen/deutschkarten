import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { ApiError, DeleteWorkspace200, Flashcard, FlashcardGenerateInput, FlashcardList, GetDailyFlashcardsParams, HealthStatus, LevelStats, ListFlashcardsParams, ProgressUpdate, Workspace, WorkspaceCreateInput, WorkspaceList, WorkspaceSwitchResult } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListFlashcardsUrl: (params?: ListFlashcardsParams) => string;
/**
 * @summary List flashcards with optional level filter
 */
export declare const listFlashcards: (params?: ListFlashcardsParams, options?: RequestInit) => Promise<FlashcardList>;
export declare const getListFlashcardsQueryKey: (params?: ListFlashcardsParams) => readonly ["/api/flashcards", ...ListFlashcardsParams[]];
export declare const getListFlashcardsQueryOptions: <TData = Awaited<ReturnType<typeof listFlashcards>>, TError = ErrorType<unknown>>(params?: ListFlashcardsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFlashcards>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listFlashcards>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListFlashcardsQueryResult = NonNullable<Awaited<ReturnType<typeof listFlashcards>>>;
export type ListFlashcardsQueryError = ErrorType<unknown>;
/**
 * @summary List flashcards with optional level filter
 */
export declare function useListFlashcards<TData = Awaited<ReturnType<typeof listFlashcards>>, TError = ErrorType<unknown>>(params?: ListFlashcardsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFlashcards>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGenerateFlashcardsUrl: () => string;
/**
 * @summary Generate new flashcards using AI for a specific level
 */
export declare const generateFlashcards: (flashcardGenerateInput: FlashcardGenerateInput, options?: RequestInit) => Promise<Flashcard[]>;
export declare const getGenerateFlashcardsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateFlashcards>>, TError, {
        data: BodyType<FlashcardGenerateInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateFlashcards>>, TError, {
    data: BodyType<FlashcardGenerateInput>;
}, TContext>;
export type GenerateFlashcardsMutationResult = NonNullable<Awaited<ReturnType<typeof generateFlashcards>>>;
export type GenerateFlashcardsMutationBody = BodyType<FlashcardGenerateInput>;
export type GenerateFlashcardsMutationError = ErrorType<unknown>;
/**
* @summary Generate new flashcards using AI for a specific level
*/
export declare const useGenerateFlashcards: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateFlashcards>>, TError, {
        data: BodyType<FlashcardGenerateInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateFlashcards>>, TError, {
    data: BodyType<FlashcardGenerateInput>;
}, TContext>;
export declare const getGetFlashcardStatsUrl: () => string;
/**
 * @summary Get study stats grouped by level
 */
export declare const getFlashcardStats: (options?: RequestInit) => Promise<LevelStats[]>;
export declare const getGetFlashcardStatsQueryKey: () => readonly ["/api/flashcards/stats"];
export declare const getGetFlashcardStatsQueryOptions: <TData = Awaited<ReturnType<typeof getFlashcardStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFlashcardStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFlashcardStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFlashcardStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getFlashcardStats>>>;
export type GetFlashcardStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get study stats grouped by level
 */
export declare function useGetFlashcardStats<TData = Awaited<ReturnType<typeof getFlashcardStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFlashcardStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetDailyFlashcardsUrl: (params?: GetDailyFlashcardsParams) => string;
/**
 * @summary Get today's recommended flashcard set
 */
export declare const getDailyFlashcards: (params?: GetDailyFlashcardsParams, options?: RequestInit) => Promise<Flashcard[]>;
export declare const getGetDailyFlashcardsQueryKey: (params?: GetDailyFlashcardsParams) => readonly ["/api/flashcards/daily", ...GetDailyFlashcardsParams[]];
export declare const getGetDailyFlashcardsQueryOptions: <TData = Awaited<ReturnType<typeof getDailyFlashcards>>, TError = ErrorType<unknown>>(params?: GetDailyFlashcardsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDailyFlashcards>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDailyFlashcards>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDailyFlashcardsQueryResult = NonNullable<Awaited<ReturnType<typeof getDailyFlashcards>>>;
export type GetDailyFlashcardsQueryError = ErrorType<unknown>;
/**
 * @summary Get today's recommended flashcard set
 */
export declare function useGetDailyFlashcards<TData = Awaited<ReturnType<typeof getDailyFlashcards>>, TError = ErrorType<unknown>>(params?: GetDailyFlashcardsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDailyFlashcards>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetFlashcardUrl: (id: number) => string;
/**
 * @summary Get a single flashcard
 */
export declare const getFlashcard: (id: number, options?: RequestInit) => Promise<Flashcard>;
export declare const getGetFlashcardQueryKey: (id: number) => readonly [`/api/flashcards/${number}`];
export declare const getGetFlashcardQueryOptions: <TData = Awaited<ReturnType<typeof getFlashcard>>, TError = ErrorType<ApiError>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFlashcard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFlashcard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFlashcardQueryResult = NonNullable<Awaited<ReturnType<typeof getFlashcard>>>;
export type GetFlashcardQueryError = ErrorType<ApiError>;
/**
 * @summary Get a single flashcard
 */
export declare function useGetFlashcard<TData = Awaited<ReturnType<typeof getFlashcard>>, TError = ErrorType<ApiError>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFlashcard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateFlashcardProgressUrl: (id: number) => string;
/**
 * @summary Mark a flashcard as known or unknown
 */
export declare const updateFlashcardProgress: (id: number, progressUpdate: ProgressUpdate, options?: RequestInit) => Promise<Flashcard>;
export declare const getUpdateFlashcardProgressMutationOptions: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateFlashcardProgress>>, TError, {
        id: number;
        data: BodyType<ProgressUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateFlashcardProgress>>, TError, {
    id: number;
    data: BodyType<ProgressUpdate>;
}, TContext>;
export type UpdateFlashcardProgressMutationResult = NonNullable<Awaited<ReturnType<typeof updateFlashcardProgress>>>;
export type UpdateFlashcardProgressMutationBody = BodyType<ProgressUpdate>;
export type UpdateFlashcardProgressMutationError = ErrorType<ApiError>;
/**
* @summary Mark a flashcard as known or unknown
*/
export declare const useUpdateFlashcardProgress: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateFlashcardProgress>>, TError, {
        id: number;
        data: BodyType<ProgressUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateFlashcardProgress>>, TError, {
    id: number;
    data: BodyType<ProgressUpdate>;
}, TContext>;
export declare const getListWorkspacesUrl: () => string;
/**
 * @summary List the caller's workspaces (default + user-created)
 */
export declare const listWorkspaces: (options?: RequestInit) => Promise<WorkspaceList>;
export declare const getListWorkspacesQueryKey: () => readonly ["/api/me/workspaces"];
export declare const getListWorkspacesQueryOptions: <TData = Awaited<ReturnType<typeof listWorkspaces>>, TError = ErrorType<ApiError>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listWorkspaces>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listWorkspaces>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListWorkspacesQueryResult = NonNullable<Awaited<ReturnType<typeof listWorkspaces>>>;
export type ListWorkspacesQueryError = ErrorType<ApiError>;
/**
 * @summary List the caller's workspaces (default + user-created)
 */
export declare function useListWorkspaces<TData = Awaited<ReturnType<typeof listWorkspaces>>, TError = ErrorType<ApiError>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listWorkspaces>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateWorkspaceUrl: () => string;
/**
 * @summary Create a new workspace (max 2 per user)
 */
export declare const createWorkspace: (workspaceCreateInput: WorkspaceCreateInput, options?: RequestInit) => Promise<Workspace>;
export declare const getCreateWorkspaceMutationOptions: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createWorkspace>>, TError, {
        data: BodyType<WorkspaceCreateInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createWorkspace>>, TError, {
    data: BodyType<WorkspaceCreateInput>;
}, TContext>;
export type CreateWorkspaceMutationResult = NonNullable<Awaited<ReturnType<typeof createWorkspace>>>;
export type CreateWorkspaceMutationBody = BodyType<WorkspaceCreateInput>;
export type CreateWorkspaceMutationError = ErrorType<ApiError>;
/**
* @summary Create a new workspace (max 2 per user)
*/
export declare const useCreateWorkspace: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createWorkspace>>, TError, {
        data: BodyType<WorkspaceCreateInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createWorkspace>>, TError, {
    data: BodyType<WorkspaceCreateInput>;
}, TContext>;
export declare const getSwitchWorkspaceUrl: (id: string) => string;
/**
 * @summary Set the active workspace for the caller
 */
export declare const switchWorkspace: (id: string, options?: RequestInit) => Promise<WorkspaceSwitchResult>;
export declare const getSwitchWorkspaceMutationOptions: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof switchWorkspace>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof switchWorkspace>>, TError, {
    id: string;
}, TContext>;
export type SwitchWorkspaceMutationResult = NonNullable<Awaited<ReturnType<typeof switchWorkspace>>>;
export type SwitchWorkspaceMutationError = ErrorType<ApiError>;
/**
* @summary Set the active workspace for the caller
*/
export declare const useSwitchWorkspace: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof switchWorkspace>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof switchWorkspace>>, TError, {
    id: string;
}, TContext>;
export declare const getDeleteWorkspaceUrl: (id: string) => string;
/**
 * @summary Delete a user-created workspace
 */
export declare const deleteWorkspace: (id: string, options?: RequestInit) => Promise<DeleteWorkspace200>;
export declare const getDeleteWorkspaceMutationOptions: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteWorkspace>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteWorkspace>>, TError, {
    id: string;
}, TContext>;
export type DeleteWorkspaceMutationResult = NonNullable<Awaited<ReturnType<typeof deleteWorkspace>>>;
export type DeleteWorkspaceMutationError = ErrorType<ApiError>;
/**
* @summary Delete a user-created workspace
*/
export declare const useDeleteWorkspace: <TError = ErrorType<ApiError>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteWorkspace>>, TError, {
        id: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteWorkspace>>, TError, {
    id: string;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map