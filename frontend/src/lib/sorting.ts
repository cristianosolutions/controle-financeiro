const portugueseCollator = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

export function sortByLabel<T>(items: readonly T[], label: (item: T) => string) {
  return [...items].sort((left, right) => portugueseCollator.compare(label(left), label(right)));
}
