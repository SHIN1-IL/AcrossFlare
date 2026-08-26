import { Product } from "@prisma/client";
import type { ProductId } from "@/lib/plans";

export function toPrismaProduct(product: ProductId): Product {
  switch (product) {
    case "global":
      return Product.GLOBAL;
    case "marketing":
      return Product.MARKETING;
    case "workspace":
      return Product.WORKSPACE;
  }
}

export function toProductId(product: Product): ProductId {
  switch (product) {
    case Product.GLOBAL:
      return "global";
    case Product.MARKETING:
      return "marketing";
    case Product.WORKSPACE:
      return "workspace";
  }
}
