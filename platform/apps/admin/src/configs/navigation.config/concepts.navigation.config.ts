import {
    CONCEPTS_PREFIX_PATH,
    DASHBOARDS_PREFIX_PATH,
} from '@/constants/route.constant'
import {
    NAV_ITEM_TYPE_TITLE,
    NAV_ITEM_TYPE_ITEM,
} from '@/constants/navigation.constant'
import { ADMIN, USER } from '@/constants/roles.constant'
import type { NavigationTree } from '@/@types/navigation'

const auth = [ADMIN, USER]

/** Helper para declarar un ítem de menú sin repetir boilerplate. */
const item = (
    key: string,
    path: string,
    title: string,
    icon: string,
): NavigationTree => ({
    key,
    path,
    title,
    translateKey: '',
    icon,
    type: NAV_ITEM_TYPE_ITEM,
    authority: auth,
    meta: {},
    subMenu: [],
})

/** Helper para una sección (título de grupo) con sus ítems. */
const section = (key: string, title: string, subMenu: NavigationTree[]): NavigationTree => ({
    key,
    path: '',
    title,
    translateKey: '',
    icon: '',
    type: NAV_ITEM_TYPE_TITLE,
    authority: auth,
    meta: {},
    subMenu,
})

/**
 * Navegación del comercio agrupada por dominio.
 * Secciones: General · Catálogo · Ventas · Contenido · Tienda.
 */
const conceptsNavigationConfig: NavigationTree[] = [
    section('shop.general', 'General', [
        item('shop.dashboard', `${DASHBOARDS_PREFIX_PATH}/overview`, 'Panel', 'dashboardAnalytic'),
    ]),
    section('shop.catalog', 'Catálogo', [
        item('shop.products', `${CONCEPTS_PREFIX_PATH}/products/product-list`, 'Productos', 'products'),
        item('shop.variants', `${CONCEPTS_PREFIX_PATH}/variants`, 'Variantes', 'cmVariants'),
        item('shop.attributes', `${CONCEPTS_PREFIX_PATH}/attributes`, 'Atributos', 'cmAttributes'),
        item('shop.inventory', `${CONCEPTS_PREFIX_PATH}/inventory`, 'Inventario', 'cmInventory'),
        item('shop.branches', `${CONCEPTS_PREFIX_PATH}/branches`, 'Sucursales', 'cmBranches'),
    ]),
    section('shop.sales', 'Ventas', [
        item('shop.orders', `${CONCEPTS_PREFIX_PATH}/orders/order-list`, 'Pedidos', 'orders'),
        item('shop.customers', `${CONCEPTS_PREFIX_PATH}/customers/customer-list`, 'Clientes', 'customers'),
        item('shop.payments', `${CONCEPTS_PREFIX_PATH}/payments`, 'Pagos', 'cmPayments'),
        item('shop.shipping', `${CONCEPTS_PREFIX_PATH}/shipping`, 'Envíos', 'cmShipping'),
        item('shop.tax', `${CONCEPTS_PREFIX_PATH}/tax`, 'Impuestos', 'cmTax'),
        item('shop.coupons', `${CONCEPTS_PREFIX_PATH}/coupons`, 'Cupones', 'cmCoupons'),
        item('shop.reviews', `${CONCEPTS_PREFIX_PATH}/reviews`, 'Valoraciones', 'cmReviews'),
        item('shop.reports', `${CONCEPTS_PREFIX_PATH}/reports`, 'Reportes', 'cmReports'),
    ]),
    section('shop.content', 'Contenido', [
        item('shop.cms', `${CONCEPTS_PREFIX_PATH}/cms`, 'CMS · Páginas', 'cmPages'),
        item('shop.slides', `${CONCEPTS_PREFIX_PATH}/slides`, 'Slider y banners', 'cmSlides'),
        item('shop.media', `${CONCEPTS_PREFIX_PATH}/media`, 'Biblioteca de medios', 'cmMedia'),
    ]),
    section('shop.store', 'Tienda', [
        item('shop.storeConfig', `${CONCEPTS_PREFIX_PATH}/store-config`, 'Apariencia y marca', 'cmStore'),
        item('shop.settings', `${CONCEPTS_PREFIX_PATH}/settings`, 'Ajustes', 'cmSettings'),
    ]),
    section('shop.system', 'Sistema', [
        item('shop.users', `${CONCEPTS_PREFIX_PATH}/users`, 'Usuarios y roles', 'cmUsers'),
        item('shop.mailer', `${CONCEPTS_PREFIX_PATH}/mailer`, 'Correos', 'cmMailer'),
        item('shop.modules', `${CONCEPTS_PREFIX_PATH}/modules`, 'Módulos y plugins', 'cmModules'),
    ]),
]

export default conceptsNavigationConfig
