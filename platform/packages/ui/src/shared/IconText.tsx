import classNames from '@platform/ui/utils/classNames'
import type { CommonProps } from '@platform/ui/@types/common'
import type { ReactNode, ElementType } from 'react'

export interface IconTextProps extends CommonProps {
    icon?: ReactNode | string
    asElement?: ElementType
}

const IconText = ({
    className,
    asElement: Component = 'span',
    icon,
    children,
}: IconTextProps) => {
    return (
        <Component className={classNames('flex items-center gap-2', className)}>
            {icon}
            {children}
        </Component>
    )
}

export default IconText
