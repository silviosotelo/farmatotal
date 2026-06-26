# Auditoría de Componentes UI — Ecme vs HTML Custom

**Fecha:** 26 de junio de 2026

## Regla: ZERO custom HTML, TODO componente Ecme
**Archivo**: `apps/admin/AGENTS.md`

## Componentes Ecme Disponibles
Button, Card, Input, Select, Switcher, Tabs, Tag, FormItem, Menu, MenuItem,
Dialog, Drawer, Dropdown, Alert, Avatar, Badge, Checkbox, Radio, Progress,
Segment, Slider, Spinner, Steps, Table, Timeline, Tooltip, Upload, etc.

## Auditoría Previa: 130+ instancias de HTML custom (ya corregidas)

### Tablas raw → `<Table>` Ecme (19 tablas, 13 archivos)
Categories, Payments, Mailer, Cms, Inventory, Variants, OrderDetailSimple,
Users, Slides, Reports, ErpSync, Whatsapp, StoreDashboard

### Labels raw → `<FormItem>` (~65 labels, 18 archivos)
Categories, Payments, Mailer, Cms, Variants, Users, Slides, Coupons,
Attributes, Branches, Settings, PluginConfig, StoreConfig, Shipping,
Reviews, OverviewSection, CustomerDetailSection, EntityFields

### Selects raw → `<Select>` (9 selects, 6 archivos)
Categories, CheckoutFields, ErpSync, EntityFieldsEditor,
CustomFieldsSection, PlainCustomFields

### Textareas raw → `<Input textArea>` (4, 3 archivos)
Mailer, Whatsapp, CustomFieldsSection, PlainCustomFields

## Estado Actual
Todas las rutas de admin usan componentes Ecme. La regla está en AGENTS.md.
Los componentes de plugins (PluginConfig.tsx) usan FormItem/Input/Select/Switcher de Ecme.

## Componentes UI Ecme — Todos size="md"
Se estandarizaron 95 instancias de `size="xs"` y `size="sm"` a `size="md"` en 35 archivos.
No queda ninguna instancia de `size="xs"` o `size="sm"` en todo el admin.

## Store: Patrón de estilos
- Container: `ft-container` (1200px max)
- Cards: `rounded-xl border border-[#ededf1] bg-white p-6`
- Headings: `font-heading text-2xl text-brand-text`
- Buttons: `brand-gradient focus-ring text-white rounded-[30px]`
- Labels: `text-brand-muted`
- Prices: `font-price text-brand-orange font-bold`
- Tabs: Ecme `<Tabs>/<TabList>/<TabNav>/<TabContent>`
- Alerts: Ecme `<Alert showIcon type="success|danger|info">`
