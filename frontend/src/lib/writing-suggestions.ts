const accentedWords = [
  "Água", "Alimentação", "Aplicação", "Aquisição", "Cartão", "Comissão",
  "Combustível", "Condomínio", "Contribuição", "Crédito", "Débito", "Depósito",
  "Descrição", "Diária", "Educação", "Emergência", "Empréstimo", "Farmácia",
  "Férias", "Gás", "Habitação", "Imóvel", "Manutenção", "Médico", "Mês",
  "Móvel", "Negócio", "Observação", "Poupança", "Prestação", "Saúde", "Salário",
  "Serviço", "Transferência", "Veículo",
];

function withoutAccents(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
}

export function accentSuggestions(word: string) {
  if (word.length < 3 || /\p{M}/u.test(word.normalize("NFD"))) return [];
  const normalized = withoutAccents(word);
  return accentedWords.filter((candidate) => withoutAccents(candidate) === normalized && candidate !== word);
}
