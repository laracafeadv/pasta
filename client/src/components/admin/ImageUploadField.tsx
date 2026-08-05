import { useRef, useState } from "react";

interface ImageUploadFieldProps {
  value?: string;
  onChange: (url: string) => void;
}

export default function ImageUploadField({ value, onChange }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Falha no upload");
      const { url } = await res.json();
      onChange(url);
    } catch {
      setError("Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      {value && (
        <img src={value} alt="Capa do artigo" className="mb-3 h-40 w-full rounded-sm object-cover" />
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded-sm border border-coffee px-4 py-2 text-sm font-medium text-coffee hover:bg-coffee hover:text-cream disabled:opacity-60"
      >
        {uploading ? "Enviando..." : value ? "Trocar imagem" : "Enviar imagem de capa"}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
