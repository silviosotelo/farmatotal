import Input from '@platform/ui/ui/Input'
import useDebounce from '@platform/ui/utils/hooks/useDebounce'
import type { ChangeEvent, Ref } from 'react'
import type { InputProps } from '@platform/ui/ui/Input'

type DebouceInputProps = InputProps & {
    wait?: number
    ref?: Ref<HTMLInputElement>
}

const DebouceInput = (props: DebouceInputProps) => {
    const { wait = 500, ref, ...rest } = props

    function handleDebounceFn(value: ChangeEvent<HTMLInputElement>) {
        props.onChange?.(value)
    }

    const debounceFn = useDebounce(handleDebounceFn, wait)

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        debounceFn(e)
    }

    return <Input ref={ref} {...rest} onChange={handleInputChange} />
}

export default DebouceInput
