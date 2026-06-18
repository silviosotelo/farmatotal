import NoDataFound from '@/assets/svg/NoDataFound'
import type { ReactNode } from 'react'

/**
 * Estado vacío premium reutilizable (ilustración + título + descripción + CTA).
 * Usa la ilustración nativa de Ecme para mantener coherencia visual.
 */
const EmptyState = ({
    title,
    description,
    action,
    icon,
    compact,
}: {
    title: string
    description?: string
    action?: ReactNode
    icon?: ReactNode
    compact?: boolean
}) => (
    <div
        className={`flex flex-col items-center justify-center gap-3 text-center ${
            compact ? 'py-8' : 'py-14'
        }`}
    >
        <div className="opacity-90">
            {icon ?? <NoDataFound height={compact ? 110 : 150} width={compact ? 110 : 150} />}
        </div>
        <h6 className="font-semibold text-gray-700 dark:text-gray-200">{title}</h6>
        {description && (
            <p className="max-w-sm text-sm text-gray-500">{description}</p>
        )}
        {action && <div className="mt-1">{action}</div>}
    </div>
)

export default EmptyState
