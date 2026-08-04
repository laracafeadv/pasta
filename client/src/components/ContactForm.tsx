import { useState, type FormEvent } from "react";
import { trpc } from "../lib/trpc";
import { maskPhone } from "../lib/phoneMask";

interface FormState {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const INITIAL: FormState = { name: "", email: "", phone: "", message: "" };

function validate(values: FormState) {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (values.name.trim().length < 2) errors.name = "Informe seu nome completo.";
  if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "Informe um e-mail válido.";
  if (values.phone.replace(/\D/g, "").length < 10) errors.phone = "Informe um telefone válido.";
  if (values.message.trim().length < 10)
    errors.message = "A mensagem deve ter pelo menos 10 caracteres.";
  return errors;
}

export default function ContactForm() {
  const [values, setValues] = useState<FormState>(INITIAL);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [success, setSuccess] = useState(false);

  const submit = trpc.contacts.submit.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setValues(INITIAL);
      setTouched({});
    },
  });

  const errors = validate(values);

  function handleChange(field: keyof FormState, value: string) {
    setValues((v) => ({ ...v, [field]: field === "phone" ? maskPhone(value) : value }));
    setSuccess(false);
  }

  function handleBlur(field: keyof FormState) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, message: true });
    if (Object.keys(errors).length > 0) return;
    submit.mutate(values);
  }

  const inputClass = (field: keyof FormState) =>
    `w-full rounded-sm border bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-coffee/40 ${
      touched[field] && errors[field] ? "border-red-400" : "border-coffee-light/30"
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-coffee">
          Nome
        </label>
        <input
          id="name"
          value={values.name}
          onChange={(e) => handleChange("name", e.target.value)}
          onBlur={() => handleBlur("name")}
          className={inputClass("name")}
          placeholder="Seu nome completo"
        />
        {touched.name && errors.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-coffee">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          value={values.email}
          onChange={(e) => handleChange("email", e.target.value)}
          onBlur={() => handleBlur("email")}
          className={inputClass("email")}
          placeholder="seu@email.com"
        />
        {touched.email && errors.email && (
          <p className="mt-1 text-xs text-red-500">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-coffee">
          Telefone
        </label>
        <input
          id="phone"
          value={values.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          onBlur={() => handleBlur("phone")}
          className={inputClass("phone")}
          placeholder="(71) 99999-9999"
          inputMode="tel"
        />
        {touched.phone && errors.phone && (
          <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-coffee">
          Mensagem
        </label>
        <textarea
          id="message"
          rows={4}
          value={values.message}
          onChange={(e) => handleChange("message", e.target.value)}
          onBlur={() => handleBlur("message")}
          className={inputClass("message")}
          placeholder="Conte um pouco sobre sua situação..."
        />
        {touched.message && errors.message && (
          <p className="mt-1 text-xs text-red-500">{errors.message}</p>
        )}
      </div>

      {submit.isError && (
        <p className="text-sm text-red-500">
          Não foi possível enviar sua mensagem. Tente novamente.
        </p>
      )}

      {success && (
        <p className="rounded-sm bg-green-50 px-4 py-3 text-sm text-green-700">
          Mensagem enviada com sucesso! Entraremos em contato em breve.
        </p>
      )}

      <button
        type="submit"
        disabled={submit.isPending}
        className="w-full rounded-full bg-coffee px-8 py-3.5 text-sm font-semibold uppercase tracking-wide text-cream shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-coffee/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submit.isPending ? "Enviando..." : "Enviar Mensagem"}
      </button>
    </form>
  );
}
