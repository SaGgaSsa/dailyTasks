'use client'

import type { EnvironmentLogBatchView } from '@/app/actions/environment-log'
import { ConfigurationLogContent } from './configuration-log-content'
import { DeployLogContent } from './deploy-log-content'
import { ScriptLogContent } from './script-log-content'

interface EnvironmentLogTypeContentProps {
  batch: EnvironmentLogBatchView
}

export function EnvironmentLogTypeContent({ batch }: EnvironmentLogTypeContentProps) {
  switch (batch.type) {
    case 'DEPLOY':
      return <DeployLogContent batch={batch} />
    case 'CONFIGURATION':
      return <ConfigurationLogContent entry={batch} />
    case 'SCRIPT':
      return <ScriptLogContent entry={batch} />
    default:
      return null
  }
}
