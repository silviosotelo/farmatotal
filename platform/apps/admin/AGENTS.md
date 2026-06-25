# Admin — Reglas del codebase

## REGLA #1: CERO HTML CUSTOM, TODO COMPONENTE ECME

**NUNCA** usar:
- Emojis como icons (❌ `🔑`, `💳`, `🔄`, `📱`, `⚙️`, etc.)
- HTML crudo: `<input>`, `<select>`, `<textarea>`, `<table>`, `<button>`, `<label>`, `<img>`, `<a href>`
- Inline styles: `style={{ ... }}`
- CSS clases raw: `bg-gray-100`, `rounded-lg`, etc. en elementos no-Ecme

**SIEMPRE** usar los componentes Ecme:
- Botones → `<Button>` de `@/components/ui/Button`
- Inputs → `<Input>` de `@/components/ui/Input`
- Selects → `<Select>` de `@/components/ui/Select` o HTML native `<select>` SOLO si Select de Ecme no soporta el caso
- Tabs → `<Tabs>` de `@/components/ui/Tabs`
- Cards → `<Card>` de `@/components/ui/Card`
- Toggles → `<Switcher>` de `@/components/ui/Switcher`
- Menús sidebar → `<Menu>/<MenuItem>` de `@/components/ui/Menu`
- Icons → `react-icons/tb` (TbSettings, TbLock, etc.)
- Form labels → `<FormItem>` de `@/components/ui/Form`
- Tooltips → `<Tooltip>` de `@/components/ui/Tooltip`
- Tags → `<Tag>` de `@/components/ui/Tag`
- Loading → `<Loading>` de `@/components/shared/Loading`
- Layout → `<AdaptiveCard>` de `@/components/shared/AdaptiveCard`
- Drawer → `<ToggleDrawer>` de `@/components/shared/ToggleDrawer`

**Templates de referencia**: `RWS-CRM/demo/src/views/concepts/accounts/Settings/`
