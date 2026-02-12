'use client'

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class PerformanceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorMessage = error.message || ''
    
    // Ignorar errores específicos de performance.measure con timestamp negativo
    if (
      errorMessage.includes('cannot have a negative time stamp') ||
      errorMessage.includes('Failed to execute \'measure\'') ||
      errorMessage.includes('performance.measure')
    ) {
      console.warn('Suprimido error de performance timing:', errorMessage)
      // Resetear el estado para que la app continúe funcionando
      this.setState({ hasError: false })
      return
    }

    // Loguear otros errores normalmente
    console.error('Error no manejado:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Intentar recuperar automáticamente
      setTimeout(() => {
        this.setState({ hasError: false })
      }, 100)
      
      return (
        <div className="flex items-center justify-center h-screen bg-zinc-900">
          <div className="text-center">
            <div className="text-zinc-400 mb-4">Recuperando...</div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
