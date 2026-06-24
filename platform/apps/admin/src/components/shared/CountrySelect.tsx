import Avatar from '@/components/ui/Avatar'
import { Option as DefaultOption } from '@/components/ui/Select'
import { components } from 'react-select'
import type { OptionProps, ControlProps } from 'react-select'

export type CountryOption = {
    label: string
    dialCode: string
    value: string
}

const { Control } = components

export const CustomSelectOption = (props: OptionProps<CountryOption>) => {
    return (
        <DefaultOption<CountryOption>
            {...props}
            customLabel={(data) => (
                <span className="flex items-center gap-2">
                    <Avatar
                        shape="circle"
                        size={20}
                        src={`/img/countries/${data.value}.png`}
                    />
                    <span>{data.dialCode}</span>
                </span>
            )}
        />
    )
}

export const CustomControl = ({
    children,
    ...props
}: ControlProps<CountryOption>) => {
    const selected = props.getValue()[0]
    return (
        <Control {...props}>
            {selected && (
                <Avatar
                    className="ltr:ml-4 rtl:mr-4"
                    shape="circle"
                    size={20}
                    src={`/img/countries/${selected.value}.png`}
                />
            )}
            {children}
        </Control>
    )
}
