import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Image, Monitor, Mic, Users, Ruler } from 'lucide-react'

export default function EspecificacoesPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Especificações do Local</h1>
        <p className="text-[var(--gray-500)] mt-1">Informações sobre o espaço de eventos e requisitos de mídia</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--gray-900)] flex items-center gap-2">
              <Users size={20} className="text-[var(--primary)]" />
              Sala de Eventos FSS
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-[var(--gray-600)]">
              Informações detalhadas sobre o espaço serão adicionadas em breve.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--gray-50)] rounded-lg p-4">
                <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Capacidade</p>
                <p className="text-lg font-semibold text-[var(--gray-900)] mt-1">A definir</p>
              </div>
              <div className="bg-[var(--gray-50)] rounded-lg p-4">
                <p className="text-xs font-medium text-[var(--gray-500)] uppercase">Localização</p>
                <p className="text-lg font-semibold text-[var(--gray-900)] mt-1">FSS</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--gray-900)] flex items-center gap-2">
              <Image size={20} className="text-[var(--primary)]" />
              Tamanhos de Imagens para Mídia
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--gray-500)] mb-4">
              Seção em construção. Em breve serão adicionadas as especificações de tamanhos de imagens para banners, posts e materiais de divulgação.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-[var(--gray-50)] rounded-lg p-4">
                <Monitor size={20} className="text-[var(--gray-400)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--gray-700)]">Banner principal</p>
                  <p className="text-xs text-[var(--gray-400)]">Dimensões a definir</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[var(--gray-50)] rounded-lg p-4">
                <Ruler size={20} className="text-[var(--gray-400)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--gray-700)]">Posts para redes sociais</p>
                  <p className="text-xs text-[var(--gray-400)]">Dimensões a definir</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--gray-900)] flex items-center gap-2">
              <Mic size={20} className="text-[var(--primary)]" />
              Recursos Disponíveis
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--gray-500)]">
              Lista de equipamentos e recursos disponíveis será adicionada em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
