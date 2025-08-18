import type { Database } from '../types';
import { subscriptionPlans, type SubscriptionPlanInsert } from '../schemas';
import { eq } from 'drizzle-orm';
import { FREE_PLAN_ID, UNILIMITED } from 'src/lib/constants';

const subscriptionPlansSeed: SubscriptionPlanInsert[] = [
  {
    id: 1,
    planId: FREE_PLAN_ID,
    title: 'Zecond Free',
    features: [
      {
        heading: 'Publica hasta 5 prendas al mes',
        para: 'Selección limitada pero suficiente para empezar a generar ventas.',
      },
      {
        heading: 'Almacenamiento seguro',
        para: 'Guardamos tus prendas en nuestro centro logístico.',
      },
      {
        heading: 'Envíos directos al comprador',
        para: 'Tú no te preocupas por logística, nosotros lo entregamos por ti.',
      },
      {
        heading: 'Fotos carrusel profesionales',
        para: 'Cada prenda tendrá varias fotos atractivas que vendan.',
      },
      {
        heading: 'Destaque en redes sociales',
        para: 'Tu closet podrá salir en los contenidos oficiales de (Instagram, TikTok, Reels).',
      },
    ],
    price: 0,
    listingsLimit: 5,
    auctionsAllowed: false,
    featuredProductsAllowed: false,
    premiumProductsAllowed: false,
    auctionCommissionPercentage: 20,
    stripePriceId: 'price_1RaxEqPpCk8Hzz56QMIFsS60',
  },
  {
    id: 2,
    planId: 'zecond-black',
    title: 'Zecond Black',
    features: [
      {
        heading: 'Sube prendas ilimitadas',
        para: 'No hay límites. Vende todo lo que quieras.',
      },
      {
        heading: 'Almacenamiento seguro',
        para: 'Guardamos tus prendas en nuestro centro logístico.',
      },
      {
        heading: 'Envíos directos al comprador',
        para: 'Tú no te preocupas por logística, nosotros lo entregamos por ti.',
      },
      {
        heading: 'Fotos carrusel profesionales',
        para: 'Cada prenda tendrá varias fotos atractivas que vendan.',
      },
      {
        heading: 'Destaque en redes sociales',
        para: 'Tu closet podrá salir en los contenidos oficiales de (Instagram, TikTok, Reels).',
      },
    ],
    price: 200,
    listingsLimit: UNILIMITED,
    auctionsAllowed: false,
    featuredProductsAllowed: false,
    premiumProductsAllowed: false,
    auctionCommissionPercentage: 20,
    stripePriceId: 'price_1RaxB0PpCk8Hzz56ggaTaNqq',
  },
  {
    id: 3,
    planId: 'todo-zecond',
    title: 'Todo Zecond',
    subtitle: 'Zecond Black +',
    features: [
      {
        heading: 'Máxima exposición en la plataforma',
        para: 'Tus productos se destacan en el inicio, rankings y búsquedas.',
      },
      {
        heading: 'Subasta en tiempo real',
        para: 'Activa el ícono de subasta y vende rápido con ofertas competitivos.',
      },
      {
        heading: 'Recojo mensual de prendas',
        para: 'Vamos 1 vez al mes a donde estés para recoger tus productos.',
      },
      {
        heading: 'Presencia VIP en el CLOSET SALE presencial',
        para: 'Espacio reservado + visibilidad junto a celebridades e influencers.',
      },
      {
        heading: 'Productos con 6 cuotas sin intereses',
        para: 'Tus clientes pueden pagar fácil gracias a nuestra alianza con banco (en proceso).',
      },
    ],
    price: 500,
    listingsLimit: UNILIMITED,
    auctionsAllowed: true,
    featuredProductsAllowed: true,
    premiumProductsAllowed: true,
    auctionCommissionPercentage: 18,
    stripePriceId: 'price_1RaxA1PpCk8Hzz56t4TZUgdB',
  },
];

export async function seedSubscriptionPlans(db: Database) {
  try {
    for (let v of subscriptionPlansSeed) {
      const [brand] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.planId, v.planId));
      if (!brand) {
        await db.insert(subscriptionPlans).values(v);
      }
    }
  } catch (e) {
    console.log(e);
    console.log('');
  }
}
