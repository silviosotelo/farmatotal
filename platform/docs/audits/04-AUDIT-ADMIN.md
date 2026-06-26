# Auditoría del Admin — 25 Módulos Completos

**Fecha:** 26 de junio de 2026

## Estado: TODO IMPLEMENTADO ✅

No hay stubs ni placeholders. Cada módulo tiene UI real con llamadas a la API.

### Catálogo
| Módulo | CRUD | API Service | Form | Tabla |
|---|---|---|---|---|
| Productos | List/Create/Edit/Delete | ProductService.ts | ✅ Zod + useFieldArray | ✅ DataTable |
| Categorías | List/Create/Edit | CategoryService.ts | ✅ Inline form | ✅ Table |
| Atributos | Get/Save | AttributeService.ts | ✅ Inline editor | — |
| Variantes | CRUD + cartesiano | VariantService.ts | ✅ Bulk apply | ✅ Table |
| Entity Fields | Get/Save | EntityFieldsService.ts | ✅ Field editor | — |

### Inventario
| Módulo | CRUD | Notas |
|---|---|---|
| Inventario | Search → per-branch stock | ✅ CSV import/export |

### Sucursales
| Módulo | CRUD | Notas |
|---|---|---|
| Branches | List/Create/Edit/Toggle | ✅ Card-based, erpCode |

### Ventas
| Módulo | CRUD | API Service |
|---|---|---|
| Pedidos | List/Create/Edit/Status/Refund | OrderService.ts |
| Clientes | List/Create/Edit/Details/Delete | CustomersService.ts |
| Pagos | Methods CRUD + Transactions list | PaymentService.ts |
| Envío | Config zones/methods | ShippingService.ts |
| Impuestos | Config rates | TaxService.ts |
| Cupones | List/Create (sin edit/delete UI) | CouponService.ts |
| Reseñas | List/Moderate/Delete | ReviewService.ts |
| Reportes | Date range + KPIs + charts | ReportService.ts |
| Checkout Fields | Full field editor | CheckoutFieldsService.ts |

### Contenido
| Módulo | CRUD | Notas |
|---|---|---|
| CMS Pages | List/Create/Edit/Delete/Publish | CmsService.ts |
| Page Builder | ChaiBuilder SDK | ✅ 20+ bloques |
| Slides | CRUD | SlideService.ts |
| Media | Grid/List/Upload/Delete | FileService.ts |

### Config
| Módulo | CRUD | Notas |
|---|---|---|
| Store Config | Brand/Theme/Colors | Via CMS settings |
| Header/Footer | Top nav + footer columns | Via CMS settings |
| Settings | Store name/email/phone | Via CMS settings |

### Sistema
| Módulo | CRUD | Notas |
|---|---|---|
| Usuarios | List/Create/Edit/Delete | UserService.ts |
| Mailer | Templates + Queue + Logs + Config | MailerService.ts |
| Módulos | List/Toggle | ModuleService.ts |

### Plugins (11)
| Plugin | UI | Notas |
|---|---|---|
| Bancard | PluginConfig + 4 tabs | ✅ Config-driven |
| PersonalPay | PluginConfig wrapper | ✅ |
| TigoMoney | PluginConfig wrapper | ✅ |
| Dinelco | PluginConfig wrapper | ✅ |
| Meta | PluginConfig wrapper | ✅ |
| Google | PluginConfig wrapper | ✅ |
| Cloudflare | PluginConfig wrapper | ✅ |
| ScanSearch | PluginConfig wrapper | ✅ |
| WhatsApp | Custom 4 tabs | ✅ Templates + Workflows + Logs |
| ERP Sync | Custom | ✅ Import + Mapping + History |
| Multi-Inventory | Custom 12 views | ✅ Full sidebar nav |
