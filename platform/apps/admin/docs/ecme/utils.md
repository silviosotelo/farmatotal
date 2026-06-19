# Ecme — Utils, Hooks & HOCs

Catálogo conciso de las utilidades, hooks y HOCs del template Ecme (admin).
Fuente real: `apps/admin/src/utils/`. Todos los módulos usan `export default` (salvo donde se indica named export).

## Índice

| Categoría | Nombre | Propósito |
|---|---|---|
| Función | `acronym` | Iniciales/acrónimo de un texto |
| Función | `classNames` | Combina clases + merge Tailwind |
| Función | `cookiesStorage` | Adapter StateStorage sobre cookies |
| Función | `fileSizeUnit` | Formatea bytes a unidad legible |
| Función | `isLastChild` | ¿índice es el último del array? |
| Función | `paginate` | Corta un array por página |
| Función | `reoderArray` | Mueve un elemento de índice a índice |
| Función | `reorderDragable` | Reordena/mueve entre listas drag&drop |
| Función | `sleep` | Promesa que resuelve tras N ms |
| Función | `sortBy` | Comparador genérico para `.sort()` |
| Función | `wildCardSearch` | Filtra lista por texto (contains) |
| Hook | `useAuthority` | ¿el usuario tiene algún rol requerido? |
| Hook | `useDarkMode` | Lee/cambia modo claro-oscuro |
| Hook | `useDebounce` | Envuelve función con debounce (lodash) |
| Hook | `useDirection` | Lee/cambia dirección LTR/RTL |
| Hook | `useInfiniteScroll` | Scroll infinito vía IntersectionObserver |
| Hook | `useInterval` | setInterval declarativo |
| Hook | `useLayout` | Accede al LayoutContext |
| Hook | `useLayoutGap` | Gap superior según tipo de layout |
| Hook | `useLocale` | Sincroniza idioma i18next con el store |
| Hook | `useMenuActive` | Ruta activa dentro del árbol de navegación |
| Hook | `useQuery` | Parsea query string de la URL |
| Hook | `useRandomBgColor` | Color de fondo Tailwind estable por nombre |
| Hook | `useResponsive` | Estado de breakpoints según ancho |
| Hook | `useScrollTop` | ¿la página está scrolleada? (sticky) |
| Hook | `useThemeSchema` | Aplica variables CSS del esquema de tema |
| Hook | `useTimeOutMessage` | Mensaje que se autolimpia tras N ms |
| Hook | `useTranslation` | Wrapper de react-i18next (con placeholder) |
| HOC | `withHeaderItem` | Estiliza un item de la barra de header |

---

## Funciones utilitarias

### acronym
- **Propósito**: extrae las iniciales de cada palabra de un texto.
- **Import**: `import acronym from '@/utils/acronym'`
- **Firma**: `acronym(name?: string): string`
- **Ejemplo**:
```ts
acronym('Angelina Gotelli') // 'AG'
```

### classNames
- **Propósito**: combina clases condicionales (`classnames`) y resuelve conflictos Tailwind (`twMerge`).
- **Import**: `import classNames from '@/utils/classNames'`
- **Firma**: `classNames(...args: cn.ArgumentArray): string`
- **Ejemplo**:
```ts
classNames('p-2', isActive && 'bg-primary', 'p-4') // 'bg-primary p-4'
```

### cookiesStorage
- **Propósito**: adapter `StateStorage` (getItem/setItem/removeItem) respaldado por cookies (`js-cookie`); útil para persistencia de stores Zustand.
- **Import**: `import cookiesStorage from '@/utils/cookiesStorage'`
- **Firma**: `cookiesStorage.setItem(name: string, value: string, expires?: number | Date): void` · `getItem(name): string | null` · `removeItem(name): void`
- **Ejemplo**:
```ts
cookiesStorage.setItem('token', 'abc', 7) // expira en 7 días
```

### fileSizeUnit
- **Propósito**: formatea un tamaño en bytes a unidad legible (SI o binaria).
- **Import**: `import fileSizeUnit from '@/utils/fileSizeUnit'`
- **Firma**: `fileSizeUnit(bytes: number, si?: boolean, dp?: number): string`
- **Ejemplo**:
```ts
fileSizeUnit(1500)        // '1.5 kB'
fileSizeUnit(1024, false) // '1.0 KiB'
```

### isLastChild
- **Propósito**: indica si un índice corresponde al último elemento del array.
- **Import**: `import isLastChild from '@/utils/isLastChild'`
- **Firma**: `isLastChild(arr: Array<unknown>, index: number): boolean`
- **Ejemplo**:
```ts
isLastChild(['a','b'], 1) // true
```

### paginate
- **Propósito**: devuelve la porción del array correspondiente a una página.
- **Import**: `import paginate from '@/utils/paginate'`
- **Firma**: `paginate(array: any[], pageSize: number, pageNumber: number): any[]`
- **Ejemplo**:
```ts
paginate(items, 10, 2) // elementos 11..20
```

### reoderArray
- **Propósito**: mueve un elemento de una posición a otra (inmutable). (Nota: nombre con typo "reoder").
- **Import**: `import reoderArray from '@/utils/reoderArray'`
- **Firma**: `reoderArray<T>(list: T[], startIndex: number, endIndex: number): T[]`
- **Ejemplo**:
```ts
reoderArray(['a','b','c'], 0, 2) // ['b','c','a']
```

### reorderDragable
- **Propósito**: reordena dentro de una lista o mueve entre listas de un mapa (drag&drop con `@hello-pangea/dnd`).
- **Import**: `import reorderDragable from '@/utils/reorderDragable'` (también named export)
- **Firma**: `reorderDragable<T>({ quoteMap: T, source: DraggableLocation, destination: DraggableLocation }): { quoteMap: T }`
- **Ejemplo**:
```ts
const { quoteMap } = reorderDragable({ quoteMap, source, destination })
```

### sleep
- **Propósito**: pausa asíncrona (espera N milisegundos).
- **Import**: `import sleep from '@/utils/sleep'`
- **Firma**: `sleep(ms: number): Promise<void>`
- **Ejemplo**:
```ts
await sleep(500)
```

### sortBy
- **Propósito**: genera un comparador para `Array.prototype.sort()` por campo, con dirección y `primer` opcional. Usa `localeCompare` para strings.
- **Import**: `import sortBy, { type Primer } from '@/utils/sortBy'`
- **Firma**: `sortBy<T>(field: keyof T, reverse: boolean, primer?: (value: Primitive) => Primitive): (a: T, b: T) => number`
- **Ejemplo**:
```ts
list.sort(sortBy('name', false, (v) => String(v).toLowerCase()))
```

### wildCardSearch
- **Propósito**: filtra una lista buscando coincidencia (contains, case-insensitive) en cualquier clave o en una clave específica.
- **Import**: `import wildCardSearch from '@/utils/wildCardSearch'`
- **Firma**: `wildCardSearch(list: Array<Record<string, string | number>>, input: string, specifyKey?: string): typeof list`
- **Ejemplo**:
```ts
wildCardSearch(users, 'ana')          // busca en todas las claves
wildCardSearch(users, 'ana', 'name')  // solo en 'name'
```

---

## Hooks

### useAuthority
- **Propósito**: comprueba si los roles del usuario incluyen alguno de los roles requeridos.
- **Import**: `import useAuthority from '@/utils/hooks/useAuthority'`
- **Firma**: `useAuthority(userAuthority?: string[], authority?: string[], emptyCheck?: boolean): boolean`
- **Ejemplo**:
```ts
const ok = useAuthority(user.authority, ['admin'])
```

### useDarkMode
- **Propósito**: lee y cambia el modo claro/oscuro (themeStore); aplica la clase al `<html>`.
- **Import**: `import useDarkMode from '@/utils/hooks/useDarkMode'`
- **Firma**: `useDarkMode(): [isEnabled: boolean, onModeChange: (mode: Mode) => void]`
- **Ejemplo**:
```ts
const [isDark, setMode] = useDarkMode()
setMode(isDark ? 'light' : 'dark')
```

### useDebounce
- **Propósito**: envuelve una función con debounce de lodash.
- **Import**: `import useDebounce from '@/utils/hooks/useDebounce'`
- **Firma**: `useDebounce<T extends Function>(func: T, wait?: number, options?: DebounceSettingsLeading): DebouncedFunc<T>`
- **Ejemplo**:
```ts
const onSearch = useDebounce((q: string) => fetch(q), 400)
```

### useDirection
- **Propósito**: lee y cambia la dirección del documento (LTR/RTL); setea `dir` en `<html>`.
- **Import**: `import useDirection from '@/utils/hooks/useDirection'`
- **Firma**: `useDirection(): [direction: Direction, setDirection: (dir: Direction) => void]`
- **Ejemplo**:
```ts
const [dir, setDir] = useDirection()
setDir('rtl')
```

### useInfiniteScroll
- **Propósito**: dispara `onLoadMore` al llegar al final del contenedor usando IntersectionObserver.
- **Import**: `import useInfiniteScroll from '@/utils/hooks/useInfiniteScroll'`
- **Firma**: `useInfiniteScroll(options?: { offset?: string; shouldStop?: boolean; onLoadMore?: () => Promise<void> }): { isLoading: boolean; containerRef: LegacyRef<HTMLElement> }`
- **Ejemplo**:
```ts
const { isLoading, containerRef } = useInfiniteScroll({ onLoadMore: load })
return <div ref={containerRef}>...</div>
```

### useInterval
- **Propósito**: `setInterval` declarativo; `delay = null` lo pausa.
- **Import**: `import useInterval from '@/utils/hooks/useInterval'` (⚠️ el archivo fuente tiene un espacio final: `useInterval .ts`)
- **Firma**: `useInterval(callback: () => void, delay: number | null): RefObject<number | null>`
- **Ejemplo**:
```ts
useInterval(() => tick(), running ? 1000 : null)
```

### useLayout
- **Propósito**: accede al `LayoutContext` (tipo de layout y reensamblado de PageContainer); lanza error fuera del provider.
- **Import**: `import useLayout, { LayoutContext } from '@/utils/hooks/useLayout'`
- **Firma**: `useLayout(): LayoutContextProps`
- **Ejemplo**:
```ts
const { type } = useLayout()
```

### useLayoutGap
- **Propósito**: calcula el gap superior según el tipo de layout (basado en `HEADER_HEIGHT`).
- **Import**: `import useLayoutGap from '@/utils/hooks/useLayoutGap'`
- **Firma**: `useLayoutGap(): { getTopGapValue: () => number }`
- **Ejemplo**:
```ts
const { getTopGapValue } = useLayoutGap()
const top = getTopGapValue()
```

### useLocale
- **Propósito**: sincroniza el idioma de i18next con el `localeStore`.
- **Import**: `import useLocale from '@/utils/hooks/useLocale'`
- **Firma**: `useLocale(): { locale: string }`
- **Ejemplo**:
```ts
const { locale } = useLocale()
```

### useMenuActive
- **Propósito**: resuelve la ruta activa y la rama raíz dentro del árbol de navegación según una `key`.
- **Import**: `import useMenuActive from '@/utils/hooks/useMenuActive'`
- **Firma**: `useMenuActive(navTree: NavigationTree[], key: string): { activedRoute?: NavInfo; includedRouteTree: NavigationTree }`
- **Ejemplo**:
```ts
const { activedRoute } = useMenuActive(navTree, currentKey)
```

### useQuery
- **Propósito**: parsea el query string de la URL como `URLSearchParams` (memoizado).
- **Import**: `import useQuery from '@/utils/hooks/useQuery'`
- **Firma**: `useQuery(): URLSearchParams`
- **Ejemplo**:
```ts
const id = useQuery().get('id')
```

### useRandomBgColor
- **Propósito**: devuelve una clase Tailwind de fondo estable (determinista) a partir de un nombre.
- **Import**: `import useRandomBgColor from '@/utils/hooks/useRandomBgColor'`
- **Firma**: `useRandomBgColor(): (name: string) => string`
- **Ejemplo**:
```ts
const bgColor = useRandomBgColor()
<span className={bgColor(user.name)} />
```

### useResponsive
- **Propósito**: estado reactivo de breakpoints (larger/smaller por `2xl..xs`) según el ancho de ventana.
- **Import**: `import useResponsive from '@/utils/hooks/useResponsive'`
- **Firma**: `useResponsive(): { windowWidth: number; larger: Record<bp, boolean>; smaller: Record<bp, boolean> }`
- **Ejemplo**:
```ts
const { smaller } = useResponsive()
if (smaller.md) { /* móvil */ }
```

### useScrollTop
- **Propósito**: indica si la página fue scrolleada (útil para headers sticky).
- **Import**: `import useScrollTop from '@/utils/hooks/useScrollTop'`
- **Firma**: `useScrollTop(): { isSticky: boolean }`
- **Ejemplo**:
```ts
const { isSticky } = useScrollTop()
```

### useThemeSchema
- **Propósito**: aplica las variables CSS (`--primary`, etc.) del esquema de tema actual al `<html>`. No retorna valor.
- **Import**: `import useThemeSchema, { mapTheme } from '@/utils/hooks/useThemeSchema'`
- **Firma**: `useThemeSchema(): void`
- **Ejemplo**:
```ts
useThemeSchema() // efecto: setea variables CSS según themeStore
```

### useTimeOutMessage
- **Propósito**: estado de mensaje que se autolimpia tras `interval` ms (ideal para alerts de formularios).
- **Import**: `import useTimeOutMessage from '@/utils/hooks/useTimeOutMessage'`
- **Firma**: `useTimeOutMessage(interval?: number): [string, Dispatch<SetStateAction<string>>]`
- **Ejemplo**:
```ts
const [message, setMessage] = useTimeOutMessage()
setMessage('Error al guardar')
```

### useTranslation
- **Propósito**: wrapper de `react-i18next`; con `usePlaceholder=true` devuelve un `t` que solo retorna el fallback (sin traducir).
- **Import**: `import useTranslation from '@/utils/hooks/useTranslation'` (también named export)
- **Firma**: `useTranslation(usePlaceholder?: boolean): { t; i18n; ready }`
- **Ejemplo**:
```ts
const { t } = useTranslation()
t('nav.dashboard', 'Dashboard')
```

---

## HOCs

### withHeaderItem
- **Propósito**: HOC que envuelve un componente añadiéndole las clases del item de la barra de header (`header-action-item` + hover opcional).
- **Import**: `import withHeaderItem from '@/utils/hoc/withHeaderItem'`
- **Firma**: `withHeaderItem<T extends WithHeaderItemProps>(Component: ComponentType<Omit<T, keyof WithHeaderItemProps>>): FC<T>` · `WithHeaderItemProps = { className?: string; hoverable?: boolean }`
- **Ejemplo**:
```tsx
const Notification = withHeaderItem(BaseNotification)
<Notification hoverable />
```
