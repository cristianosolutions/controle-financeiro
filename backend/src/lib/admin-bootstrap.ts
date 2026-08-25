import { z } from "zod";

export function parseAdminPromotionArgs(args: string[]) {
  const email = args.find((argument) => !argument.startsWith("--"));
  const confirmed = args.includes("--confirm");
  return {
    email: z.string().email("Informe um e-mail válido").transform((value) => value.toLowerCase()).parse(email),
    confirmed,
  };
}
