import type { FormEvent } from "react";

const excludedInputTypes = new Set([
  "color",
  "date",
  "datetime-local",
  "email",
  "file",
  "hidden",
  "month",
  "number",
  "password",
  "radio",
  "range",
  "tel",
  "time",
  "url",
  "week",
]);

const excludedInputNames = new Set(["email", "password", "confirmPassword", "currentPassword", "newPassword", "token"]);

export function capitalizeFirstLetter(value: string) {
  return value
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)([^\p{L}]*)(\p{L})/gu, (_match, spacing: string, prefix: string, letter: string) =>
      `${spacing}${prefix}${letter.toLocaleUpperCase("pt-BR")}`,
    );
}

export function capitalizeTextInput(event: FormEvent<HTMLElement>) {
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
  if (field.dataset.preserveCase === "true") return;

  if (field instanceof HTMLInputElement) {
    if (excludedInputTypes.has(field.type) || excludedInputNames.has(field.name)) return;
  }

  const capitalized = capitalizeFirstLetter(field.value);
  if (capitalized !== field.value) field.value = capitalized;
}
