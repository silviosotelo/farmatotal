import EntityFieldsEditor from './EntityFieldsEditor'
import { DEFAULT_PRODUCT_FIELDS } from '@/services/EntityFieldsService'

const ProductFields = () => (
    <EntityFieldsEditor
        settingsKey="mod_product_fields"
        title="Campos de producto"
        description="Configurá qué campos (nativos y personalizados) tiene la ficha de producto. Los nativos solo se activan/desactivan; podés agregar campos propios por rubro (ej. principio activo, registro sanitario)."
        defaultFields={DEFAULT_PRODUCT_FIELDS}
    />
)

export default ProductFields
