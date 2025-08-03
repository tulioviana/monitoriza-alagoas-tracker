import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    // Check if error is caused by browser extensions
    const isExtensionError = this.isExtensionRelatedError(error);
    
    if (isExtensionError) {
      console.warn('EXTENSION INTERFERENCE DETECTED:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
      
      // For extension errors, we might want to just log and not show the error UI
      // depending on the severity
      if (this.isCriticalExtensionError(error)) {
        this.setState({ error, errorInfo });
      } else {
        // Minor extension error - just log it and don't break the UI
        console.warn('Non-critical extension error ignored:', error.message);
        return;
      }
    } else {
      // Log critical errors for debugging
      if (error.message.includes('protocol') || error.message.includes('location')) {
        console.error('CRITICAL ERROR DETECTED:', {
          type: error.message.includes('protocol') ? 'SUPABASE_CONNECTION' : 'ROUTING',
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        });
      }
      
      this.setState({ error, errorInfo });
    }
  }

  private isExtensionRelatedError(error: Error): boolean {
    const extensionIndicators = [
      'Extension',
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      'PIN Company',
      'listener indicated an asynchronous response',
      'Script error',
      'Non-Error promise rejection',
      'ResizeObserver loop limit exceeded'
    ];
    
    return extensionIndicators.some(indicator => 
      error.message.includes(indicator) || 
      error.stack?.includes(indicator)
    );
  }

  private isCriticalExtensionError(error: Error): boolean {
    // Define which extension errors are critical enough to show error boundary
    const criticalPatterns = [
      'Cannot read properties of undefined',
      'Cannot access before initialization',
      'is not a function'
    ];
    
    return criticalPatterns.some(pattern => error.message.includes(pattern));
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Erro na Aplicação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Ocorreu um erro inesperado. Por favor, tente recarregar a página ou entre em contato com o suporte.
              </p>
              
              {this.state.error && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p className="font-medium">Detalhes do erro:</p>
                  <p className="text-muted-foreground mt-1">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleRetry}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tentar Novamente
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="default"
                >
                  Recarregar Página
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}