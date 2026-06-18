import conceptsNavigationConfig from './concepts.navigation.config'
import type { NavigationTree } from '@/@types/navigation'

// Nav limpio = Dashboard + módulos de comercio (concepts).
const navigationConfig: NavigationTree[] = [...conceptsNavigationConfig]

export default navigationConfig
