import { usePluginConfig } from "@/components/providers/PluginConfigContext"

const DEFAULTS: Record<string, string> = {
  textsInventoryLabel: 'Inventario',
  textsStock: '%d en stock',
  textsLeftInStock: '%s en stock',
  textsInStock: 'En stock',
  textsOutOfStock: 'Sin stock',
  textsNotInStock: 'No disponible',
  textsNotEnoughStock: 'No podés comprar más de %d unidades de %s.',
  textsNoInventorySelected: 'Por favor seleccioná un inventario.',
  textsDeliveryTime: 'Tiempo de entrega: ',
  textsSelectStore: 'Elegí tu sucursal',
  textsLocalPickup: 'Retiro en sucursal',
  textsDelivery: 'Envío a domicilio',
}

export function useTexts() {
  const config = usePluginConfig()

  const get = (key: string, ...args: (string | number)[]) => {
    const template = String((config[key] as string) || DEFAULTS[key] || key)
    return args.reduce((str: string, arg, i) => str.replace(`%${i + 1}`, String(arg)), template)
  }

  return { get, all: { ...DEFAULTS, ...config } as Record<string, string> }
}
