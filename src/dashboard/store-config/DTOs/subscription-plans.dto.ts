import { subscriptionPlans } from 'src/db/schemas';
import { createUpdateSchema } from 'drizzle-zod';
import { createZodDto } from 'nestjs-zod';
import { number } from 'zod';

const subscriptionPlansUpdateSchema = createUpdateSchema(subscriptionPlans, {
  id: number(),
}).pick({
  id: true,
  title: true,
  subtitle: true,
  price: true,
  features: true,
  listingsLimit: true,
  auctionsAllowed: true,
  featuredProductsAllowed: true,
  premiumProductsAllowed: true,
  stripePriceId: true,
});

export class UpdateSubscriptionPlanDTO extends createZodDto(
  subscriptionPlansUpdateSchema,
) {}
