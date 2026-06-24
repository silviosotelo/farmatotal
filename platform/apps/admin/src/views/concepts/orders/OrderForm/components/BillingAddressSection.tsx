import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FormItem } from '@/components/ui/Form'
import { countryList } from '@/constants/countries.constant'
import { Controller } from 'react-hook-form'
import { CountryOption, CustomSelectOption, CustomControl } from '@/components/shared/CountrySelect'
import type { FormSectionBaseProps } from '../types'

type BillingAddressSectionProps = FormSectionBaseProps

const BillingAddressSection = ({
    control,
    errors,
}: BillingAddressSectionProps) => {
    return (
        <Card id="addressInformation">
            <h4 className="mb-6">Address Information</h4>
            <FormItem
                label="Country"
                invalid={Boolean(errors.country)}
                errorMessage={errors.country?.message}
            >
                <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                        <Select<CountryOption>
                            options={countryList}
                            {...field}
                            components={{
                                Option: CustomSelectOption,
                                Control: CustomControl,
                            }}
                            placeholder=""
                            value={countryList.filter(
                                (option) => option.value === field.value,
                            )}
                            onChange={(option) => field.onChange(option?.value)}
                        />
                    )}
                />
            </FormItem>
            <FormItem
                label="Address"
                invalid={Boolean(errors.address)}
                errorMessage={errors.address?.message}
            >
                <Controller
                    name="address"
                    control={control}
                    render={({ field }) => (
                        <Input
                            type="text"
                            autoComplete="off"
                            placeholder="Address"
                            {...field}
                        />
                    )}
                />
            </FormItem>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem
                    label="City"
                    invalid={Boolean(errors.city)}
                    errorMessage={errors.city?.message}
                >
                    <Controller
                        name="city"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                autoComplete="off"
                                placeholder="City"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
                <FormItem
                    label="Postal Code"
                    invalid={Boolean(errors.postcode)}
                    errorMessage={errors.postcode?.message}
                >
                    <Controller
                        name="postcode"
                        control={control}
                        render={({ field }) => (
                            <Input
                                type="text"
                                autoComplete="off"
                                placeholder="Postal Code"
                                {...field}
                            />
                        )}
                    />
                </FormItem>
            </div>
        </Card>
    )
}

export default BillingAddressSection
