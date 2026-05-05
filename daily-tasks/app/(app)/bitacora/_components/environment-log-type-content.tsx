'use client'

import type { EnvironmentLogBatchView } from '@/app/actions/environment-log'
import { ConfigurationLogContent } from './configuration-log-content'
import { DeployLogContent } from './deploy-log-content'

interface EnvironmentLogTypeContentProps {
  batch: EnvironmentLogBatchView
}

export function EnvironmentLogTypeContent({ batch }: EnvironmentLogTypeContentProps) {
  switch (batch.type) {
    case 'DEPLOY':
      return <DeployLogContent batch={batch} />
    case 'CONFIGURATION':
      return <ConfigurationLogContent entry={batch} />
    default:
      return null
  }
}
