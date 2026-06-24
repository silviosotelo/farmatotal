import EntityFieldsEditor from './EntityFieldsEditor'
import { DEFAULT_BRANCH_FIELDS } from '@/services/EntityFieldsService'

const BranchFields = () => (
    <EntityFieldsEditor
        settingsKey="mod_branch_fields"
        title="Campos de sucursal"
        description="Configurá los campos (nativos y personalizados) de las sucursales. Agregá campos propios (ej. WhatsApp, tiene farmacéutico, horario especial)."
        defaultFields={DEFAULT_BRANCH_FIELDS}
    />
)

export default BranchFields
