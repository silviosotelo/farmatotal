import { lazy } from 'react'
import { CONCEPTS_PREFIX_PATH } from '@/constants/route.constant'
import { ADMIN, USER } from '@/constants/roles.constant'
import type { Routes } from '@/@types/routes'

const conceptsRoute: Routes = [
    {
        key: 'shop.branches',
        path: `${CONCEPTS_PREFIX_PATH}/branches`,
        component: lazy(() => import('@/views/concepts/branches/Branches')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.coupons',
        path: `${CONCEPTS_PREFIX_PATH}/coupons`,
        component: lazy(() => import('@/views/concepts/coupons/Coupons')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.reviews',
        path: `${CONCEPTS_PREFIX_PATH}/reviews`,
        component: lazy(() => import('@/views/concepts/reviews/Reviews')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.reports',
        path: `${CONCEPTS_PREFIX_PATH}/reports`,
        component: lazy(() => import('@/views/concepts/reports/Reports')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.tax',
        path: `${CONCEPTS_PREFIX_PATH}/tax`,
        component: lazy(() => import('@/views/concepts/tax/Tax')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.checkout-fields',
        path: `${CONCEPTS_PREFIX_PATH}/checkout-fields`,
        component: lazy(() => import('@/views/concepts/checkout-fields/CheckoutFields')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.users',
        path: `${CONCEPTS_PREFIX_PATH}/users`,
        component: lazy(() => import('@/views/concepts/users/Users')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.attributes',
        path: `${CONCEPTS_PREFIX_PATH}/attributes`,
        component: lazy(() => import('@/views/concepts/attributes/Attributes')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.storeConfig',
        path: `${CONCEPTS_PREFIX_PATH}/store-config`,
        component: lazy(() => import('@/views/concepts/store-config/StoreConfig')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.headerFooter',
        path: `${CONCEPTS_PREFIX_PATH}/header-footer`,
        component: lazy(() => import('@/views/concepts/store-config/HeaderFooterConfig')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.variants',
        path: `${CONCEPTS_PREFIX_PATH}/variants`,
        component: lazy(() => import('@/views/concepts/variants/Variants')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.media',
        path: `${CONCEPTS_PREFIX_PATH}/media`,
        component: lazy(() => import('@/views/concepts/files/FileManager')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.inventory',
        path: `${CONCEPTS_PREFIX_PATH}/inventory`,
        component: lazy(() => import('@/views/concepts/inventory/Inventory')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.slides',
        path: `${CONCEPTS_PREFIX_PATH}/slides`,
        component: lazy(() => import('@/views/concepts/slides/Slides')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.cms',
        path: `${CONCEPTS_PREFIX_PATH}/cms`,
        component: lazy(() => import('@/views/concepts/cms/Cms')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.cms.builder',
        path: `${CONCEPTS_PREFIX_PATH}/cms/builder/:id`,
        component: lazy(() => import('@/views/concepts/cms/PageBuilder')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'gutterless',
            footer: false,
        },
    },
    {
        key: 'shop.settings',
        path: `${CONCEPTS_PREFIX_PATH}/settings`,
        component: lazy(() => import('@/views/concepts/settings/Settings')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.modules',
        path: `${CONCEPTS_PREFIX_PATH}/modules`,
        component: lazy(() => import('@/views/concepts/modules/Modules')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.mailer',
        path: `${CONCEPTS_PREFIX_PATH}/mailer`,
        component: lazy(() => import('@/views/concepts/mailer/Mailer')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.payments',
        path: `${CONCEPTS_PREFIX_PATH}/payments`,
        component: lazy(() => import('@/views/concepts/payments/Payments')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'shop.shipping',
        path: `${CONCEPTS_PREFIX_PATH}/shipping`,
        component: lazy(() => import('@/views/concepts/shipping/Shipping')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'plugin.bancard',
        path: `${CONCEPTS_PREFIX_PATH}/plugins/bancard`,
        component: lazy(() => import('@/views/concepts/plugins/bancard/Bancard')),
        authority: [ADMIN, USER],
        meta: { pageContainerType: 'contained' },
    },
    {
        key: 'plugin.personalpay',
        path: `${CONCEPTS_PREFIX_PATH}/plugins/personalpay`,
        component: lazy(() => import('@/views/concepts/plugins/personalpay/PersonalPay')),
        authority: [ADMIN, USER],
        meta: { pageContainerType: 'contained' },
    },
    {
        key: 'plugin.tigomoney',
        path: `${CONCEPTS_PREFIX_PATH}/plugins/tigomoney`,
        component: lazy(() => import('@/views/concepts/plugins/tigomoney/TigoMoney')),
        authority: [ADMIN, USER],
        meta: { pageContainerType: 'contained' },
    },
    {
        key: 'plugin.dinelco',
        path: `${CONCEPTS_PREFIX_PATH}/plugins/dinelco`,
        component: lazy(() => import('@/views/concepts/plugins/dinelco/Dinelco')),
        authority: [ADMIN, USER],
        meta: { pageContainerType: 'contained' },
    },
    {
        key: 'plugin.whatsapp',
        path: `${CONCEPTS_PREFIX_PATH}/plugins/whatsapp`,
        component: lazy(() => import('@/views/concepts/plugins/whatsapp/Whatsapp')),
        authority: [ADMIN, USER],
        meta: { pageContainerType: 'contained' },
    },
    {
        key: 'plugin.meta',
        path: `${CONCEPTS_PREFIX_PATH}/plugins/meta`,
        component: lazy(() => import('@/views/concepts/plugins/meta/Meta')),
        authority: [ADMIN, USER],
        meta: { pageContainerType: 'contained' },
    },
    {
        key: 'plugin.google',
        path: `${CONCEPTS_PREFIX_PATH}/plugins/google`,
        component: lazy(() => import('@/views/concepts/plugins/google/Google')),
        authority: [ADMIN, USER],
        meta: { pageContainerType: 'contained' },
    },
    {
        key: 'plugin.cloudflare',
        path: `${CONCEPTS_PREFIX_PATH}/plugins/cloudflare`,
        component: lazy(() => import('@/views/concepts/plugins/cloudflare/Cloudflare')),
        authority: [ADMIN, USER],
        meta: { pageContainerType: 'contained' },
    },
    {
        key: 'plugin.pagebuilder',
        path: `${CONCEPTS_PREFIX_PATH}/page-builder`,
        component: lazy(() => import('@/views/concepts/page-builder/PageBuilder')),
        authority: [ADMIN, USER],
        meta: { pageContainerType: 'gutterless', footer: false },
    },
    {
        key: 'concepts.ai.chat',
        path: `${CONCEPTS_PREFIX_PATH}/ai/chat`,
        component: lazy(() => import('@/views/concepts/ai/Chat')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'concepts.ai.image',
        path: `${CONCEPTS_PREFIX_PATH}/ai/image`,
        component: lazy(() => import('@/views/concepts/ai/Image')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
            pageBackgroundType: 'plain',
        },
    },
    {
        key: 'concepts.customers.customerList',
        path: `${CONCEPTS_PREFIX_PATH}/customers/customer-list`,
        component: lazy(
            () => import('@/views/concepts/customers/CustomerList'),
        ),
        authority: [ADMIN, USER],
    },
    {
        key: 'concepts.customers.customerEdit',
        path: `${CONCEPTS_PREFIX_PATH}/customers/customer-edit/:id`,
        component: lazy(
            () => import('@/views/concepts/customers/CustomerEdit'),
        ),
        authority: [ADMIN, USER],
        meta: {
            header: {
                title: 'Editar cliente',
                description:
                    'Gestioná datos del cliente, historial de compras y preferencias.',
                contained: true,
            },
            footer: false,
        },
    },
    {
        key: 'concepts.customers.customerCreate',
        path: `${CONCEPTS_PREFIX_PATH}/customers/customer-create`,
        component: lazy(
            () => import('@/views/concepts/customers/CustomerCreate'),
        ),
        authority: [ADMIN, USER],
        meta: {
            header: {
                title: 'Nuevo cliente',
                description:
                    'Cargá un nuevo cliente con sus datos de contacto.',
                contained: true,
            },
            footer: false,
        },
    },
    {
        key: 'concepts.customers.customerDetails',
        path: `${CONCEPTS_PREFIX_PATH}/customers/customer-details/:id`,
        component: lazy(
            () => import('@/views/concepts/customers/CustomerDetails'),
        ),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'concepts.products.productList',
        path: `${CONCEPTS_PREFIX_PATH}/products/product-list`,
        component: lazy(() => import('@/views/concepts/products/ProductList')),
        authority: [ADMIN, USER],
    },
    {
        key: 'concepts.products.productEdit',
        path: `${CONCEPTS_PREFIX_PATH}/products/product-edit/:id`,
        component: lazy(() => import('@/views/concepts/products/ProductEdit')),
        authority: [ADMIN, USER],
        meta: {
            header: {
                title: 'Editar producto',
                description:
                    'Gestioná detalles, stock y disponibilidad del producto.',
                contained: true,
            },
            footer: false,
        },
    },
    {
        key: 'concepts.products.productCreate',
        path: `${CONCEPTS_PREFIX_PATH}/products/product-create`,
        component: lazy(
            () => import('@/views/concepts/products/ProductCreate'),
        ),
        authority: [ADMIN, USER],
        meta: {
            header: {
                title: 'Nuevo producto',
                description:
                    'Agregá productos al catálogo: datos, precios, stock y disponibilidad.',
                contained: true,
            },
            footer: false,
        },
    },
    {
        key: 'concepts.projects.scrumBoard',
        path: `${CONCEPTS_PREFIX_PATH}/projects/scrum-board`,
        component: lazy(() => import('@/views/concepts/projects/ScrumBoard')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'concepts.projects.projectList',
        path: `${CONCEPTS_PREFIX_PATH}/projects/project-list`,
        component: lazy(() => import('@/views/concepts/projects/ProjectList')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
            pageBackgroundType: 'plain',
        },
    },
    {
        key: 'concepts.projects.projectDetails',
        path: `${CONCEPTS_PREFIX_PATH}/projects/project-details/:id`,
        component: lazy(
            () => import('@/views/concepts/projects/ProjectDetails'),
        ),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
            pageBackgroundType: 'plain',
        },
    },
    {
        key: 'concepts.projects.projectTasks',
        path: `${CONCEPTS_PREFIX_PATH}/projects/tasks`,
        component: lazy(() => import('@/views/concepts/projects/Tasks')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'concepts.projects.projectIssue',
        path: `${CONCEPTS_PREFIX_PATH}/projects/tasks/:id`,
        component: lazy(() => import('@/views/concepts/projects/Issue')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'concepts.orders.orderList',
        path: `${CONCEPTS_PREFIX_PATH}/orders/order-list`,
        component: lazy(() => import('@/views/concepts/orders/OrderList')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'concepts.orders.orderEdit',
        path: `${CONCEPTS_PREFIX_PATH}/orders/order-edit/:id`,
        component: lazy(() => import('@/views/concepts/orders/OrderEdit')),
        authority: [ADMIN, USER],
        meta: {
            header: {
                title: 'Editar pedido',
                contained: true,
                description: 'Gestioná y seguí los pedidos.',
            },
            footer: false,
        },
    },
    {
        key: 'concepts.orders.orderCreate',
        path: `${CONCEPTS_PREFIX_PATH}/orders/order-create`,
        component: lazy(() => import('@/views/concepts/orders/OrderCreate')),
        authority: [ADMIN, USER],
        meta: {
            header: {
                title: 'Nuevo pedido',
                contained: true,
                description:
                    'Creá un pedido manualmente.',
            },
            footer: false,
        },
    },
    {
        key: 'concepts.orders.orderDetails',
        path: `${CONCEPTS_PREFIX_PATH}/orders/order-details/:id`,
        component: lazy(
            () => import('@/views/concepts/orders/OrderDetailSimple'),
        ),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'concepts.account.settings',
        path: `${CONCEPTS_PREFIX_PATH}/account/settings`,
        component: lazy(() => import('@/views/concepts/accounts/Settings')),
        authority: [ADMIN, USER],
        meta: {
            header: {
                title: 'Settings',
            },
            pageContainerType: 'contained',
        },
    },
    {
        key: 'concepts.account.activityLog',
        path: `${CONCEPTS_PREFIX_PATH}/account/activity-log`,
        component: lazy(() => import('@/views/concepts/accounts/ActivityLog')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'concepts.account.rolesPermissions',
        path: `${CONCEPTS_PREFIX_PATH}/account/roles-permissions`,
        component: lazy(
            () => import('@/views/concepts/accounts/RolesPermissions'),
        ),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
            pageBackgroundType: 'plain',
        },
    },
    {
        key: 'concepts.account.pricing',
        path: `${CONCEPTS_PREFIX_PATH}/account/pricing`,
        component: lazy(() => import('@/views/concepts/accounts/Pricing')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'concepts.helpCenter.supportHub',
        path: `${CONCEPTS_PREFIX_PATH}/help-center/support-hub`,
        component: lazy(
            () => import('@/views/concepts/help-center/SupportHub'),
        ),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'gutterless',
            pageBackgroundType: 'plain',
        },
    },
    {
        key: 'concepts.helpCenter.article',
        path: `${CONCEPTS_PREFIX_PATH}/help-center/article/:id`,
        component: lazy(() => import('@/views/concepts/help-center/Article')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
            pageBackgroundType: 'plain',
        },
    },
    {
        key: 'concepts.helpCenter.editArticle',
        path: `${CONCEPTS_PREFIX_PATH}/help-center/edit-article/:id`,
        component: lazy(
            () => import('@/views/concepts/help-center/EditArticle'),
        ),
        authority: [ADMIN, USER],
        meta: {
            pageBackgroundType: 'plain',
            footer: false,
        },
    },
    {
        key: 'concepts.helpCenter.manageArticle',
        path: `${CONCEPTS_PREFIX_PATH}/help-center/manage-article`,
        component: lazy(
            () => import('@/views/concepts/help-center/ManageArticle'),
        ),
        authority: [ADMIN, USER],
        meta: {
            pageBackgroundType: 'plain',
            footer: false,
        },
    },
    {
        key: 'concepts.calendar',
        path: `${CONCEPTS_PREFIX_PATH}/calendar`,
        component: lazy(() => import('@/views/concepts/calendar/Calendar')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
            pageBackgroundType: 'plain',
        },
    },
    {
        key: 'concepts.fileManager',
        path: `${CONCEPTS_PREFIX_PATH}/file-manager`,
        component: lazy(() => import('@/views/concepts/files/FileManager')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
            pageBackgroundType: 'plain',
        },
    },
    {
        key: 'concepts.mail',
        path: `${CONCEPTS_PREFIX_PATH}/mail`,
        component: lazy(() => import('@/views/concepts/mail/Mail')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
    {
        key: 'concepts.chat',
        path: `${CONCEPTS_PREFIX_PATH}/chat`,
        component: lazy(() => import('@/views/concepts/chat/Chat')),
        authority: [ADMIN, USER],
        meta: {
            pageContainerType: 'contained',
        },
    },
]

export default conceptsRoute
