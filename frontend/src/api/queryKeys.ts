export const queryKeys = {
  sentence: (id: number) => ['sentence', id] as const,
  annotations: (sentenceId: number) => ['sentence', sentenceId, 'annotations'] as const,
  reviews: (sentenceId: number) => ['sentence', sentenceId, 'reviews'] as const,
  adjudication: (sentenceId: number) => ['sentence', sentenceId, 'adjudication'] as const,
  validation: (sentenceId: number) => ['sentence', sentenceId, 'validation'] as const,
}
