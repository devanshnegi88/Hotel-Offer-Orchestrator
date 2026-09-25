/**
 * Single task queue for the hotel-offers workflow and its activities.
 * Defined once so the worker and the client can't drift out of sync.
 */
export const HOTEL_OFFERS_TASK_QUEUE = "hotel-offers-task-queue";
