import { Product } from "@prisma/client";
import type { ProductId } from "@/lib/plans";

export function toPrismaProduct(product: ProductId): Product {
  return product === "global" ? Product.GLOBAL : Product.MARKETING;
}

export function toProductId(product: Product): ProductId {
  return product === Product.GLOBAL ? "global" : "marketing";
}
