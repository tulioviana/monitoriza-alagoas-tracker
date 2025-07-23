
import { SettingsLayout } from '@/components/settings/SettingsLayout'
import { SettingsProvider } from '@/contexts/SettingsContext'

interface SettingsViewProps {
  initialSection?: string
}

export function SettingsView({ initialSection }: SettingsViewProps) {
  return (
    <SettingsProvider>
      <SettingsLayout initialSection={initialSection} />
    </SettingsProvider>
  )
}
