import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import * as argon2 from "argon2";

const adapter = new PrismaLibSql({
  url: "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ── Categories ──────────────────────────────────────────────
  const categories = [
    { slug: "bazar-y-hogar", name: "Bazar y Hogar", position: 1 },
    { slug: "belleza", name: "Belleza", icon: "/categories/belleza.svg", position: 2 },
    { slug: "fragancias", name: "Fragancias", icon: "/categories/fragancias.svg", position: 3 },
    { slug: "higiene-personal", name: "Higiene Personal", icon: "/categories/higiene-personal.svg", position: 4 },
    { slug: "infantiles", name: "Infantiles", position: 5 },
    { slug: "mamas-y-bebes", name: "Mamás y Bebés", icon: "/categories/mamas-y-bebes.svg", position: 6 },
    { slug: "medicamentos", name: "Medicamentos", icon: "/categories/medicamentos.svg", position: 7 },
    { slug: "nutricion-y-deporte", name: "Nutrición y Deporte", icon: "/categories/nutricion-y-deporte.svg", position: 8 },
    { slug: "ofertas", name: "Ofertas", position: 9 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }
  console.log(`  ✅ ${categories.length} categories`);

  // ── Products ────────────────────────────────────────────────
  const catMap = Object.fromEntries(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id])
  );

  const products: Array<{
    sku: string; slug: string; title: string; category: string;
    priceNormal: number; priceWeb: number; brand: string; stock: number;
    image: string; featured?: boolean; controlled?: boolean;
  }> = [
    { sku: "7796285290207", slug: "hepatalgina-9-hierbas-fco-x-50-ml", title: "Hepatalgina 9 Hierbas Fco X 50 Ml", category: "medicamentos", priceNormal: 68000, priceWeb: 57100, brand: "Hepatalgina", stock: 24, image: "/products/hepatalgina.jpg", featured: true },
    { sku: "7790000000001", slug: "paracetamol-500-mg-x-10-comp", title: "Paracetamol 500 Mg X 10 Comprimidos", category: "medicamentos", priceNormal: 9000, priceWeb: 7200, brand: "Genérico", stock: 120, image: "/products/no-img.webp" },
    { sku: "7790000000002", slug: "ibuprofeno-400-mg-x-10-comp", title: "Ibuprofeno 400 Mg X 10 Comprimidos", category: "medicamentos", priceNormal: 15000, priceWeb: 11900, brand: "Genérico", stock: 90, image: "/products/no-img.webp" },
    { sku: "7790000000003", slug: "amoxicilina-500-mg-x-21-caps", title: "Amoxicilina 500 Mg X 21 Cápsulas", category: "medicamentos", priceNormal: 42000, priceWeb: 35900, brand: "Genérico", stock: 40, image: "/products/no-img.webp", controlled: true },
    { sku: "7790000000004", slug: "loratadina-10-mg-x-10-comp", title: "Loratadina 10 Mg X 10 Comprimidos", category: "medicamentos", priceNormal: 18000, priceWeb: 14500, brand: "Genérico", stock: 0, image: "/products/no-img.webp" },
    { sku: "7790000000005", slug: "sales-de-rehidratacion-x-1", title: "Sales de Rehidratación Oral X 1", category: "medicamentos", priceNormal: 7500, priceWeb: 6300, brand: "Genérico", stock: 200, image: "/products/no-img.webp" },
    { sku: "7790000000006", slug: "base-liquida-matte-30-ml", title: "Base Líquida Matte Fco X 30 Ml", category: "belleza", priceNormal: 95000, priceWeb: 79900, brand: "L'Oréal", stock: 30, image: "/products/no-img.webp", featured: true },
    { sku: "7790000000007", slug: "labial-mate-larga-duracion", title: "Labial Mate Larga Duración", category: "belleza", priceNormal: 55000, priceWeb: 44900, brand: "Maybelline", stock: 60, image: "/products/no-img.webp" },
    { sku: "7790000000008", slug: "mascara-de-pestanas-volumen", title: "Máscara de Pestañas Volumen", category: "belleza", priceNormal: 62000, priceWeb: 49900, brand: "Maybelline", stock: 45, image: "/products/no-img.webp" },
    { sku: "7790000000009", slug: "crema-facial-hidratante-50-ml", title: "Crema Facial Hidratante Fco X 50 Ml", category: "belleza", priceNormal: 120000, priceWeb: 99900, brand: "Nivea", stock: 25, image: "/products/no-img.webp" },
    { sku: "7790000000010", slug: "esmalte-de-unas-color", title: "Esmalte de Uñas Color X 1", category: "belleza", priceNormal: 22000, priceWeb: 17900, brand: "Revlon", stock: 80, image: "/products/no-img.webp" },
    { sku: "7790000000011", slug: "perfume-floral-edp-100-ml", title: "Perfume Floral EDP Fco X 100 Ml", category: "fragancias", priceNormal: 350000, priceWeb: 289900, brand: "Carolina H.", stock: 12, image: "/products/no-img.webp", featured: true },
    { sku: "7790000000012", slug: "perfume-amaderado-edt-90-ml", title: "Perfume Amaderado EDT Fco X 90 Ml", category: "fragancias", priceNormal: 420000, priceWeb: 359900, brand: "Hugo Boss", stock: 8, image: "/products/no-img.webp" },
    { sku: "7790000000013", slug: "body-splash-frutal-250-ml", title: "Body Splash Frutal Fco X 250 Ml", category: "fragancias", priceNormal: 48000, priceWeb: 38900, brand: "Natura", stock: 50, image: "/products/no-img.webp" },
    { sku: "7790000000014", slug: "desodorante-perfume-150-ml", title: "Desodorante Perfume Fco X 150 Ml", category: "fragancias", priceNormal: 35000, priceWeb: 28900, brand: "Rexona", stock: 70, image: "/products/no-img.webp" },
    { sku: "7796285289324", slug: "evagina-jabon-liquido-fco-x-200-ml", title: "Evagina Jabon Liquido Fco X 200 Ml", category: "higiene-personal", priceNormal: 55900, priceWeb: 47000, brand: "Evagina", stock: 33, image: "/products/evagina.jpg", featured: true },
    { sku: "7790000000015", slug: "shampoo-anticaspa-400-ml", title: "Shampoo Anticaspa Fco X 400 Ml", category: "higiene-personal", priceNormal: 42000, priceWeb: 33900, brand: "Head&Shoulders", stock: 55, image: "/products/no-img.webp" },
    { sku: "7790000000016", slug: "pasta-dental-blanqueadora-90-g", title: "Pasta Dental Blanqueadora X 90 G", category: "higiene-personal", priceNormal: 18000, priceWeb: 14900, brand: "Colgate", stock: 140, image: "/products/no-img.webp" },
    { sku: "7790000000017", slug: "jabon-de-tocador-pack-x-3", title: "Jabón de Tocador Pack X 3", category: "higiene-personal", priceNormal: 21000, priceWeb: 16900, brand: "Dove", stock: 110, image: "/products/no-img.webp" },
    { sku: "7790000000018", slug: "enjuague-bucal-500-ml", title: "Enjuague Bucal Fco X 500 Ml", category: "higiene-personal", priceNormal: 38000, priceWeb: 30900, brand: "Listerine", stock: 0, image: "/products/no-img.webp" },
    { sku: "7790000000019", slug: "cepillo-dental-suave", title: "Cepillo Dental Suave X 1", category: "higiene-personal", priceNormal: 12000, priceWeb: 9500, brand: "Oral-B", stock: 200, image: "/products/no-img.webp" },
    { sku: "7790000000020", slug: "panales-talle-g-x-40", title: "Pañales Talle G X 40 Unidades", category: "mamas-y-bebes", priceNormal: 98000, priceWeb: 84900, brand: "Pampers", stock: 40, image: "/products/no-img.webp", featured: true },
    { sku: "7790000000021", slug: "toallitas-humedas-x-100", title: "Toallitas Húmedas X 100 Unidades", category: "mamas-y-bebes", priceNormal: 32000, priceWeb: 25900, brand: "Huggies", stock: 90, image: "/products/no-img.webp" },
    { sku: "7790000000022", slug: "shampoo-bebe-200-ml", title: "Shampoo para Bebé Fco X 200 Ml", category: "mamas-y-bebes", priceNormal: 28000, priceWeb: 22900, brand: "Johnson's", stock: 60, image: "/products/no-img.webp" },
    { sku: "7790000000023", slug: "mamadera-anticolicos-260-ml", title: "Mamadera Anticólicos X 260 Ml", category: "mamas-y-bebes", priceNormal: 45000, priceWeb: 36900, brand: "Avent", stock: 20, image: "/products/no-img.webp" },
    { sku: "7790000000024", slug: "porta-lapiz-diseno-dinosaurio-sf-363", title: "Porta Lapiz Diseño Dinosaurio Sf-363", category: "infantiles", priceNormal: 45000, priceWeb: 31500, brand: "Sanafer", stock: 15, image: "/products/no-img.webp" },
    { sku: "7790000000025", slug: "set-de-bloques-x-50", title: "Set de Bloques de Construcción X 50", category: "infantiles", priceNormal: 89000, priceWeb: 69900, brand: "Genérico", stock: 18, image: "/products/no-img.webp" },
    { sku: "7790000000026", slug: "muneca-articulada", title: "Muñeca Articulada con Accesorios", category: "infantiles", priceNormal: 110000, priceWeb: 89900, brand: "Genérico", stock: 10, image: "/products/no-img.webp" },
    { sku: "7790000000027", slug: "rompecabezas-100-piezas", title: "Rompecabezas 100 Piezas", category: "infantiles", priceNormal: 35000, priceWeb: 27900, brand: "Genérico", stock: 35, image: "/products/no-img.webp" },
    { sku: "6973048313101", slug: "organizador-diseno-tren-sf-310", title: "Caja Organizadora Con Diseño De Tren", category: "bazar-y-hogar", priceNormal: 142700, priceWeb: 99900, brand: "Sanfer", stock: 22, image: "/products/organizador-tren.png", featured: true },
    { sku: "7790000000028", slug: "botiquin-de-plastico-grande-sf-782", title: "Botiquín de plástico vacío con diseño", category: "bazar-y-hogar", priceNormal: 99900, priceWeb: 69900, brand: "Sanfer", stock: 14, image: "/products/botiquin.png" },
    { sku: "7790000000029", slug: "set-de-vasos-x-6", title: "Set de Vasos de Vidrio X 6", category: "bazar-y-hogar", priceNormal: 65000, priceWeb: 52900, brand: "Genérico", stock: 40, image: "/products/no-img.webp" },
    { sku: "7790000000030", slug: "tabla-de-cortar-bambu", title: "Tabla de Cortar de Bambú", category: "bazar-y-hogar", priceNormal: 48000, priceWeb: 38900, brand: "Genérico", stock: 50, image: "/products/no-img.webp" },
    { sku: "7790000000031", slug: "organizador-de-cocina", title: "Organizador de Cocina Multiuso", category: "bazar-y-hogar", priceNormal: 75000, priceWeb: 59900, brand: "Genérico", stock: 0, image: "/products/no-img.webp" },
    { sku: "7790000000032", slug: "proteina-whey-1-kg", title: "Proteína Whey Pote X 1 Kg", category: "nutricion-y-deporte", priceNormal: 320000, priceWeb: 269900, brand: "ENA", stock: 16, image: "/products/no-img.webp", featured: true },
    { sku: "7790000000033", slug: "creatina-monohidrato-300-g", title: "Creatina Monohidrato X 300 G", category: "nutricion-y-deporte", priceNormal: 180000, priceWeb: 149900, brand: "Star Nutrition", stock: 24, image: "/products/no-img.webp" },
    { sku: "7790000000034", slug: "multivitaminico-x-60-caps", title: "Multivitamínico X 60 Cápsulas", category: "nutricion-y-deporte", priceNormal: 95000, priceWeb: 76900, brand: "Centrum", stock: 60, image: "/products/no-img.webp" },
    { sku: "7790000000035", slug: "barra-de-proteina-x-1", title: "Barra de Proteína X 1", category: "nutricion-y-deporte", priceNormal: 15000, priceWeb: 11900, brand: "ENA", stock: 150, image: "/products/no-img.webp" },
    { sku: "7790000000036", slug: "shaker-600-ml", title: "Vaso Shaker X 600 Ml", category: "nutricion-y-deporte", priceNormal: 38000, priceWeb: 29900, brand: "Genérico", stock: 80, image: "/products/no-img.webp" },
  ];

  for (const p of products) {
    const onPromo = p.priceWeb < p.priceNormal;
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        title: p.title,
        priceNormal: p.priceNormal,
        priceWeb: p.priceWeb,
        onPromo,
        brand: p.brand,
        stock: p.stock,
        featured: p.featured ?? false,
        controlled: p.controlled ?? false,
        categoryId: catMap[p.category],
      },
      create: {
        sku: p.sku,
        slug: p.slug,
        title: p.title,
        priceNormal: p.priceNormal,
        priceWeb: p.priceWeb,
        onPromo,
        brand: p.brand,
        stock: p.stock,
        featured: p.featured ?? false,
        controlled: p.controlled ?? false,
        categoryId: catMap[p.category],
        description: `${p.title}. Producto disponible en Farmatotal. Presentación original, controlada y con garantía de calidad.`,
        images: {
          create: [{ url: p.image, position: 0 }],
        },
      },
    });
  }
  console.log(`  ✅ ${products.length} products`);

  // ── Branches ────────────────────────────────────────────────
  const branches = [
    { erpId: "medicos-chaco", name: "Médicos del Chaco", address: "Av. Médicos del Chaco c/ Oscar Carreras Saguier", city: "Asunción", zone: "Asunción", lat: -25.298599, lng: -57.412433 },
    { erpId: "chiang-kai-shek", name: "Chiang Kai Shek", address: "Avda. Chiang Kai Shek y 16 proyectadas", city: "Asunción", zone: "Asunción", lat: -25.2928605, lng: -57.5601898 },
    { erpId: "choferes-chaco", name: "Choferes del Chaco", address: "Avda. Choferes del Chaco c/ Indiana Juliana", city: "Asunción", zone: "Asunción", lat: -25.2992783, lng: -57.5936368 },
    { erpId: "de-la-victoria", name: "De la Victoria", address: "Avda. de la Victoria esq. Araucanos", city: "Asunción", zone: "Asunción", lat: -25.3133524, lng: -57.5977235 },
    { erpId: "republica-argentina", name: "República Argentina", address: "Avda. República Argentina Nº 2670 c/ Concepción", city: "Asunción", zone: "Asunción", lat: -25.3194049, lng: -57.5923647 },
    { erpId: "eusebio-lillo", name: "Eusebio Lillo", address: "Eusebio Lillo c/ Denis Roa", city: "Asunción", zone: "Asunción", lat: -25.3261318, lng: -57.5826583 },
    { erpId: "loma-pyta", name: "Loma Pytâ", address: "Ruta Transchaco esq. Cnel Juan Porta O'Higgins", city: "Asunción", zone: "Asunción", lat: -25.282848, lng: -57.654058 },
    { erpId: "ytororo", name: "Ytororó", address: "R. I. 2 Ytororó 1098 esq. Facundo Machain", city: "Asunción", zone: "Asunción", lat: -25.3274298, lng: -57.5958535 },
    { erpId: "fdm-pitiantuta", name: "11 de Setiembre", address: "11 de Setiembre esq. Av. Pitiantuta", city: "Fernando de la Mora", zone: "Central", lat: -25.3390142, lng: -57.5569839 },
    { erpId: "fdm-estigarribia", name: "Mcal. Estigarribia", address: "Av. Mcal. José Félix Estigarribia c/ Soldado Ovelar", city: "Fernando de la Mora", zone: "Central", lat: -25.3219561, lng: -57.5573130 },
    { erpId: "fdm-acceso-sur", name: "Acceso Sur", address: "Avda. Acceso Sur casi Francisco Vergara", city: "Fernando de la Mora", zone: "Central", lat: -25.3549714, lng: -57.5939959 },
    { erpId: "lambare-defensores", name: "Defensores del Chaco", address: "Av. Defensores del Chaco c/ 8 de Marzo", city: "Lambaré", zone: "Central", lat: -25.3439161, lng: -57.5809814 },
    { erpId: "lambare-cacique", name: "Cacique Lambaré", address: "Avda. Cacique Lambaré c/ Santa Ana", city: "Lambaré", zone: "Central", lat: -25.3309506, lng: -57.5741499 },
    { erpId: "lambare-cerro", name: "Cerro Lambaré", address: "Avda. Cerro Lambaré c/ Herminio Giménez", city: "Lambaré", zone: "Central", lat: -25.3287956, lng: -57.5303194 },
    { erpId: "capiata-ruta1", name: "Capiatá Ruta 1", address: "Ruta 1 Km 17,5 c/ Juana María de Lara", city: "Central", zone: "Central", lat: -25.3703508, lng: -57.4796948 },
    { erpId: "limpio-aquino", name: "Limpio", address: "Ruta 3 Gral. Elizardo Aquino esq. Monseñor Moreno", city: "Central", zone: "Central", lat: -25.1693, lng: -57.4912 },
    { erpId: "luque-residentas", name: "Luque Residentas", address: "Av. Las Residentas c/ Los Excombatientes", city: "Central", zone: "Central", lat: -25.2667, lng: -57.4872 },
    { erpId: "aregua-residentas", name: "Areguá", address: "Avda. Las Residentas", city: "Cordillera", zone: "Cordillera", lat: -25.3052, lng: -57.4031 },
  ];

  for (const b of branches) {
    await prisma.branch.upsert({
      where: { erpId: b.erpId },
      update: b,
      create: b,
    });
  }
  console.log(`  ✅ ${branches.length} branches`);

  // ── Inventory (assign stock to first 3 branches for each product) ──
  const allProducts = await prisma.product.findMany();
  const allBranches = await prisma.branch.findMany({ take: 3 });
  let invCount = 0;
  for (const p of allProducts) {
    if (p.stock === 0) continue;
    for (const b of allBranches) {
      const qty = Math.floor(p.stock / allBranches.length) + (Math.random() > 0.5 ? 1 : 0);
      if (qty > 0) {
        await prisma.inventory.upsert({
          where: { productId_branchId: { productId: p.id, branchId: b.id } },
          update: { quantity: qty },
          create: { productId: p.id, branchId: b.id, quantity: qty },
        });
        invCount++;
      }
    }
  }
  console.log(`  ✅ ${invCount} inventory records`);

  // ── Coupons ─────────────────────────────────────────────────
  const coupons = [
    { code: "FARMA10", type: "PERCENT", value: 10, description: "10% de descuento" },
    { code: "SUPERROMBO", type: "PERCENT", value: 15, description: "15% Súper Rombo" },
    { code: "BIENVENIDA", type: "PERCENT", value: 5, description: "5% primera compra" },
  ];
  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    });
  }
  console.log(`  ✅ ${coupons.length} coupons`);

  // ── Admin user ──────────────────────────────────────────────
  const adminHash = await argon2.hash("admin123");
  await prisma.user.upsert({
    where: { email: "admin@farmatotal.com.py" },
    update: {},
    create: {
      email: "admin@farmatotal.com.py",
      passwordHash: adminHash,
      firstName: "Admin",
      lastName: "Farmatotal",
      role: "ADMIN",
      phone: "0981 000 000",
    },
  });

  const staffHash = await argon2.hash("staff123");
  await prisma.user.upsert({
    where: { email: "staff@farmatotal.com.py" },
    update: {},
    create: {
      email: "staff@farmatotal.com.py",
      passwordHash: staffHash,
      firstName: "Staff",
      lastName: "Farmatotal",
      role: "STAFF",
    },
  });

  const customerHash = await argon2.hash("cliente123");
  const customer = await prisma.user.upsert({
    where: { email: "cliente@farmatotal.com.py" },
    update: {},
    create: {
      email: "cliente@farmatotal.com.py",
      passwordHash: customerHash,
      firstName: "Cliente",
      lastName: "Demo",
      role: "CUSTOMER",
      phone: "0981 123 456",
    },
  });

  // Customer address
  for (const addr of [
    { userId: customer.id, label: "Casa", line1: "Avda. Mcal. López 1234", city: "Asunción", phone: "0981 123 456", isDefault: true },
    { userId: customer.id, label: "Trabajo", line1: "Acceso Sur 425", city: "Fernando de la Mora", phone: "0981 123 456" },
  ]) {
    await prisma.address.create({ data: addr });
  }
  console.log("  ✅ Users (admin/staff/customer) + addresses");

  // ── Site Settings ───────────────────────────────────────────
  const settings = [
    {
      key: "hero_slides",
      value: JSON.stringify([
        { id: "pedidos-ya", image: "/slider/pedidos-ya.png", alt: "Pedidos Ya", href: "#" },
        { id: "fpj", image: "/slider/banner-fpj.png", alt: "¡Hoy Lunes! 30% DTO con Farmatotal Pi Financiera", href: "#" },
        { id: "familiar", image: "/slider/banner-familiar.png", alt: "Plan Familiar", href: "#" },
        { id: "todos-los-dias", image: "/slider/banner-todos-los-dias.png", alt: "Ofertas todos los días", href: "#" },
      ]),
    },
    {
      key: "promo_banners",
      value: JSON.stringify([
        { image: "/banners/todos-los-dias-70.png", href: "/catalogo/?descuento=70", alt: "Todos los días descuentos hasta un 70%" },
        { image: "/banners/super-rombo-50.png", href: "/catalogo/?descuento=50", alt: "Súper Rombo hasta 50% de descuento" },
      ]),
    },
    {
      key: "footer",
      value: JSON.stringify({
        social: { facebook: "#", instagram: "#", twitter: "#" },
        copyright: "© 2026 Farmatotal. Todos los derechos reservados.",
      }),
    },
    {
      key: "contact",
      value: JSON.stringify({
        phone: "+595 21 123 456",
        email: "info@farmatotal.com.py",
        address: "Asunción, Paraguay",
      }),
    },
  ];
  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log("  ✅ Site settings");

  // ── Sample Reviews ──────────────────────────────────────────
  const hepatalgina = await prisma.product.findUnique({ where: { sku: "7796285290207" } });
  if (hepatalgina) {
    const reviews = [
      { author: "María G.", rating: 5, body: "Excelente producto, llegó rápido y bien embalado.", approved: true },
      { author: "Jorge R.", rating: 4, body: "Buena relación precio/calidad. Lo recomiendo.", approved: true },
      { author: "Lucía B.", rating: 5, body: "Tal cual la descripción, muy conforme con la compra.", approved: true },
    ];
    for (const r of reviews) {
      await prisma.review.create({
        data: { ...r, productId: hepatalgina.id, userId: customer.id },
      });
    }
    console.log("  ✅ Sample reviews");
  }

  // ── Page Builder: home page ─────────────────────────────────
  await prisma.page.upsert({
    where: { slug: "home" },
    update: {},
    create: {
      slug: "home",
      title: "Inicio",
      status: "PUBLISHED",
      blocks: JSON.stringify([
        { id: "hero-1", type: "HERO_SLIDER", props: { settingKey: "hero_slides" } },
        { id: "cats-1", type: "CATEGORY_GRID", props: { categories: "auto", columns: 6 } },
        { id: "deals-1", type: "PRODUCT_DEALS", props: { title: "Súper Rombo", query: { tag: "deals" }, limit: 8, countdownTo: null } },
        { id: "banner-1", type: "SHOP_BANNER", props: { settingKey: "promo_banners", index: 0 } },
        { id: "featured-1", type: "PRODUCT_CAROUSEL", props: { title: "Selección para Vos", query: { featured: true }, limit: 8 } },
        { id: "banner-2", type: "SHOP_BANNER", props: { settingKey: "promo_banners", index: 1 } },
      ]),
    },
  });
  console.log("  ✅ Page: home");

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
