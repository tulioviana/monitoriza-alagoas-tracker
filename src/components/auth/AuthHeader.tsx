import whispriceLogo from '@/assets/whisprice-logo.png'

interface AuthHeaderProps {
  title: string
  description: string
}

export function AuthHeader({ title, description }: AuthHeaderProps) {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <img 
          src={whispriceLogo} 
          alt="Whisprice" 
          className="h-16 w-auto object-contain"
        />
      </div>
      <div className="space-y-2">
        <h1 className="text-display-lg text-foreground">{title}</h1>
        <p className="text-body-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}