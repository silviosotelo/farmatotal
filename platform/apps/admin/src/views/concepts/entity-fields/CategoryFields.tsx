import EntityFieldsEditor from './EntityFieldsEditor'
import { DEFAULT_CATEGORY_FIELDS } from '@/services/EntityFieldsService'

const CategoryFields = () => (
    <EntityFieldsEditor
        settingsKey="mod_category_fields"
        title="Campos de categoría"
        description="Configurá los campos (nativos y personalizados) de las categorías. Agregá campos propios (ej. destacada en home, color)."
        defaultFields={DEFAULT_CATEGORY_FIELDS}
    />
)

export default CategoryFields
