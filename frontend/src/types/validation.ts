export interface ValidationIssue {
  code: string
  message: string
  context?: Record<string, unknown>
}

export interface ValidationReport {
  isValid: boolean
  amrVersion: string
  roleSetVersion: string
  ruleVersion: string
  canonicalPenman?: string | null
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}
