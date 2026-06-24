import { useParams } from 'react-router'
import PluginConfig from './PluginConfig'

const PluginConfigPage = () => {
    const { pluginKey } = useParams<{ pluginKey: string }>()
    return <PluginConfig pluginKey={pluginKey!} />
}

export default PluginConfigPage
